const STORAGE_KEY = 'housewarming-rsvp-state-v3';

const DEFAULT_STATE = {
  attendees: [
    { id: 'seed-annie', name: 'Annie', email: '', arrivalTime: '11:30', likelyLate: false, potluckItem: '' },
    { id: 'seed-sam', name: 'Sam', email: '', arrivalTime: '13:00', likelyLate: true, potluckItem: '' },
  ],
  potluckItems: [
    { id: 'seed-chips', label: 'chips' },
    { id: 'seed-fruit-salad', label: 'fruit salad' },
    { id: 'seed-sparkling-water', label: 'sparkling water' },
  ],
};

const ALWAYS_LATE_NAMES = ['Sushen', 'Hieu', 'Sherrie'];

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
const likelyLateInput = document.getElementById('rsvpLikelyLate');
const potluckInput = document.getElementById('rsvpPotluckItem');
const suggestionText = document.getElementById('potluckSuggestion');
const editModeNotice = document.getElementById('editModeNotice');
const submitButton = document.getElementById('submitButton');
const switchToEditButton = document.getElementById('switchToEditButton');

let state = cloneDefaultState();
let currentMode = 'chooser';
let editingAttendeeId = null;
let forcedLateMode = false;

if (
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
  suggestionText &&
  editModeNotice &&
  submitButton &&
  switchToEditButton
) {
  state = loadState();

  render();
  showChooser();

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
    const lookupResult = await lookupRsvpByEmail(normalizedEmail);

    if (lookupResult.status === 'matched') {
      editingAttendeeId = lookupResult.attendee.id;
      openFormMode('editing');
      fillFormFromAttendee(lookupResult.attendee);
      editModeNotice.textContent = 'Edit mode: updating your existing RSVP.';
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
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = normalizeEmail((formData.get('email') || '').toString());
    const arrivalTime = (formData.get('arrival_time') || '').toString().trim();
    const likelyLate = formData.get('likely_late') === 'on';
    const potluckItem = (formData.get('potluck_item') || '').toString().trim();

    if (!name || !arrivalTime) {
      return;
    }

    if (currentMode === 'add' && email && findAttendeeByEmail(email)) {
      editModeNotice.textContent = 'That email already exists. Do you want to edit that RSVP instead?';
      submitButton.classList.add('hidden-panel');
      switchToEditButton.classList.remove('hidden-panel');
      return;
    }

    const existingAttendee = editingAttendeeId ? state.attendees.find((item) => item.id === editingAttendeeId) : null;
    const attendeeId = existingAttendee ? existingAttendee.id : createId('attendee');

    const attendeeRecord = {
      id: attendeeId,
      name,
      email,
      arrivalTime,
      likelyLate,
      potluckItem,
    };

    if (existingAttendee) {
      state.attendees = state.attendees.map((item) => (item.id === attendeeId ? attendeeRecord : item));
    } else {
      state.attendees.push(attendeeRecord);
    }

    syncPotluckForAttendee(attendeeRecord);

    saveState(state);
    render();
    showChooser();
  });

  nameInput.addEventListener('input', (event) => {
    syncLikelyLateRule(event.target.value);
  });

  potluckInput.addEventListener('input', (event) => {
    updateSuggestion(event.target.value);
  });
}

function loadState() {
  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return cloneDefaultState();
    }

    const parsedState = JSON.parse(rawState);
    if (!Array.isArray(parsedState.attendees) || !Array.isArray(parsedState.potluckItems)) {
      return cloneDefaultState();
    }

    return {
      attendees: parsedState.attendees.map((item) => ({
        id: item.id ? item.id.toString() : createId('attendee'),
        name: (item.name || '').toString(),
        email: normalizeEmail((item.email || '').toString()),
        arrivalTime: (item.arrivalTime || '').toString(),
        likelyLate: Boolean(item.likelyLate),
        potluckItem: (item.potluckItem || '').toString(),
      })),
      potluckItems: parsedState.potluckItems.map((item) => ({
        id: item.id ? item.id.toString() : createId('potluck'),
        label: (item.label || '').toString(),
        attendeeId: item.attendeeId ? item.attendeeId.toString() : '',
      })),
    };
  } catch (error) {
    return cloneDefaultState();
  }
}

function saveState(nextState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
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

function renderAttendees() {
  attendeeCount.textContent = state.attendees.length > 1 ? `${state.attendees.length} people so far.` : '';

  if (!state.attendees.length) {
    attendeeList.innerHTML = '<li class="empty-state">No RSVPs yet.</li>';
    return;
  }

  attendeeList.innerHTML = state.attendees
    .map((attendee) => {
      const lateBadge = attendee.likelyLate ? '<span class="late-pill">Likely late</span>' : '';
      return `
        <li>
          <div class="status-heading">
            <span class="status-name">${escapeHtml(attendee.name)}</span>
            ${lateBadge}
          </div>
          <div class="status-meta">Arriving around ${formatTime(attendee.arrivalTime)}</div>
        </li>
      `;
    })
    .join('');
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
  currentMode = 'chooser';
  chooser.classList.remove('hidden-panel');
  editLookupForm.classList.add('hidden-panel');
  form.classList.add('hidden-panel');
  cancelFormButton.classList.add('hidden-panel');
  resetLookup();
  resetFormState();
}

function openAddMode() {
  editingAttendeeId = null;
  resetFormState();
  openFormMode('add');
}

function openEditLookupMode(prefilledEmail = '') {
  currentMode = 'editLookup';
  chooser.classList.add('hidden-panel');
  form.classList.add('hidden-panel');
  editLookupForm.classList.remove('hidden-panel');
  cancelFormButton.classList.add('hidden-panel');
  resetFormState();
  resetLookup();
  editLookupEmail.value = prefilledEmail;
  editLookupEmail.focus();
}

function openFormMode(mode) {
  currentMode = mode;
  chooser.classList.add('hidden-panel');
  editLookupForm.classList.add('hidden-panel');
  form.classList.remove('hidden-panel');
  cancelFormButton.classList.remove('hidden-panel');

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
}

function resetFormState() {
  editingAttendeeId = null;
  forcedLateMode = false;
  resetFormFields();
  likelyLateInput.disabled = false;
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
  arrivalTimeInput.value = attendee.arrivalTime;
  potluckInput.value = attendee.potluckItem || '';
  likelyLateInput.checked = attendee.likelyLate;
  syncLikelyLateRule(attendee.name);
  updateSuggestion(potluckInput.value);
}

async function lookupRsvpByEmail(email) {
  const existingAttendee = findAttendeeByEmail(email);
  if (!existingAttendee) {
    return { status: 'not_found' };
  }

  return {
    status: 'matched',
    attendee: { ...existingAttendee },
  };
}

function findAttendeeByEmail(email) {
  return state.attendees.find((item) => item.email && item.email === email);
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

function syncPotluckForAttendee(attendeeRecord) {
  state.potluckItems = state.potluckItems.filter((item) => item.attendeeId !== attendeeRecord.id);

  if (attendeeRecord.potluckItem) {
    state.potluckItems.push({
      id: createId('potluck'),
      label: attendeeRecord.potluckItem,
      attendeeId: attendeeRecord.id,
    });
  }
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

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
