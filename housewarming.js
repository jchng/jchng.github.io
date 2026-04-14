const DEFAULT_STATE = {
  attendees: [],
  potluckItems: [],
};
const ALWAYS_LATE_NAMES = ['Sushen', 'Hieu', 'Sherrie'];
const API_BASE = resolveApiBase();
const INVITE_TOKEN = resolveInviteToken();

const privateAccessNotice = document.getElementById('privateAccessNotice');
const privateEventDetails = document.getElementById('privateEventDetails');
const eventDateLabel = document.getElementById('eventDateLabel');
const eventTimeLabel = document.getElementById('eventTimeLabel');
const eventLocation = document.getElementById('eventLocation');
const eventDetailsNote = document.getElementById('eventDetailsNote');
const rsvpAccessNotice = document.getElementById('rsvpAccessNotice');
const rsvpLayout = document.getElementById('rsvpLayout');
const chooser = document.getElementById('rsvpChooser');
const showAddRsvpButton = document.getElementById('showAddRsvpButton');
const showEditRsvpButton = document.getElementById('showEditRsvpButton');
const editLookupForm = document.getElementById('editLookupForm');
const editLookupEmail = document.getElementById('editLookupEmail');
const lookupStatus = document.getElementById('lookupStatus');
const cancelEditButton = document.getElementById('cancelEditButton');
const form = document.getElementById('rsvpForm');
const cancelFormButton = document.getElementById('cancelFormButton');
const attendeeCount = document.getElementById('attendeeCount');
const attendeeList = document.getElementById('attendeeList');
const potluckList = document.getElementById('potluckList');
const nameInput = document.getElementById('rsvpName');
const emailInput = document.getElementById('rsvpEmail');
const emailHint = document.getElementById('emailHint');
const arrivalTimeInput = document.getElementById('rsvpArrivalTime');
const arrivalTimeRow = document.getElementById('arrivalTimeRow');
const likelyLateRow = document.getElementById('likelyLateRow');
const likelyLateInput = document.getElementById('rsvpLikelyLate');
const potluckRow = document.getElementById('potluckRow');
const potluckInput = document.getElementById('rsvpPotluckItem');
const notesInput = document.getElementById('rsvpNotes');
const suggestionText = document.getElementById('potluckSuggestion');
const editModeNotice = document.getElementById('editModeNotice');
const submitButton = document.getElementById('submitButton');
const switchToEditButton = document.getElementById('switchToEditButton');
const attendanceStatusInputs = Array.from(form?.querySelectorAll('input[name="attendance_status"]') || []);

let state = cloneDefaultState();
let currentMode = 'chooser';
let editingAttendeeId = null;
let forcedLateMode = false;
let hasInviteAccess = false;

if (
  privateAccessNotice &&
  privateEventDetails &&
  eventDateLabel &&
  eventTimeLabel &&
  eventLocation &&
  eventDetailsNote &&
  rsvpAccessNotice &&
  rsvpLayout &&
  chooser &&
  showAddRsvpButton &&
  showEditRsvpButton &&
  editLookupForm &&
  editLookupEmail &&
  lookupStatus &&
  cancelEditButton &&
  form &&
  cancelFormButton &&
  attendeeCount &&
  attendeeList &&
  potluckList &&
  nameInput &&
  emailInput &&
  emailHint &&
  arrivalTimeInput &&
  likelyLateInput &&
  potluckInput &&
  notesInput &&
  suggestionText &&
  editModeNotice &&
  submitButton &&
  switchToEditButton
) {
  render();
  lockPrivateSections();
  initializePage();

  showAddRsvpButton.addEventListener('click', () => {
    openAddMode();
  });

  showEditRsvpButton.addEventListener('click', () => {
    openEditLookupMode();
  });

  cancelEditButton.addEventListener('click', () => {
    showChooser();
  });

  cancelFormButton.addEventListener('click', () => {
    showChooser();
  });

  switchToEditButton.addEventListener('click', () => {
    const email = emailInput.value;
    openEditLookupMode(email);
  });

  editLookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(editLookupEmail.value);
    if (!normalizedEmail) {
      return;
    }

    lookupStatus.textContent = 'Looking up your RSVP...';

    try {
      const lookupResult = await lookupRsvpByEmail(normalizedEmail);

      if (lookupResult.status === 'matched') {
        editingAttendeeId = lookupResult.attendee.id;
        openFormMode('editing');
        fillFormFromAttendee(lookupResult.attendee);
        editModeNotice.textContent = 'Edit mode: Updating your existing RSVP.';
        lookupStatus.textContent = '';
        return;
      }

      editingAttendeeId = null;
      openFormMode('add');
      resetFormFields();
      emailInput.value = normalizedEmail;
      emailHint.textContent = 'No matching RSVP found. Starting a new RSVP with this email.';
      editModeNotice.textContent = 'That email does not match an existing RSVP.';
      lookupStatus.textContent = '';
    } catch (error) {
      lookupStatus.textContent = error.message || 'Something broke. Can\'t load your RSVP! Contact Jarret.';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = normalizeEmail((formData.get('email') || '').toString());
    const arrivalTime = (formData.get('arrival_time') || '').toString().trim();
    const attendanceStatus = (formData.get('attendance_status') || 'going').toString();
    const likelyLate = formData.get('likely_late') === 'on';
    const potluckItem = (formData.get('potluck_item') || '').toString().trim();
    const notes = (formData.get('notes') || '').toString().trim();

    if (!name || (attendanceStatus !== 'cant_go' && !arrivalTime)) {
      return;
    }

    const payload = {
      name,
      email,
      arrival_time: attendanceStatus === 'cant_go' ? '' : arrivalTime,
      attendance_status: attendanceStatus,
      likely_late: attendanceStatus === 'cant_go' ? false : likelyLate,
      potluck_item: potluckItem,
      notes,
    };

    submitButton.disabled = true;
    editModeNotice.textContent = currentMode === 'editing' ? 'Saving changes...' : 'Submitting RSVP...';

    try {
      const response = currentMode === 'editing' && editingAttendeeId
        ? await updateRsvp(editingAttendeeId, payload)
        : await createRsvp(payload);

      state = normalizeSummary(response.summary);
      render();
      showChooser();
    } catch (error) {
      if (error.code === 'duplicate_email' && currentMode === 'add' && email) {
        editModeNotice.textContent = error.detail;
        submitButton.classList.add('hidden-panel');
        switchToEditButton.classList.remove('hidden-panel');
        return;
      }

      editModeNotice.textContent = error.message || 'Could not save your RSVP right now.';
    } finally {
      submitButton.disabled = false;
    }
  });

  potluckInput.addEventListener('input', (event) => {
    updateSuggestion(event.target.value);
  });

  nameInput.addEventListener('input', (event) => {
    syncLikelyLateRule(event.target.value);
  });

  attendanceStatusInputs.forEach((input) => {
    input.addEventListener('change', syncAttendanceFields);
  });
}

async function initializePage() {
  if (!INVITE_TOKEN) {
    lockPrivateSections('Private details are available from the invite link.');
    return;
  }

  try {
    const [eventDetailsPayload, summary] = await Promise.all([
      fetchEventDetails(),
      fetchSummary(),
    ]);

    hasInviteAccess = true;
    renderEventDetails(eventDetailsPayload.event);
    state = normalizeSummary(summary);
    render();
    unlockPrivateSections();
    showChooser();
  } catch (error) {
    if (error.code === 'invalid_invite') {
      lockPrivateSections(error.detail || 'This invite link is missing or invalid.');
      return;
    }

    lockPrivateSections('Private details are temporarily unavailable. Ask Jarret to check the server.');
  }
}

function resolveApiBase() {
  const configuredBase = document.body?.dataset?.rsvpApiBase?.trim();
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  if (window.location.protocol.startsWith('http') && window.location.port === '8000') {
    return `${window.location.origin}/api`;
  }

  return 'http://127.0.0.1:8000/api';
}

function resolveInviteToken() {
  const hashToken = window.location.hash.replace(/^#/, '').trim();
  if (hashToken) {
    return hashToken;
  }

  return new URLSearchParams(window.location.search).get('t')?.trim() || '';
}

async function fetchEventDetails() {
  return requestJson(`${API_BASE}/event-details/`);
}

async function fetchSummary() {
  return requestJson(`${API_BASE}/rsvps/summary/`);
}

async function lookupRsvpByEmail(email) {
  const params = new URLSearchParams({ email });

  try {
    return await requestJson(`${API_BASE}/rsvps/lookup/?${params.toString()}`);
  } catch (error) {
    if (error.status === 404) {
      return { status: 'not_found' };
    }

    throw error;
  }
}

async function createRsvp(payload) {
  return requestJson(`${API_BASE}/rsvps/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateRsvp(attendeeId, payload) {
  return requestJson(`${API_BASE}/rsvps/${attendeeId}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

async function requestJson(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (INVITE_TOKEN) {
    headers.Authorization = `Bearer ${INVITE_TOKEN}`;
  }

  const response = await fetch(url, {
    headers,
    ...options,
  });

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.detail || 'Uh oh. Jarret messed up. Let him know.');
    error.code = payload?.code;
    error.detail = payload?.detail;
    error.status = response.status;
    throw error;
  }

  return payload;
}

function normalizeSummary(summary) {
  return {
    attendees: Array.isArray(summary.attendees) ? summary.attendees.map((item) => ({ ...item })) : [],
    potluckItems: Array.isArray(summary.potluckItems) ? summary.potluckItems.map((item) => ({ ...item })) : [],
  };
}

function cloneDefaultState() {
  return {
    attendees: DEFAULT_STATE.attendees.map((item) => ({ ...item })),
    potluckItems: DEFAULT_STATE.potluckItems.map((item) => ({ ...item })),
  };
}

function render() {
  renderAttendees();
  renderPotluckItems();
}

function renderEventDetails(event) {
  eventDateLabel.textContent = event?.dateLabel || '';
  eventTimeLabel.textContent = event?.timeLabel || '';
  eventLocation.textContent = event?.location || '';
  eventDetailsNote.textContent = event?.details || '';
  eventDetailsNote.classList.toggle('hidden-panel', !eventDetailsNote.textContent);
}

function renderAttendees() {
  attendeeCount.textContent = buildAttendeeSummary(state.attendees);

  if (!state.attendees.length) {
    attendeeList.innerHTML = '<li class="empty-state">No RSVPs yet.</li>';
    return;
  }

  attendeeList.innerHTML = state.attendees
    .map((attendee) => {
      const maybeBadge = attendee.attendanceStatus === 'maybe' ? '<span class="maybe-pill">Maybe</span>' : '';
      const lateBadge = attendee.likelyLate ? '<span class="late-pill">Likely late</span>' : '';
      return `
        <li>
          <div class="status-heading">
            <span class="status-name">${escapeHtml(attendee.name)}</span>
            ${maybeBadge}
            ${lateBadge}
          </div>
          <div class="status-meta">Arriving around ${formatTime(attendee.arrivalTime)}</div>
        </li>
      `;
    })
    .join('');
}

function buildAttendeeSummary(attendees) {
  if (!attendees.length) {
    return '';
  }

  const goingCount = attendees.filter((attendee) => attendee.attendanceStatus !== 'maybe').length;
  const maybeCount = attendees.filter((attendee) => attendee.attendanceStatus === 'maybe').length;
  const lateCount = attendees.filter((attendee) => attendee.likelyLate).length;

  return [
    formatCount(goingCount, 'going'),
    formatCount(maybeCount, 'maybe'),
    formatCount(lateCount, 'likely late'),
  ].join(' • ');
}

function formatCount(count, label) {
  return `${count} ${label}`;
}

function renderPotluckItems() {
  if (!state.potluckItems.length) {
    potluckList.innerHTML = '<li class="empty-state">Nothing on the pot luck list yet.</li>';
    return;
  }

  potluckList.innerHTML = state.potluckItems
    .map((item) => `<li>${escapeHtml(item.label)}</li>`)
    .join('');
}

function showChooser() {
  if (!hasInviteAccess) {
    return;
  }

  currentMode = 'chooser';
  setPanelVisibility(chooser, true);
  setPanelVisibility(editLookupForm, false);
  setPanelVisibility(form, false);
  setPanelVisibility(cancelFormButton, false);
  resetLookup();
  resetFormState();
}

function lockPrivateSections(message) {
  hasInviteAccess = false;
  setPanelVisibility(privateEventDetails, false);
  setPanelVisibility(rsvpLayout, false);
  setPanelVisibility(chooser, false);
  setPanelVisibility(editLookupForm, false);
  setPanelVisibility(form, false);
  setPanelVisibility(cancelFormButton, false);
  attendeeCount.textContent = '';
  attendeeList.innerHTML = '<li class="empty-state">Private attendee updates are hidden until a valid invite link is used.</li>';
  potluckList.innerHTML = '<li class="empty-state">Private potluck updates are hidden until a valid invite link is used.</li>';
  privateAccessNotice.textContent = message;
  rsvpAccessNotice.textContent = message;
  privateAccessNotice.classList.remove('hidden-panel');
  rsvpAccessNotice.classList.remove('hidden-panel');
  eventDateLabel.textContent = '';
  eventTimeLabel.textContent = '';
  eventLocation.textContent = '';
  eventDetailsNote.textContent = '';
  eventDetailsNote.classList.add('hidden-panel');
}

function unlockPrivateSections() {
  privateAccessNotice.classList.add('hidden-panel');
  rsvpAccessNotice.classList.add('hidden-panel');
  setPanelVisibility(privateEventDetails, true);
  setPanelVisibility(rsvpLayout, true);
}

function openAddMode() {
  editingAttendeeId = null;
  resetFormState();
  openFormMode('add');
}

function openEditLookupMode(prefilledEmail = '') {
  currentMode = 'editLookup';
  setPanelVisibility(chooser, false);
  setPanelVisibility(form, false);
  setPanelVisibility(editLookupForm, true);
  setPanelVisibility(cancelFormButton, false);
  resetFormState();
  resetLookup();
  editLookupEmail.value = prefilledEmail;
  editLookupEmail.focus();
}

function openFormMode(mode) {
  currentMode = mode;
  setPanelVisibility(chooser, false);
  setPanelVisibility(editLookupForm, false);
  setPanelVisibility(form, true);
  setPanelVisibility(cancelFormButton, true);

  if (mode === 'editing') {
    submitButton.textContent = 'Update RSVP';
    emailHint.textContent = 'Using the same email so this RSVP can be updated.';
    return;
  }

  submitButton.textContent = 'Add RSVP';
  emailHint.textContent = 'Optional. Use the same email later if you want to edit your RSVP.';
}

function resetLookup() {
  editLookupForm.reset();
  lookupStatus.textContent = '';
}

function resetFormFields() {
  form.reset();
  suggestionText.innerHTML = '';
  syncAttendanceFields();
}

function resetFormState() {
  editingAttendeeId = null;
  forcedLateMode = false;
  resetFormFields();
  likelyLateInput.disabled = false;
  submitButton.disabled = false;
  editModeNotice.textContent = '';
  switchToEditButton.classList.add('hidden-panel');
  submitButton.classList.remove('hidden-panel');
  submitButton.textContent = 'Add RSVP';
  emailHint.textContent = 'Optional. Use the same email later if you want to edit your RSVP.';
  syncLikelyLateRule('');
}

function fillFormFromAttendee(attendee) {
  nameInput.value = attendee.name;
  emailInput.value = attendee.email;
  arrivalTimeInput.value = attendee.arrivalTime || '';
  const attendanceStatusInput = form.querySelector(`input[name="attendance_status"][value="${attendee.attendanceStatus || 'going'}"]`);
  if (attendanceStatusInput) {
    attendanceStatusInput.checked = true;
  }
  potluckInput.value = attendee.potluckItem || '';
  notesInput.value = attendee.notes || '';
  likelyLateInput.checked = attendee.likelyLate;
  syncLikelyLateRule(attendee.name);
  syncAttendanceFields();
  updateSuggestion(potluckInput.value);
}

function syncAttendanceFields() {
  const attendanceStatus = form.querySelector('input[name="attendance_status"]:checked')?.value || 'going';
  const isCantGo = attendanceStatus === 'cant_go';

  setRowVisibility(arrivalTimeRow, !isCantGo);
  setRowVisibility(likelyLateRow, !isCantGo);
  setRowVisibility(potluckRow, !isCantGo);
  arrivalTimeInput.required = !isCantGo;
  arrivalTimeInput.disabled = isCantGo;
  potluckInput.disabled = isCantGo;

  if (isCantGo) {
    arrivalTimeInput.value = '';
    likelyLateInput.checked = false;
    likelyLateInput.disabled = true;
    potluckInput.value = '';
    suggestionText.innerHTML = '';
    return;
  }

  syncLikelyLateRule(nameInput.value);
}

function setRowVisibility(element, isVisible) {
  setPanelVisibility(element, isVisible);
}

function setPanelVisibility(element, isVisible) {
  if (!element) {
    return;
  }

  element.classList.toggle('hidden-panel', !isVisible);
  element.hidden = !isVisible;
  element.style.display = isVisible ? '' : 'none';
}

function syncLikelyLateRule(rawName) {
  const shouldForceLate = isLikelyLateName(rawName);

  if (shouldForceLate) {
    forcedLateMode = true;
    likelyLateInput.checked = true;
    likelyLateInput.disabled = true;
    return;
  }

  if (forcedLateMode) {
    likelyLateInput.checked = false;
  }

  forcedLateMode = false;
  likelyLateInput.disabled = false;
}

function isLikelyLateName(rawName) {
  const normalizedName = normalizeText(rawName);
  if (!normalizedName) {
    return false;
  }

  const words = normalizedName.split(' ');
  return ALWAYS_LATE_NAMES.some((name) => words.includes(normalizeText(name)));
}

function updateSuggestion(rawValue) {
  const matches = findSimilarItems(rawValue, state.potluckItems);

  if (!rawValue.trim() || !matches.length) {
    suggestionText.innerHTML = '';
    return;
  }

  const labels = matches
    .map((item) => `<li>${escapeHtml(item.label)}</li>`)
    .join('');

  suggestionText.innerHTML = `
    <p class="suggestion-heading">May already be on the list!</p>
    <ul class="suggestion-list">${labels}</ul>
  `;
}

function findSimilarItems(query, potluckItems) {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length < 3) {
    return [];
  }

  return potluckItems
    .map((item) => ({
      label: item.label,
      score: similarityScore(normalizedQuery, normalizeText(item.label)),
    }))
    .filter((item) => item.score >= 0.6)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function similarityScore(left, right) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.9;
  }

  const leftWords = left.split(' ');
  const rightWords = right.split(' ');
  const overlapCount = leftWords.filter((word) => rightWords.includes(word)).length;
  const overlapScore = overlapCount / Math.max(leftWords.length, rightWords.length);
  const distanceScore = 1 - levenshteinDistance(left, right) / Math.max(left.length, right.length);

  return Math.max(overlapScore, distanceScore);
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function levenshteinDistance(left, right) {
  const matrix = Array.from({ length: left.length + 1 }, () => []);

  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function formatTime(timeValue) {
  if (!/^\d{2}:\d{2}$/.test(timeValue)) {
    return timeValue;
  }

  const [hoursText, minutesText] = timeValue.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const period = hours >= 12 ? 'pm' : 'am';
  const normalizedHours = hours % 12 || 12;
  const normalizedMinutes = minutes === 0 ? '' : `:${minutesText}`;

  return `${normalizedHours}${normalizedMinutes} ${period}`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
