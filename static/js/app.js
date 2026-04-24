/* ═══════════════════════════════════════════════════
   LUMINARY — Hotel Booking App
   app.js — All logic, API calls, animations
═══════════════════════════════════════════════════ */

'use strict';

/* ── CONFIG ── */
const API_BASE = ''; // relative base; set to 'http://localhost:8000' for dev

/* ── STATE ── */
const state = {
  user: null,
  token: null,
  rooms: [],
  filtered: [],
  currentRoomId: null,
};

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  initAuth();
  initSearch();
  initFilter();
  initModal();
});

/* ── Restore session from localStorage ── */
function restoreSession() {
  const token = localStorage.getItem('luminary_token');
  const username = localStorage.getItem('luminary_user');
  if (token && username) {
    state.token = token;
    state.user = username;
    showDashboard(username);
  } else {
    showAuthPage();
  }
}

/* ══════════════════════════════════════════
   PAGE TRANSITIONS
══════════════════════════════════════════ */
function showAuthPage() {
  const auth = document.getElementById('auth-page');
  const dash = document.getElementById('dashboard-page');
  const nav  = document.getElementById('navbar');

  nav.classList.add('hidden');
  dash.style.display = 'none';
  dash.classList.remove('active');

  auth.style.display = 'flex';
  requestAnimationFrame(() => {
    auth.classList.add('active');
  });
}

function showDashboard(username) {
  const auth = document.getElementById('auth-page');
  const dash = document.getElementById('dashboard-page');
  const nav  = document.getElementById('navbar');

  auth.classList.remove('active');
  auth.style.display = 'none';

  nav.classList.remove('hidden');
  setNavUser(username);

  dash.style.display = 'block';
  dash.classList.add('active', 'slide-in');
  setTimeout(() => dash.classList.remove('slide-in'), 600);

  fetchRooms();
}

function setNavUser(username) {
  document.getElementById('nav-username').textContent = username;
  document.getElementById('nav-avatar').textContent = username.charAt(0).toUpperCase();
}

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
function initAuth() {
  /* Tab switching */
  const tabs = document.querySelectorAll('.tab-btn');
  const slider = document.querySelector('.tab-slider');
  const loginForm  = document.getElementById('login-form');
  const regForm    = document.getElementById('register-form');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.tab === 'register') {
        slider.style.transform = 'translateX(calc(100% + 4px))';
        loginForm.classList.remove('active');
        regForm.classList.add('active');
      } else {
        slider.style.transform = 'translateX(0)';
        regForm.classList.remove('active');
        loginForm.classList.add('active');
      }
    });
  });

  /* Password toggles */
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.querySelector('.show-icon').classList.toggle('hidden', isPass);
      btn.querySelector('.hide-icon').classList.toggle('hidden', !isPass);
    });
  });

  /* Form submissions */
  loginForm.addEventListener('submit', handleLogin);
  regForm.addEventListener('submit', handleRegister);

  /* Logout */
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const btn = document.getElementById('login-btn');
  setButtonLoading(btn, true);

  try {
    const res = await apiFetch('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    const data = await handleResponse(res);

    if (!res.ok) {
      const msg = extractError(data);
      showToast(msg, 'error');
      return;
    }

    const token = data.token || data.access || data.key || data.auth_token;
    if (!token) {
      showToast('Login succeeded but no token received.', 'error');
      return;
    }

    localStorage.setItem('luminary_token', token);
    localStorage.setItem('luminary_user', username);
    state.token = token;
    state.user = username;

    showToast(`Welcome back, ${username}! ✦`, 'success');
    setTimeout(() => showDashboard(username), 600);

  } catch (err) {
    showToast(err.message || 'Network error. Is the server running?', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!username || !email || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const btn = document.getElementById('register-btn');
  setButtonLoading(btn, true);

  try {
    const res = await apiFetch('/api/register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    const data = await handleResponse(res);

    if (!res.ok) {
      const msg = extractError(data);
      showToast(msg, 'error');
      return;
    }

    showToast('Account created! Please sign in.', 'success');

    /* Auto-switch to login tab */
    setTimeout(() => {
      document.querySelector('.tab-btn[data-tab="login"]').click();
      document.getElementById('login-username').value = username;
    }, 800);

  } catch (err) {
    showToast(err.message || 'Network error. Is the server running?', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleLogout() {
  localStorage.removeItem('luminary_token');
  localStorage.removeItem('luminary_user');
  state.token = null;
  state.user = null;
  state.rooms = [];
  state.filtered = [];

  showToast('Signed out. See you soon!', 'info');
  setTimeout(() => showAuthPage(), 400);
}

/* ══════════════════════════════════════════
   ROOMS
══════════════════════════════════════════ */
async function fetchRooms() {
  showSkeletons();

  try {
    const res = await apiFetch('/api/rooms/', {
      method: 'GET',
    });

    const data = await handleResponse(res);

    if (!res.ok) {
      showToast('Failed to load rooms.', 'error');
      renderRooms([]);
      return;
    }

    /* Support both array and paginated { results: [] } */
    const rooms = Array.isArray(data) ? data : (data.results || []);
    state.rooms = rooms;
    state.filtered = [...rooms];
    updateRoomsMeta(rooms.length);
    renderRooms(rooms);

  } catch (err) {
    showToast('Could not connect to server. Showing demo data.', 'error');
    /* Graceful fallback — remove skeletons */
    renderRooms([]);
  }
}

function showSkeletons() {
  const grid = document.getElementById('rooms-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'room-skeleton glass';
    grid.appendChild(sk);
  }
}

function renderRooms(rooms) {
  const grid = document.getElementById('rooms-grid');
  grid.innerHTML = '';

  if (!rooms.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏨</div>
        <h3>No rooms found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }

  rooms.forEach((room, i) => {
    const card = buildRoomCard(room, i);
    grid.appendChild(card);
  });
}

function buildRoomCard(room, index) {
  const card = document.createElement('div');
  card.className = 'room-card';
  card.style.animationDelay = `${index * 0.07}s`;

  const type     = (room.room_type || room.type || 'Standard').toString();
  const typeKey  = type.toLowerCase().replace(/\s+/g, '');
  const price    = parseFloat(room.price || room.price_per_night || 0).toFixed(2);
  const roomNum  = room.room_number || room.number || room.id || '—';
  const roomName = `Room ${roomNum}`;

  const badgeClass = getBadgeClass(typeKey);
  const icon = getRoomIcon(typeKey);
  const priceInt = price.split('.')[0];
  const priceDec = price.split('.')[1];

  card.innerHTML = `
    <div class="card-glow"></div>
    <div class="card-header">
      <span class="card-room-num">№ ${roomNum}</span>
      <span class="card-badge ${badgeClass}">${type}</span>
    </div>
    <span class="card-type-icon">${icon}</span>
    <div class="card-name">${roomName}</div>
    <div class="card-type-label">${getTypeDescription(typeKey)}</div>
    <div class="card-divider"></div>
    <div class="card-footer">
      <div class="card-price-wrap">
        <span class="card-currency">$</span>
        <span class="card-price">${priceInt}</span>
        <span class="card-per-night">.${priceDec} / night</span>
      </div>
      <button class="btn-book-now" data-room-id="${room.id}" data-room-name="${roomName}" data-room-type="${type}" data-price="$${price}">
        Book Now
      </button>
    </div>`;

  card.querySelector('.btn-book-now').addEventListener('click', openBookingModal);
  return card;
}

function getBadgeClass(typeKey) {
  if (typeKey.includes('super') || typeKey.includes('premium')) return 'badge-superclassic';
  if (typeKey.includes('classic')) return 'badge-classic';
  if (typeKey.includes('standard')) return 'badge-standard';
  return 'badge-default';
}

function getRoomIcon(typeKey) {
  if (typeKey.includes('super') || typeKey.includes('premium')) return '🌟';
  if (typeKey.includes('classic')) return '🏛️';
  if (typeKey.includes('standard')) return '🛎️';
  return '🛏️';
}

function getTypeDescription(typeKey) {
  if (typeKey.includes('super')) return 'Our finest suite — unmatched luxury';
  if (typeKey.includes('classic')) return 'Timeless elegance & comfort';
  if (typeKey.includes('standard')) return 'All essentials, perfectly done';
  return 'Comfortable & well-appointed';
}

function updateRoomsMeta(count) {
  document.getElementById('rooms-count-label').textContent =
    `${count} room${count !== 1 ? 's' : ''} available`;
}

/* ── SEARCH ── */
function initSearch() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    applyFilters();
  });
}

/* ── FILTER ── */
let activeFilter = 'all';
function initFilter() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });
}

function applyFilters() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();

  let result = state.rooms.filter((room) => {
    const type  = (room.room_type || room.type || '').toLowerCase();
    const num   = String(room.room_number || room.number || room.id || '').toLowerCase();
    return !query || type.includes(query) || num.includes(query);
  });

  if (activeFilter === 'price-asc') {
    result = result.slice().sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
  } else if (activeFilter === 'price-desc') {
    result = result.slice().sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
  }

  state.filtered = result;
  updateRoomsMeta(result.length);
  renderRooms(result);
}

/* ══════════════════════════════════════════
   BOOKING MODAL
══════════════════════════════════════════ */
function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeBookingModal);
  document.getElementById('booking-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBookingModal();
  });
  document.getElementById('confirm-booking-btn').addEventListener('click', handleBooking);

  /* Set min dates */
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('booking-checkin').setAttribute('min', today);
  document.getElementById('booking-checkout').setAttribute('min', today);

  document.getElementById('booking-checkin').addEventListener('change', (e) => {
    document.getElementById('booking-checkout').setAttribute('min', e.target.value);
  });
}

function openBookingModal(e) {
  const btn = e.currentTarget;
  const roomId   = btn.dataset.roomId;
  const roomName = btn.dataset.roomName;
  const roomType = btn.dataset.roomType;
  const price    = btn.dataset.price;

  document.getElementById('modal-room-title').textContent = roomName;
  document.getElementById('modal-room-type').textContent  = roomType;
  document.getElementById('modal-room-price').textContent = price;

  const confirmBtn = document.getElementById('confirm-booking-btn');
  confirmBtn.dataset.roomId = roomId;
  resetBookBtn(confirmBtn);

  /* Clear dates */
  document.getElementById('booking-checkin').value  = '';
  document.getElementById('booking-checkout').value = '';

  const overlay = document.getElementById('booking-modal');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeBookingModal() {
  const overlay = document.getElementById('booking-modal');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function resetBookBtn(btn) {
  btn.querySelector('.btn-book-text').classList.remove('hidden');
  btn.querySelector('.btn-book-loader').classList.add('hidden');
  btn.querySelector('.btn-book-check').classList.add('hidden');
  btn.disabled = false;
  btn.style.background = '';
}

async function handleBooking() {
  const btn      = document.getElementById('confirm-booking-btn');
  const roomId   = btn.dataset.roomId;
  const checkin  = document.getElementById('booking-checkin').value;
  const checkout = document.getElementById('booking-checkout').value;

  if (!checkin || !checkout) {
    showToast('Please select check-in and check-out dates.', 'error');
    return;
  }
  if (checkin >= checkout) {
    showToast('Check-out must be after check-in.', 'error');
    return;
  }

  /* Loading state */
  btn.querySelector('.btn-book-text').classList.add('hidden');
  btn.querySelector('.btn-book-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await apiFetch('/api/booking/', {
      method: 'POST',
      body: JSON.stringify({
        room: roomId,
        check_in_date:  checkin,
        check_out_date: checkout,
      }),
    });

    const data = await handleResponse(res);

    if (!res.ok) {
      const msg = extractError(data);
      showToast(msg, 'error');
      resetBookBtn(btn);
      return;
    }

    /* Success state */
    btn.querySelector('.btn-book-loader').classList.add('hidden');
    btn.querySelector('.btn-book-check').classList.remove('hidden');
    btn.style.background = 'linear-gradient(135deg, #00e896, #00b87a)';

    showToast('🎉 Booking confirmed! Enjoy your stay.', 'success');

    setTimeout(() => {
      closeBookingModal();
      resetBookBtn(btn);
    }, 2200);

  } catch (err) {
    showToast(err.message || 'Booking failed. Please try again.', 'error');
    resetBookBtn(btn);
  }
}

/* ══════════════════════════════════════════
   API HELPERS
══════════════════════════════════════════ */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (state.token) {
    headers['Authorization'] = `Token ${state.token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
}

async function handleResponse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function extractError(data) {
  if (!data) return 'An unknown error occurred.';
  if (typeof data === 'string') return data;

  /* DRF error formats */
  if (data.detail) return data.detail;
  if (data.non_field_errors) return data.non_field_errors.join(' ');

  /* Field errors */
  const fieldErrors = Object.entries(data)
    .map(([field, errs]) => {
      const msgs = Array.isArray(errs) ? errs.join(' ') : errs;
      return `${field}: ${msgs}`;
    })
    .join('\n');

  return fieldErrors || 'Something went wrong.';
}

/* ══════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

  const icons = { success: '✓', error: '✕', info: '✦' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '•'}</span>
    <span class="toast-msg">${message}</span>`;

  container.appendChild(toast);

  /* Auto-remove */
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3800);

  /* Click to dismiss */
  toast.addEventListener('click', () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  });
}

/* ══════════════════════════════════════════
   BUTTON LOADING STATE
══════════════════════════════════════════ */
function setButtonLoading(btn, loading) {
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');

  if (loading) {
    text.classList.add('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;
  } else {
    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
  }
}