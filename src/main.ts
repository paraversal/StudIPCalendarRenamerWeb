// @ts-ignore
import * as ICAL from 'ical.js';

import Handlebars from "handlebars";
import { v4 as uuidv4 } from 'uuid';

type DisplayEvent = {
  final_name: string;
  id: any;
}

type App = {
  ical: any;
  event_map: Map<string, DisplayEvent>;
}

var app: App = {ical: ICAL.parse(""), event_map: new Map}

document.addEventListener("DOMContentLoaded", _ => {
  let fileInput = document.querySelector<HTMLInputElement>('#calendar-input')!
  fileInput.addEventListener('change', async (event) => {
      const selectedFile = (event.target as HTMLInputElement).files[0];
      const file_contents = await selectedFile.text()
      handleLoadedCalendarFile(file_contents)
     
  });

  let renameModalConfirmButton = document.querySelector<HTMLButtonElement>("#btn-rename-modal-confirm")!
  renameModalConfirmButton.addEventListener("click", handleRenameModalConfirm)

  let saveButton = document.querySelector("#save-button")!
  saveButton.addEventListener("click", handleSaveCalendar)

  let renameModal = document.querySelector("#renameModal")!
  let renameModalInput = document.querySelector<HTMLInputElement>("#new-name-modal-input")!

  renameModal.addEventListener('shown.bs.modal', () => {
    renameModalInput.value = ""
    renameModalInput.focus()
})

})

let calendarTemplate = Handlebars.compile(`
  <ul class="list-group">
    {{#each items}}
      <li class="list-group-item lecture-entry-listitem prevent-select" id={{this.id}}>
          <input class="form-check-input me-1 disable-click prevent-select hidden" type="checkbox" value="{{this.final_name}}">
          <label class="prevent-select"}>{{this.final_name}}</label>
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

function handleLectureEntryClick(e: Event){
  handleCalendarEntryClick(e)
  let checkedIds = getCheckedIds()
  let button = document.querySelector("#merge-button")!
  let renameModalTitle = document.querySelector("#rename-modal-title")!

  if (checkedIds.length == 0) {
    if (!button.classList.contains("d-none")) {
      button.classList.add("d-none")
    }
  } else if  (checkedIds.length == 1) {
    button.classList.remove("d-none")
    button.innerHTML = "Rename event"
    renameModalTitle.innerHTML = "Rename event"
  } else {
    button.classList.remove("d-none")
    button.innerHTML = "Merge + rename events"
    renameModalTitle.innerHTML = "Merge + rename events"
  }
}
function populateCalendarEntries() {
  let lectureList = document.querySelector("#lecture-list")!
  lectureList.innerHTML = ""
  let displayEvents = getDisplayCalendarEvents()
  lectureList.insertAdjacentHTML("beforeend", calendarTemplate({items:displayEvents}))
  document.querySelectorAll(".lecture-entry-listitem").forEach(el => {
    el.addEventListener("click", (e) => handleLectureEntryClick(e))
  })
}

function handleRenameModalConfirm() {
  let newNameInput = document.querySelector<HTMLInputElement>("#new-name-modal-input")!
  console.log(newNameInput.value)
  if (newNameInput.value == "") {
    alert("Events cannot have an empty name.")
    return
  }
  
  let checkedIds = getCheckedIds()
  checkedIds.map(checkedId => {
    Array.from(app.event_map.entries()).filter(event => event[1].id == checkedId)
      .map(event => event[1].final_name = newNameInput.value)
  })
  populateCalendarEntries()
  console.log()
}

function handleLoadedCalendarFile(file_text: string) {
  document.querySelector("#calendar-input-container")!.outerHTML = ""
  
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
