// @ts-ignore
import ICAL from "https://unpkg.com/ical.js/dist/ical.min.js";
import Handlebars from "handlebars";
import { v4 as uuidv4 } from 'uuid';
import * as bootstrap from "bootstrap" 

type DisplayEvent = {
  final_name: string;
  id: any;
}

type App = {
  ical: any;
  event_map: Map<string, DisplayEvent>;
  previouslySelectedIdsAmount: number;
  modalOpen: boolean;
}

let texts = {shortText: "Rename", longText: "Merge + rename"}

var app: App = {ical: ICAL.parse(""), event_map: new Map, previouslySelectedIdsAmount: 0, modalOpen: false}


document.addEventListener("DOMContentLoaded", _ => {
  let fileInput = document.querySelector<HTMLInputElement>('#calendar-input')!
  fileInput.addEventListener('change', async (event) => {
      const selectedFile = (event.target as HTMLInputElement).files[0];
      const file_contents = await selectedFile.text()
      await handleLoadedCalendarFile(file_contents)
     
  });

  document.addEventListener("keydown", e => {
    if (e.key == "r" && !app.modalOpen) {
      let modal = document.querySelector("#renameModal")!
      bootstrap.Modal.getOrCreateInstance(modal).show()
      app.modalOpen = true
    }
  })

  let newNameForm = document.querySelector("#new-name-form")!
  newNameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleRenameModalConfirm()
  })

  let renameModalConfirmButton = document.querySelector<HTMLButtonElement>("#btn-rename-modal-confirm")!
  renameModalConfirmButton.addEventListener("click", async () =>  handleRenameModalConfirm())

  let saveButton = document.querySelector("#save-button")!
  saveButton.addEventListener("click", async () => handleSaveCalendar())

  let renameModal = document.querySelector("#renameModal")!
  let renameModalInput = document.querySelector<HTMLInputElement>("#new-name-modal-input")!

  renameModal.addEventListener('shown.bs.modal', () => {
    app.modalOpen = true
    renameModalInput.value = ""
    renameModalInput.focus()
})

})

Handlebars.registerHelper('addOne', function(value) {
  return value + 1;
});

let calendarTemplate = Handlebars.compile(`
  <ul class="list-group">
    {{#each items}}
      <li class="list-group-item lecture-entry-listitem prevent-select" 
          id="{{this.id}}" 
          style="--index: {{addOne @index}};">
          <input class="form-check-input me-1 disable-click prevent-select hidden" type="checkbox" value="{{this.final_name}}">
          <label class="prevent-select">{{this.final_name}}</label>
      </li>
    {{/each}}
  </ul>
`)


function onlyUnique(value: any, index: any, array: any[]) {
  return array.indexOf(value) === index;
}

function downloadIcalString(content: string) {
  const blob = new Blob([content], { type: ".ics" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "studip_renamed.ics";
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleSaveCalendar() {
  let calendar = new ICAL.Component(app.ical)
  calendar.getAllSubcomponents("vevent").map(el => {
    let eventName = el.getFirstProperty("summary")?.toICALString()!
    console.log(eventName)
    console.log(eventName.replace("SUMMARY:", ""))
    let newEventName = app.event_map.get(eventName.replace("SUMMARY:", ""))
    el.updatePropertyWithValue("summary", newEventName?.final_name)
  })
  let new_ical = ICAL.stringify([app.ical])
  downloadIcalString(new_ical)
}

function handleCalendarEntryClick(e: Event) {
  let element = (e.target as HTMLElement)
  let checkBox = document.getElementById(element.id)!.getElementsByTagName('input')[0]
  let checkedState = checkBox.checked
  if (!checkedState) {
    element.classList.add("active")
  } else {
    element.classList.remove("active")
  }
  checkBox.checked = !checkedState
}

function getCheckedIds(): string[] {
  let selected = document.querySelectorAll("li.active")
  let selectedIds: string[] = []
  selected.forEach(el => {
    let node = (el as HTMLElement)
    selectedIds.push(node.id)
  })
  return selectedIds
}

function getDisplayCalendarEvents(): DisplayEvent[] {
  let finalNames = Array.from(app.event_map.entries()).map(([_, displayEvent]) => {
    return displayEvent.final_name
  })
  let unique = finalNames.filter(onlyUnique)
  let displayEvents: DisplayEvent[] = []
  let eventMap = Array.from(app.event_map.values())

  for (let uniqueCalendarEvent of unique) {
      let firstMatch = eventMap.find((comparedCalendarEvent) => {
        return comparedCalendarEvent.final_name == uniqueCalendarEvent
      })
      displayEvents.push(firstMatch!)
  };
  return displayEvents
}

async function handleLectureEntryClick(e: Event){
  handleCalendarEntryClick(e)
  let checkedIds = getCheckedIds()
  let button = document.querySelector<HTMLButtonElement>("#merge-button")!
  let renameModalTitle = document.querySelector("#rename-modal-title")!

  let buttonShouldAppearAfterFirstSelect = checkedIds.length == 1 && app.previouslySelectedIdsAmount == 0
  let buttonShouldRenameAfterSelectDownToOne = checkedIds.length == 1 && app.previouslySelectedIdsAmount > 1
  let buttonShouldRenameAfterMultipleSelect = checkedIds.length > 1 && app.previouslySelectedIdsAmount == 1
  let buttonShouldDisappear = checkedIds.length == 0

  if (checkedIds.length == 0 && app.previouslySelectedIdsAmount == 0) {
    // this should never happen
  }

  if (buttonShouldDisappear) {
    button.classList.add("fade-out")
    let animationDone = waitForAnimationEnd(button)
    button.style.animationPlayState = "running"
    await Promise.all(await animationDone)
    button.style.animationPlayState = "paused"
    button.classList.remove("fade-out")
    button.classList.add("d-none")

  } else if (buttonShouldAppearAfterFirstSelect) {  
    button.classList.remove("d-none")
    button.classList.add("fade-in")
    let animationDone = waitForAnimationEnd(button)
    button.style.animationPlayState = "running"
    await Promise.all(await animationDone)
    button.style.animationPlayState = "paused"
    button.classList.remove("fade-in")
    
    button.innerHTML = texts.shortText
    button.style.width = `${button.style.width}px`
  } else if (buttonShouldRenameAfterSelectDownToOne) {
    button.innerHTML = texts.shortText
    renameModalTitle.innerHTML = texts.shortText
  } else if (buttonShouldRenameAfterMultipleSelect) {
    button.innerHTML = texts.longText
    renameModalTitle.innerHTML = texts.longText
  }
  app.previouslySelectedIdsAmount = checkedIds.length;
}
async function populateCalendarEntries() {
  let lectureList = document.querySelector("#lecture-list")!
  lectureList.innerHTML = ""
  let displayEvents = getDisplayCalendarEvents()
  lectureList.insertAdjacentHTML("beforeend", calendarTemplate({items:displayEvents}))
  document.querySelectorAll(".lecture-entry-listitem").forEach(el => {
    el.addEventListener("click", async (e) => await handleLectureEntryClick(e))
  })
}

async function handleRenameModalConfirm() {
  let newNameInput = document.querySelector<HTMLInputElement>("#new-name-modal-input")!
  
  if (newNameInput.value == "") {
    alert("Events cannot have an empty name.")
    return
  }
  
  let modal = document.querySelector("#renameModal")!
  bootstrap.Modal.getInstance(modal).toggle()
  document.querySelector('.modal-backdrop').remove();
  app.modalOpen = false

  let checkedIds = getCheckedIds()
  checkedIds.map(checkedId => {
    Array.from(app.event_map.entries()).filter(event => event[1].id == checkedId)
      .map(event => event[1].final_name = newNameInput.value)
  })
  await populateCalendarEntries()
  
}

async function waitForAnimationEnd(...args: HTMLElement[]): Promise<Promise<any>[]> {
  return args.map(el => {
    return new Promise(resolve => {
      el.addEventListener('animationend', resolve, { once: true });
    });
  })
}

async function handleLoadedCalendarFile(file_text: string) {
  let calendarInputContainer = document.querySelector<HTMLInputElement>("#calendar-input-container")!
  let instructionsLoadCalendar = document.querySelector<HTMLDivElement>("#instructions-load-calendar")!
  let firstBlockAnimationEnd = waitForAnimationEnd(calendarInputContainer, instructionsLoadCalendar)
  instructionsLoadCalendar.style.animationPlayState = "running"
  calendarInputContainer.style.animationPlayState = "running"
  await Promise.all(await firstBlockAnimationEnd)
  instructionsLoadCalendar.remove()
  calendarInputContainer.remove()
  
  let instructionsEditCalendar = document.querySelector<HTMLInputElement>("#instructions-edit-calendar")!
  let secondBlockAnimationInEnd = waitForAnimationEnd(instructionsEditCalendar)
  instructionsEditCalendar.classList.remove("d-none")
  instructionsEditCalendar.style.animationPlayState = "running"
  await secondBlockAnimationInEnd

  await new Promise(resolve => setTimeout(resolve, 500));

  let calendar = ICAL.parse(file_text)
  app.ical = calendar
  let component = new ICAL.Component(calendar)
  

  component.getAllSubcomponents()
    .map(el => new ICAL.Event(el))
    .map(el => el.summary)
    .filter(onlyUnique)
    .filter(el => !!el)
    .map(el => app.event_map.set(el, {final_name: el, id: uuidv4()}))
  
  // insert calendar entries
  populateCalendarEntries()
}
