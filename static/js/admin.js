/* ═══════════════════════════════════════════════════
   LUMINARY ADMIN CONSOLE — admin.js
   All logic: auth, CRUD, charts, animations
═══════════════════════════════════════════════════ */

'use strict';

/* ─── CONFIG ─── */
const API = ''; // Set to 'http://localhost:8000' for dev

/* ─── STATE ─── */
const S = {
  token: null,
  user: null,
  rooms: [],
  filtered: [],
  activeSection: 'dashboard',
  deleteTargetId: null,
  deleteTargetName: null,
};

/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  startClock();
  restoreSession();
  bindLogin();
  bindNav();
  bindRoomControls();
  bindAddRoomForm();
  bindDeleteModal();
  bindMobileMenu();
});

/* ══════════════════════════════════════════
   ANIMATED CANVAS BACKGROUND
══════════════════════════════════════════ */
function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes(n = 55) {
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.4,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,158,11,0.35)';
      ctx.fill();
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const alpha = (1 - dist / 160) * 0.08;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(245,158,11,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); createNodes(); });
  resize();
  createNodes();
  draw();
}

/* ══════════════════════════════════════════
   CLOCK
══════════════════════════════════════════ */
function startClock() {
  function tick() {
    const el = document.getElementById('topbar-time');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }
  tick();
  setInterval(tick, 1000);
}

/* ══════════════════════════════════════════
   SESSION
══════════════════════════════════════════ */
function restoreSession() {
  const token = localStorage.getItem('lum_admin_token');
  const user  = localStorage.getItem('lum_admin_user');
  if (token && user) {
    S.token = token; S.user = user;
    enterDashboard(user);
  } else {
    showPage('login-page');
  }
}

/* ══════════════════════════════════════════
   LOGIN
══════════════════════════════════════════ */
function bindLogin() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      const isPass = inp.type === 'password';
      inp.type = isPass ? 'text' : 'password';
      btn.querySelector('.eye-show').classList.toggle('gone', isPass);
      btn.querySelector('.eye-hide').classList.toggle('gone', !isPass);
    });
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-user').value.trim();
    const password = document.getElementById('admin-pass').value;

    if (!username || !password) {
      toast('Please fill in all fields.', 'error'); return;
    }

    const btn = document.getElementById('login-btn');
    setBtnLoading(btn, true, 'login');

    try {
      const res  = await api('/api/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
      const data = await safeJson(res);

      if (!res.ok) { toast(extractError(data), 'error'); return; }

      const token = data.token || data.access || data.key || data.auth_token;
      if (!token) { toast('Login failed: no token returned.', 'error'); return; }

      localStorage.setItem('lum_admin_token', token);
      localStorage.setItem('lum_admin_user', username);
      S.token = token; S.user = username;

      toast(`Welcome, ${username}!`, 'success');
      setTimeout(() => enterDashboard(username), 500);

    } catch (err) {
      toast(err.message || 'Network error.', 'error');
    } finally {
      setBtnLoading(btn, false, 'login');
    }
  });
}

function enterDashboard(username) {
  showPage('admin-shell');
  setUserDisplay(username);
  document.getElementById('donut-date').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  switchSection('dashboard');
  fetchAndRenderAll();
}

function setUserDisplay(username) {
  const initials = username.charAt(0).toUpperCase();
  document.getElementById('sidebar-avatar').textContent  = initials;
  document.getElementById('sidebar-name').textContent    = username;
  document.getElementById('topbar-avatar').textContent   = initials;
  document.getElementById('topbar-name').textContent     = username;
}

/* ══════════════════════════════════════════
   SIDEBAR NAV
══════════════════════════════════════════ */
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = item.dataset.section;
      if (sec) {
        switchSection(sec);
        closeMobileSidebar();
      }
    });
  });

  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // "View All" button in dashboard
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-section]');
    if (btn && !btn.classList.contains('nav-item')) {
      switchSection(btn.dataset.section);
    }
  });

  // Add room shortcut
  document.getElementById('add-room-shortcut').addEventListener('click', () => {
    switchSection('add-room');
  });

  document.getElementById('refresh-stats-btn').addEventListener('click', () => {
    const btn = document.getElementById('refresh-stats-btn');
    btn.classList.add('spinning');
    fetchAndRenderAll().then(() => {
      btn.classList.remove('spinning');
      toast('Data refreshed', 'info');
    });
  });
}

function switchSection(name) {
  S.activeSection = name;
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(sec => {
    sec.classList.remove('active');
    sec.style.display = 'none';
  });
  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.style.display = 'flex';
    requestAnimationFrame(() => target.classList.add('active'));
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });

  const labels = { dashboard: 'Dashboard', rooms: 'Rooms', 'add-room': 'Add Room' };
  document.getElementById('breadcrumb-label').textContent = labels[name] || name;
}

function handleLogout() {
  localStorage.removeItem('lum_admin_token');
  localStorage.removeItem('lum_admin_user');
  S.token = null; S.user = null;
  S.rooms = []; S.filtered = [];
  toast('Signed out successfully.', 'info');
  setTimeout(() => showPage('login-page'), 400);
}

/* ══════════════════════════════════════════
   FETCH ROOMS + RENDER ALL
══════════════════════════════════════════ */
async function fetchAndRenderAll() {
  try {
    const res  = await api('/api/rooms/');
    const data = await safeJson(res);
    if (!res.ok) { toast('Failed to load rooms.', 'error'); return; }
    const rooms = Array.isArray(data) ? data : (data.results || []);
    S.rooms = rooms;
    S.filtered = [...rooms];

    renderStats(rooms);
    renderDonut(rooms);
    renderRecentList(rooms);
    renderRoomsGrid(rooms);
    document.getElementById('rooms-count-display').textContent = `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`;
  } catch (err) {
    toast('Could not connect to server.', 'error');
    renderStats([]);
    renderDonut([]);
    renderRoomsGrid([]);
  }
}

/* ── STATS ── */
function renderStats(rooms) {
  const total = rooms.length;
  const booked = rooms.filter(r => isBooked(r)).length;
  const avail  = total - booked;
  const occPct = total ? Math.round((booked / total) * 100) : 0;

  animateCount('val-total',  total);
  animateCount('val-avail',  avail);
  animateCount('val-booked', booked);
  animateCount('val-occ',    occPct, '%');

  setTimeout(() => {
    const bar = document.getElementById('occ-bar');
    if (bar) bar.style.width = `${occPct}%`;
  }, 200);
}

function animateCount(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const duration = 900;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * ease) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── DONUT ── */
function renderDonut(rooms) {
  const total  = rooms.length || 1;
  const booked = rooms.filter(r => isBooked(r)).length;
  const avail  = total - booked - (rooms.length === 0 ? 1 : 0);
  const circ   = 2 * Math.PI * 54; // 339.3

  const availRatio  = rooms.length ? (rooms.length - booked) / rooms.length : 0;
  const bookedRatio = rooms.length ? booked / rooms.length : 0;

  const availArc  = availRatio * circ;
  const bookedArc = bookedRatio * circ;
  const bookedOffset = circ - availArc;

  const pct = rooms.length ? Math.round((booked / rooms.length) * 100) : 0;

  setTimeout(() => {
    const elAvail  = document.getElementById('donut-avail-arc');
    const elBooked = document.getElementById('donut-booked-arc');
    const elPct    = document.getElementById('donut-pct');

    if (elAvail)  elAvail.setAttribute('stroke-dasharray',  `${availArc} ${circ - availArc}`);
    if (elBooked) {
      elBooked.setAttribute('stroke-dasharray',  `${bookedArc} ${circ - bookedArc}`);
      elBooked.setAttribute('stroke-dashoffset', `-${availArc}`);
    }
    if (elPct) elPct.textContent = `${pct}%`;
  }, 300);
}

/* ── RECENT LIST ── */
function renderRecentList(rooms) {
  const el = document.getElementById('recent-list');
  if (!el) return;
  el.innerHTML = '';

  const slice = rooms.slice(0, 6);
  if (!slice.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-muted);padding:12px 0">No rooms yet.</p>';
    return;
  }

  slice.forEach((room, i) => {
    const type  = room.room_type || room.type || 'Standard';
    const num   = room.room_number || room.number || room.id || '—';
    const price = parseFloat(room.price || room.price_per_night || 0).toFixed(0);
    const icon  = getRoomEmoji(type);

    const item = document.createElement('div');
    item.className = 'recent-item';
    item.style.animationDelay = `${i * 0.06}s`;
    item.innerHTML = `
      <div class="recent-icon">${icon}</div>
      <div class="recent-info">
        <div class="recent-name">Room ${num}</div>
        <div class="recent-type">${type}</div>
      </div>
      <div class="recent-price">$${price}</div>`;
    el.appendChild(item);
  });
}

/* ── ROOMS GRID ── */
function renderRoomsGrid(rooms) {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;
  grid.innerHTML = '';

  document.getElementById('rooms-count-display').textContent = `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`;

  if (!rooms.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏨</div>
        <h3>No rooms found</h3>
        <p>Try adjusting your search or filters, or add a new room.</p>
      </div>`;
    return;
  }

  rooms.forEach((room, i) => {
    const card = buildRoomCard(room, i);
    grid.appendChild(card);
  });
}

function buildRoomCard(room, index) {
  const type   = room.room_type || room.type || 'Standard';
  const num    = room.room_number || room.number || room.id || '—';
  const price  = parseFloat(room.price || room.price_per_night || 0).toFixed(2);
  const booked = isBooked(room);
  const typeClass = getTypeClass(type);

  const card = document.createElement('div');
  card.className = `room-card type-${typeClass}`;
  card.style.animationDelay = `${index * 0.055}s`;
  card.innerHTML = `
    <div class="room-card-top">
      <span class="room-num-badge">#${num}</span>
      <span class="status-chip ${booked ? 'booked' : 'available'}">${booked ? 'Booked' : 'Available'}</span>
    </div>
    <div class="room-name">Room ${num}</div>
    <div class="room-type">${type}</div>
    <div class="room-card-divider"></div>
    <div class="room-card-bottom">
      <div class="room-price-wrap">
        <span class="room-currency">$</span>
        <span class="room-price">${price.split('.')[0]}</span>
        <span class="room-per-night">.${price.split('.')[1]} /night</span>
      </div>
      <button class="btn-delete" data-id="${room.id}" data-name="Room ${num}" title="Delete room">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>`;

  card.querySelector('.btn-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteModal(room.id, `Room ${num}`);
  });

  return card;
}

/* ══════════════════════════════════════════
   ROOM CONTROLS (search + filter)
══════════════════════════════════════════ */
function bindRoomControls() {
  document.getElementById('room-search').addEventListener('input', applyRoomFilters);
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyRoomFilters();
    });
  });
}

function applyRoomFilters() {
  const query = (document.getElementById('room-search').value || '').toLowerCase().trim();
  const filter = document.querySelector('.filter-pill.active')?.dataset.filter || 'all';

  let result = S.rooms.filter(room => {
    const type = (room.room_type || room.type || '').toLowerCase();
    const num  = String(room.room_number || room.number || room.id || '').toLowerCase();
    const matchQ = !query || type.includes(query) || num.includes(query);
    const booked = isBooked(room);
    const matchF = filter === 'all'
      || (filter === 'available' && !booked)
      || (filter === 'booked' && booked);
    return matchQ && matchF;
  });

  S.filtered = result;
  renderRoomsGrid(result);
}

/* ══════════════════════════════════════════
   ADD ROOM FORM
══════════════════════════════════════════ */
function bindAddRoomForm() {
  const numInput  = document.getElementById('f-room-number');
  const typeInput = document.getElementById('f-room-type');
  const priceInput = document.getElementById('f-price');
  const statusInput = document.getElementById('f-status');

  [numInput, typeInput, priceInput, statusInput].forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  document.getElementById('reset-form-btn').addEventListener('click', () => {
    document.getElementById('add-room-form').reset();
    updatePreview();
  });

  document.getElementById('add-room-form').addEventListener('submit', handleAddRoom);
}

function updatePreview() {
  const num    = document.getElementById('f-room-number').value || '—';
  const type   = document.getElementById('f-room-type').value || 'Standard';
  const price  = parseFloat(document.getElementById('f-price').value || 0).toFixed(2);
  const status = document.getElementById('f-status').value || 'available';

  document.getElementById('preview-num').textContent   = `Room ${num}`;
  document.getElementById('preview-type').textContent  = type || 'Select a type';
  document.getElementById('preview-price').textContent = `$${price}`;
  document.getElementById('preview-badge').textContent = type || 'Type';
  document.getElementById('preview-status').innerHTML  =
    `<span class="status-chip ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

async function handleAddRoom(e) {
  e.preventDefault();
  const roomNumber = document.getElementById('f-room-number').value.trim();
  const roomType   = document.getElementById('f-room-type').value;
  const price      = document.getElementById('f-price').value;
  const status     = document.getElementById('f-status').value;

  if (!roomNumber || !roomType || !price) {
    toast('Please fill in all required fields.', 'error'); return;
  }

  const btn = document.getElementById('add-room-btn');
  setBtnLoading(btn, true);

  try {
    const res = await api('/api/rooms/', {
      method: 'POST',
      body: JSON.stringify({
        room_number: roomNumber,
        room_type:   roomType,
        price:       parseFloat(price),
        status:      status,
      }),
    });
    const data = await safeJson(res);

    if (!res.ok) { toast(extractError(data), 'error'); return; }

    /* Success animation */
    btn.querySelector('.btn-label').classList.add('gone');
    const check = btn.querySelector('.btn-check');
    check.classList.remove('gone');
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

    toast(`Room ${roomNumber} created successfully!`, 'success');

    await fetchAndRenderAll();

    setTimeout(() => {
      document.getElementById('add-room-form').reset();
      updatePreview();
      btn.querySelector('.btn-label').classList.remove('gone');
      check.classList.add('gone');
      btn.style.background = '';
    }, 1800);

  } catch (err) {
    toast(err.message || 'Failed to create room.', 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ══════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════ */
function bindDeleteModal() {
  document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
  document.getElementById('confirm-delete').addEventListener('click', handleDelete);
}

function openDeleteModal(id, name) {
  S.deleteTargetId   = id;
  S.deleteTargetName = name;
  document.getElementById('delete-room-name').textContent = name;
  document.getElementById('delete-modal').classList.remove('gone');
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('gone');
  document.body.style.overflow = '';
  S.deleteTargetId   = null;
  S.deleteTargetName = null;
  resetBtnState(document.getElementById('confirm-delete'));
}

async function handleDelete() {
  if (!S.deleteTargetId) return;
  const btn = document.getElementById('confirm-delete');
  setBtnLoading(btn, true, 'danger');

  try {
    const res = await api(`/api/rooms/${S.deleteTargetId}/`, { method: 'DELETE' });

    if (res.ok || res.status === 204) {
      toast(`${S.deleteTargetName} deleted.`, 'success');
      closeDeleteModal();
      await fetchAndRenderAll();
    } else {
      const data = await safeJson(res);
      toast(extractError(data), 'error');
    }
  } catch (err) {
    toast(err.message || 'Delete failed.', 'error');
  } finally {
    setBtnLoading(btn, false, 'danger');
  }
}

/* ══════════════════════════════════════════
   MOBILE SIDEBAR
══════════════════════════════════════════ */
function bindMobileMenu() {
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    sidebar.classList.add('open');
    overlay.classList.remove('gone');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('gone');
}

/* ══════════════════════════════════════════
   API HELPERS
══════════════════════════════════════════ */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = `Token ${S.token}`;
  return fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
}
async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}
function extractError(data) {
  if (!data) return 'An error occurred.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return data.non_field_errors.join(' ');
  const fe = Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
    .join(' | ');
  return fe || 'Something went wrong.';
}

/* ══════════════════════════════════════════
   BUTTON STATES
══════════════════════════════════════════ */
function setBtnLoading(btn, loading, variant = 'primary') {
  if (!btn) return;
  const label = btn.querySelector('.btn-label');
  const spin  = btn.querySelector('.btn-spin');
  if (loading) {
    if (label) label.classList.add('gone');
    if (spin)  spin.classList.remove('gone');
    btn.disabled = true;
  } else {
    if (label) label.classList.remove('gone');
    if (spin)  spin.classList.add('gone');
    btn.disabled = false;
  }
}
function resetBtnState(btn) {
  if (!btn) return;
  const label = btn.querySelector('.btn-label');
  const spin  = btn.querySelector('.btn-spin');
  if (label) label.classList.remove('gone');
  if (spin)  spin.classList.add('gone');
  btn.disabled = false;
}

/* ══════════════════════════════════════════
   PAGE SWITCHER
══════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  const el = document.getElementById(id);
  if (el) {
    el.style.display = (id === 'admin-shell') ? 'flex' : 'flex';
    requestAnimationFrame(() => el.classList.add('active'));
  }
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span class="toast-msg">${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  }, 3600);
  el.addEventListener('click', () => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  });
}

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function isBooked(room) {
  const s = (room.status || room.is_booked || '').toString().toLowerCase();
  return s === 'booked' || s === 'true' || s === '1';
}

function getTypeClass(type) {
  const t = type.toLowerCase();
  if (t.includes('super')) return 'super';
  if (t.includes('classic')) return 'classic';
  if (t.includes('standard')) return 'standard';
  if (t.includes('suite')) return 'suite';
  if (t.includes('deluxe')) return 'deluxe';
  return 'standard';
}

function getRoomEmoji(type) {
  const t = type.toLowerCase();
  if (t.includes('super') || t.includes('premium')) return '🌟';
  if (t.includes('suite'))  return '👑';
  if (t.includes('deluxe')) return '💎';
  if (t.includes('classic')) return '🏛️';
  return '🛏️';
}