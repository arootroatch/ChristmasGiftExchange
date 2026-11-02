import {escape, escapeAttr, selectElement} from "../utils.js";
import styles from '../../assets/styles/draw/name-combobox.module.css';

const inputId = "name-combobox-input";
const listId = "name-combobox-list";

function optionId(index) {
  return `name-combobox-option-${index}`;
}

function optionHtml({name, hasDrawn}, index, activeIndex) {
  const isActive = index === activeIndex;
  const classes = [styles.option, isActive && styles.active, hasDrawn && styles.drawn].filter(Boolean).join(" ");
  return `<li id="${optionId(index)}" class="${classes}" role="option" data-name="${escapeAttr(name)}" aria-selected="${isActive}"${hasDrawn ? ' aria-disabled="true"' : ""}>
    <span>${escape(name)}</span>${hasDrawn ? `<span class="${styles.drawnTag}">Already viewed</span>` : ""}
  </li>`;
}

export function comboboxTemplate() {
  return `<div class="${styles.combobox}">
    <label for="${inputId}">Your name</label>
    <input id="${inputId}" class="${styles.input}" type="text" role="combobox" autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="${listId}" placeholder="Type or choose your name">
    <ul id="${listId}" class="${styles.list}" role="listbox" aria-label="Names" hidden></ul>
  </div>`;
}

export function initCombobox({names, onSelect}) {
  const input = selectElement(`#${inputId}`);
  const list = selectElement(`#${listId}`);
  let visible = names;
  let activeIndex = -1;

  function renderList() {
    list.innerHTML = visible.length
      ? visible.map((entry, index) => optionHtml(entry, index, activeIndex)).join("")
      : `<li class="${styles.empty}" role="presentation">No matching names</li>`;

    if (activeIndex === -1) {
      input.removeAttribute("aria-activedescendant");
    } else {
      input.setAttribute("aria-activedescendant", optionId(activeIndex));
      selectElement(`#${optionId(activeIndex)}`).scrollIntoView?.({block: "nearest"});
    }
  }

  function open() {
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    renderList();
  }

  function close() {
    activeIndex = -1;
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function applyFilter() {
    const query = input.value.trim().toLowerCase();
    visible = names.filter(({name}) => name.toLowerCase().includes(query));
    activeIndex = query ? visible.findIndex(({hasDrawn}) => !hasDrawn) : -1;
    open();
  }

  function moveActive(step) {
    const enabled = visible.flatMap(({hasDrawn}, index) => hasDrawn ? [] : [index]);
    if (!enabled.length) return;
    const position = enabled.indexOf(activeIndex);
    const start = position === -1 && step < 0 ? 0 : position;
    activeIndex = enabled[(start + step + enabled.length) % enabled.length];
    renderList();
  }

  function handleKeydown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (list.hidden) open();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex !== -1) onSelect(visible[activeIndex].name);
    } else if (event.key === "Escape") {
      close();
    }
  }

  input.addEventListener("focus", open);
  input.addEventListener("click", () => { if (list.hidden) open(); });
  input.addEventListener("input", applyFilter);
  input.addEventListener("keydown", handleKeydown);
  input.addEventListener("blur", close);

  // Keep focus on the input while pressing an option, so blur doesn't close the list before the click lands.
  list.addEventListener("mousedown", (event) => event.preventDefault());
  list.addEventListener("click", (event) => {
    const option = event.target.closest('[role="option"]');
    if (option && option.getAttribute("aria-disabled") !== "true") onSelect(option.dataset.name);
  });
}
