import btnStyles from '../../assets/styles/dashboard/components/buttons.module.css';
import authGateStyles from '../../assets/styles/dashboard/components/auth-gate.module.css';
import modalStyles from '../../assets/styles/dashboard/components/modal.module.css';
import {apiFetch} from '../utils.js';
import * as snackbar from '../Snackbar.js';
import * as cookieBanner from '../CookieBanner.js';
import {authGateTemplate, initAuthGate} from '../authGate.js';
import {loadSession, getSessionUser, clearSession} from '../session.js';
import {setUserData, setRecipientData, isDirty, dashboardEvents, DashboardEvents, resetState} from './state.js';
import * as recipientCard from './components/RecipientCard.js';
import * as wishlistSection from './components/WishlistSection.js';
import * as contactSection from './components/ContactSection.js';
import * as reuseSection from './components/ReuseSection.js';

const SECTIONS = ['recipient', 'wishlist', 'contact', 'reuse'];
const LABELS = {recipient: 'Your Recipient', wishlist: 'Your Wishlist', contact: 'Contact Info', reuse: 'Reuse Exchange'};

function dashboardLayout(userName) {
  return `
    <div class="hamburger-bar">
      <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle menu">&#9776;</button>
      <span class="dashboard-welcome"><strong>${userName}'s</strong> Dashboard</span>
      <a class="hamburger-logout" id="hamburger-logout" href="#">Log out</a>
    </div>
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <div class="dashboard-layout">
      <nav class="dashboard-sidebar" id="dashboard-sidebar">
        <a class="sidebar-title" href="/"><img src="/favicon-32x32.png" alt="" width="24" height="24"> Gift Exchange Generator</a>
        <div class="sidebar-welcome"><strong>${userName}'s</strong> Dashboard</div>
        <div class="sidebar-nav">
          ${SECTIONS.map(s =>
            `<a class="nav-item${s === defaultSection() ? ' active' : ''}" data-section="${s}">${LABELS[s]}</a>`
          ).join('')}
          <a class="sidebar-back" href="/">Back to Exchange Generator</a>
        </div>
        <a class="sidebar-logout" id="sidebar-logout" href="#">Log out</a>
      </nav>
      <main class="dashboard-main">
        ${SECTIONS.map(s =>
          `<div class="dashboard-section" id="section-${s}"${s !== defaultSection() ? ' hidden' : ''}></div>`
        ).join('')}
      </main>
    </div>`;
}

function defaultSection() {
  const segment = window.location.pathname.split('/').filter(Boolean).pop();
  return SECTIONS.includes(segment) && segment !== 'dashboard' ? segment : 'recipient';
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.section));
  });

  const hamburger = document.getElementById('hamburger-btn');
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebar = document.getElementById('dashboard-sidebar');

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  });

  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  });

  window.addEventListener('popstate', () => {
    const section = defaultSection();
    showSection(section);
  });
}

function showSection(sectionId) {
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`).hidden = s !== sectionId;
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
}

function navigate(sectionId) {
  if (isDirty()) {
    showUnsavedModal(() => doNavigate(sectionId));
    return;
  }
  doNavigate(sectionId);
}

function doNavigate(sectionId) {
  showSection(sectionId);

  try {
    history.pushState(null, '', `/dashboard/${sectionId}`);
  } catch {
    // history.pushState may not be available in all environments
  }

  // Close mobile sidebar
  document.getElementById('dashboard-sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
}

function showUnsavedModal(onLeave) {
  const existing = document.getElementById('unsaved-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'unsaved-modal';
  modal.className = modalStyles.backdrop;
  modal.innerHTML = `
    <div class="${modalStyles.dialog}">
      <h3>Unsaved Changes</h3>
      <p>You have unsaved wishlist changes. Do you want to leave without saving?</p>
      <div class="${modalStyles.actions}">
        <button class="${btnStyles.button}" id="modal-cancel">Stay</button>
        <button class="${btnStyles.button} ${btnStyles.modalLeave}" id="modal-leave">Leave</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('modal-leave').addEventListener('click', () => {
    modal.remove();
    onLeave();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function initBeforeUnloadGuard() {
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
  });
}

function initLogout() {
  const handler = async (e) => {
    e.preventDefault();
    await fetch("/.netlify/functions/api-auth-logout-post", {method: "POST"});
    clearSession();
    window.location.reload();
  };
  document.getElementById('sidebar-logout').addEventListener('click', handler);
  document.getElementById('hamburger-logout').addEventListener('click', handler);
}

function initDashboard() {
  initNavigation();
  initBeforeUnloadGuard();
  initLogout();
  recipientCard.init();
  wishlistSection.init();
  contactSection.init();
  reuseSection.init();
}

function showAuthGate() {
  const content = document.getElementById('dashboard-content');
  content.innerHTML = authGateTemplate({heading: 'Verify Your Email', buttonClass: btnStyles.button, gateClass: `${authGateStyles.authGate} card-slide-slow`});
  initAuthGate({
    onSuccess: () => {
      content.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
      loadData();
    },
    onError: (msg) => snackbar.showError(msg),
  });
}

async function loadData() {
  const content = document.getElementById('dashboard-content');
  try {
    const data = await loadSession();
    if (!data) {
      showAuthGate();
      return;
    }
    content.innerHTML = dashboardLayout(data.name);
    initDashboard();
    setUserData(data);
    loadRecipient();
  } catch {
    snackbar.showError('Something went wrong. Please try again.');
  }
}

function loadRecipient() {
  apiFetch('/.netlify/functions/api-recipient-get', {
    method: 'GET',
    onSuccess: (data) => setRecipientData(data),
    onError: () => {
      dashboardEvents.emit(DashboardEvents.RECIPIENT_LOADED, {recipientName: null});
    },
  });
}

export function main() {
  document.body.style.opacity = '1';
  snackbar.init();
  cookieBanner.init();
  loadData();
}
