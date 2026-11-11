import {selectElement, selectElements} from './utils.js';

export function sectionFromPath(sections, fallback) {
  const segment = window.location.pathname.split('/').filter(Boolean).pop();
  return sections.includes(segment) ? segment : fallback;
}

export function sidebarNavItemsTemplate(sections, labels, activeSection) {
  return sections.map(s =>
    `<a class="nav-item${s === activeSection ? ' active' : ''}" data-section="${s}">${labels[s]}</a>`
  ).join('');
}

export function sectionContainersTemplate(sections, activeSection) {
  return sections.map(s =>
    `<div class="dashboard-section" id="section-${s}"${s !== activeSection ? ' hidden' : ''}></div>`
  ).join('');
}

export function showSection(sections, sectionId) {
  sections.forEach(s => {
    selectElement(`#section-${s}`).hidden = s !== sectionId;
  });
  selectElements('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
}

function closeSidebar() {
  selectElement('#dashboard-sidebar').classList.remove('open');
  selectElement('#sidebar-backdrop').classList.remove('open');
}

/**
 * Wires nav clicks, hamburger/backdrop toggling, pushState and popstate.
 * guard(proceed) optionally intercepts click navigation (e.g. unsaved-changes modal).
 * onShow(sectionId) runs whenever a section becomes visible.
 */
export function initSidebarNav({sections, basePath, fallback, guard, onShow = () => {}}) {
  const show = (sectionId) => {
    showSection(sections, sectionId);
    onShow(sectionId);
  };

  const go = (sectionId) => {
    show(sectionId);
    try {
      window.history.pushState(null, '', `${basePath}/${sectionId}`);
    } catch {
      // history.pushState may not be available in all environments
    }
    closeSidebar();
  };

  selectElements('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;
      if (guard) guard(() => go(sectionId));
      else go(sectionId);
    });
  });

  const sidebar = selectElement('#dashboard-sidebar');
  const backdrop = selectElement('#sidebar-backdrop');
  selectElement('#hamburger-btn').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  });
  backdrop.addEventListener('click', closeSidebar);

  window.addEventListener('popstate', () => show(sectionFromPath(sections, fallback)));

  onShow(sectionFromPath(sections, fallback));
}
