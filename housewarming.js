const STORAGE_KEY = 'housewarming-rsvp-state-v1';

const DEFAULT_STATE = {
  attendees: [
    { name: 'Annie', arrivalTime: '11:30', likelyLate: false },
    { name: 'Sam', arrivalTime: '13:00', likelyLate: true },
  ],
  potluckItems: [
    { label: 'chips' },
    { label: 'fruit salad' },
    { label: 'sparkling water' },
  ],
};
const ALWAYS_LATE_NAMES = ['Sushen', 'Hieu', 'Sherrie'];

const form = document.getElementById('rsvpForm');
const attendeeList = document.getElementById('attendeeList');
const potluckList = document.getElementById('potluckList');
const nameInput = document.getElementById('rsvpName');
const likelyLateInput = document.getElementById('rsvpLikelyLate');
const potluckInput = document.getElementById('rsvpPotluckItem');
const suggestionText = document.getElementById('potluckSuggestion');
let state = cloneDefaultState();

if (form && attendeeList && potluckList && nameInput && likelyLateInput && potluckInput && suggestionText) {
  state = loadState();

  render();
  updateSuggestion('');
  syncLikelyLateRule('');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const arrivalTime = (formData.get('arrival_time') || '').toString().trim();
    const likelyLate = formData.get('likely_late') === 'on';
    const potluckItem = (formData.get('potluck_item') || '').toString().trim();

    if (!name || !arrivalTime) {
      return;
    }

    state.attendees.push({
      name,
      arrivalTime,
      likelyLate,
    });

    if (potluckItem) {
      state.potluckItems.push({ label: potluckItem });
    }

    saveState(state);
    render();
    form.reset();
    syncLikelyLateRule('');
    updateSuggestion('');
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
        name: (item.name || '').toString(),
        arrivalTime: (item.arrivalTime || '').toString(),
        likelyLate: Boolean(item.likelyLate),
      })),
      potluckItems: parsedState.potluckItems.map((item) => ({
        label: (item.label || '').toString(),
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

function syncLikelyLateRule(rawName) {
  const shouldForceLate = isLikelyLateName(rawName);
  likelyLateInput.checked = shouldForceLate;
  likelyLateInput.disabled = shouldForceLate;
}

function isLikelyLateName(rawName) {
  const normalizedName = normalizeText(rawName);
  if (!normalizedName) {
    return false;
  }

  const words = normalizedName.split(' ');
  return ALWAYS_LATE_NAMES.some((name) => words.includes(normalizeText(name)));
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
