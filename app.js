/* ==========================================================================
   CINEMA COSMOS — SECURE SERVER-AUTHENTICATED SYSTEM & USER PORTAL
   ========================================================================== */

const INITIAL_MOVIES = [
  {
    id: 1,
    title: "Interstellar Odyssey",
    genre: "Sci-Fi",
    duration: "2h 49m",
    format: "IMAX 3D",
    poster: "images/poster_interstellar.jpg",
    showtimes: ["14:30", "17:45", "20:15", "23:00"]
  },
  {
    id: 2,
    title: "Dune Awakening: Part II",
    genre: "Sci-Fi",
    duration: "2h 46m",
    format: "Dolby Cinema",
    poster: "images/poster_dune.jpg",
    showtimes: ["13:00", "16:15", "19:30", "22:45"]
  },
  {
    id: 3,
    title: "Neo Tokyo 2099",
    genre: "Action",
    duration: "2h 15m",
    format: "IMAX 3D",
    poster: "images/poster_cyberpunk.jpg",
    showtimes: ["15:00", "18:30", "21:15"]
  },
  {
    id: 4,
    title: "Starlight Express",
    genre: "Animation",
    duration: "1h 48m",
    format: "4K Laser",
    poster: "images/poster_starlight.jpg",
    showtimes: ["11:30", "14:00", "16:45", "19:15"]
  }
];

function getSavedMovies() {
  const saved = localStorage.getItem('cinema_movies');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return INITIAL_MOVIES;
}

function saveMovies(movies) {
  localStorage.setItem('cinema_movies', JSON.stringify(movies));
}

let MOVIES_DATA = getSavedMovies();

const state = {
  theme: localStorage.getItem('cinema_theme') || 'dark',
  isAdmin: sessionStorage.getItem('cinema_admin_logged_in') === 'true',
  currentUser: sessionStorage.getItem('cinema_user_email') || null,
  currentView: 'movies',
  selectedMovie: MOVIES_DATA[0] || INITIAL_MOVIES[0],
  selectedShowtime: "20:15",
  selectedSeats: [],
  customerDetails: { name: '', email: '', phone: '' },
  bookingRef: ''
};

const PRICE_STANDARD = 14.00;
const PRICE_VIP = 22.00;
const VIP_SEATS = ['C3', 'C4', 'C5', 'C6', 'D3', 'D4', 'D5', 'D6'];
const OCCUPIED_SEATS = ['A2', 'B4', 'B5', 'D2', 'F6'];

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  updateLoginNavButton();
  renderMoviesGrid();
  initSeatMap();
  renderAdminMoviesTable();

  // Restore past reservations section if user was already logged in
  if (state.currentUser && !state.isAdmin) {
    renderReservationHistory();
  }

  const hash = window.location.hash.replace('#', '');
  if (hash && ['movies', 'reserve', 'payment', 'thank-you', 'login', 'admin', 'contact', 'policies'].includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo('movies');
  }

  if (window.lucide) lucide.createIcons();
});

/* Light / Dark Mode Toggle */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('cinema_theme', state.theme);
  applyTheme(state.theme);
  showToast(`Switched to ${state.theme.toUpperCase()} Mode`);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  
  if (icon && text) {
    if (theme === 'light') {
      icon.setAttribute('data-lucide', 'moon');
      text.innerText = 'Dark';
    } else {
      icon.setAttribute('data-lucide', 'sun');
      text.innerText = 'Light';
    }
    if (window.lucide) lucide.createIcons();
  }
}

/* ==========================================================================
   LOGIN / AUTH SYSTEM
   Admin: username=admin, password=MaX1503royal → redirect to Admin Panel
   Regular user: any username + any password → movies page + reservations
   ========================================================================== */


/* Update the nav login button to reflect current auth state */
function updateLoginNavButton() {
  const btn  = document.getElementById('nav-login-btn');
  const icon = document.getElementById('login-nav-icon');
  const text = document.getElementById('login-nav-text');
  if (!btn || !icon || !text) return;

  if (state.isAdmin) {
    // Admin logged in — show shield icon + Admin label, click goes to admin panel
    icon.setAttribute('data-lucide', 'shield-check');
    text.innerText = 'Admin';
    btn.onclick = () => navigateTo('admin');
    btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  } else if (state.currentUser) {
    // Regular user logged in — show user icon + username, click shows logout menu
    icon.setAttribute('data-lucide', 'user-check');
    text.innerText = state.currentUser.split('@')[0];
    btn.onclick = handleUserLogout;
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    btn.title = 'Click to sign out';
  } else {
    // Not logged in
    icon.setAttribute('data-lucide', 'user');
    text.innerText = 'Login';
    btn.onclick = () => navigateTo('login');
    btn.style.background = '';
    btn.title = '';
  }
  if (window.lucide) lucide.createIcons();
}

/* Universal login handler — called from the login form */
async function handleUserLogin(e) {
  e.preventDefault();

  const user = document.getElementById('login-username').value.trim();
  const pass = document.getElementById('login-password').value.trim();
  const btn  = document.getElementById('btn-login-submit');

  if (!user || !pass) {
    showToast('⚠️ Please enter your username and password.');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Signing in...';

  if (user.toLowerCase() === 'admin') {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success' || data.role !== 'admin') {
        throw new Error(data.message || 'Invalid administrator credentials');
      }
      state.isAdmin = true;
      state.currentUser = 'admin';
      sessionStorage.setItem('cinema_admin_logged_in', 'true');
      sessionStorage.setItem('cinema_user_email', 'admin');
      sessionStorage.setItem('cinema_admin_token', data.token);
      updateLoginNavButton();
      renderAdminMoviesTable();
      document.getElementById('login-form').reset();
      showToast('Welcome back, Administrator!');
      navigateTo('admin');
    } catch (error) {
      showToast(error.message || 'Unable to sign in as administrator.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in"></i> Sign In &amp; View Movies';
      if (window.lucide) lucide.createIcons();
    }
    return;
  }

  // Simulate brief auth delay for UX
  setTimeout(() => {
    if (false) {
      // ── ADMIN LOGIN ──
      state.isAdmin = true;
      state.currentUser = 'admin';
      sessionStorage.setItem('cinema_admin_logged_in', 'true');
      sessionStorage.setItem('cinema_user_email', 'admin');
      updateLoginNavButton();
      renderAdminMoviesTable();
      document.getElementById('login-form').reset();
      showToast('🔐 Welcome back, Administrator!');
      navigateTo('admin');
    } else {
      // ── REGULAR USER LOGIN ──
      state.isAdmin = false;
      state.currentUser = user;
      sessionStorage.setItem('cinema_user_email', user);
      sessionStorage.removeItem('cinema_admin_logged_in');
      sessionStorage.removeItem('cinema_admin_token');
      updateLoginNavButton();
      document.getElementById('login-form').reset();
      showToast(`👋 Welcome, ${user.split('@')[0]}! Here are your reservations.`);
      // Show past reservations section
      const pastSection = document.getElementById('past-reservations-section');
      if (pastSection) pastSection.style.display = 'block';
      renderReservationHistory();
      navigateTo('movies');
    }

    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="log-in"></i> Sign In &amp; View Movies`;
    if (window.lucide) lucide.createIcons();
  }, 600);
}

/* Handle nav login button click when not logged in */
function handleLoginNavClick() {
  if (state.isAdmin) {
    navigateTo('admin');
  } else if (state.currentUser) {
    handleUserLogout();
  } else {
    navigateTo('login');
  }
}

/* Logout — clears all session state */
function handleUserLogout() {
  state.isAdmin = false;
  state.currentUser = null;
  sessionStorage.removeItem('cinema_admin_logged_in');
  sessionStorage.removeItem('cinema_user_email');
  sessionStorage.removeItem('cinema_admin_token');
  // Hide past reservations section
  const pastSection = document.getElementById('past-reservations-section');
  if (pastSection) pastSection.style.display = 'none';
  updateLoginNavButton();
  showToast('🔒 Signed out successfully.');
  navigateTo('movies');
}

/* Legacy alias — keeps any old references working */
function handleAdminLogout() { handleUserLogout(); }

/* View Navigation with Access Guard */
function navigateTo(viewId) {
  if (viewId === 'admin' && !state.isAdmin) {
    showToast("⚠️ Admin access restricted. Please sign in as admin.");
    viewId = 'login';
  }

  state.currentView = viewId;
  window.location.hash = viewId;

  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${viewId}`);
  if (activeNav) activeNav.classList.add('active');

  if (viewId === 'admin') {
    renderAdminMoviesTable();
  }

  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Render Movies Grid */
function renderMoviesGrid() {
  const container = document.getElementById('movies-grid-container');
  if (!container) return;

  if (MOVIES_DATA.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No active movies in catalog. Sign in to Admin Panel to add movies!</div>`;
    return;
  }

  container.innerHTML = MOVIES_DATA.map(movie => `
    <div class="movie-card">
      <div class="movie-poster-wrap">
        <img src="${movie.poster}" alt="${movie.title}" class="movie-poster">
      </div>
      <div class="movie-info">
        <div class="movie-genre">${movie.genre} • ${movie.format}</div>
        <h3 class="movie-card-title">${movie.title}</h3>
        <div style="font-size: 0.82rem; color: var(--text-muted);"><i data-lucide="clock" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${movie.duration}</div>
        
        <div class="showtimes-list">
          ${movie.showtimes.map(t => `
            <button class="showtime-pill" onclick="quickSelectMovie(${movie.id}, '${t}')">${t}</button>
          `).join('')}
        </div>

        <button class="btn-primary" style="width: 100%; margin-top: auto;" onclick="quickSelectMovie(${movie.id}, '${movie.showtimes[0] || '20:15'}')">
          Reserve Seats
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function quickSelectMovie(movieId, showtime) {
  const movie = MOVIES_DATA.find(m => m.id === movieId);
  if (movie) {
    state.selectedMovie = movie;
    state.selectedShowtime = showtime;
    document.getElementById('reserve-movie-title').innerText = movie.title;
    document.getElementById('reserve-movie-subtitle').innerText = `Hall 1 (${movie.format}) • Today at ${showtime}`;
    navigateTo('reserve');
  }
}

/* Seat Map Initialization */
function initSeatMap() {
  const container = document.getElementById('seats-container');
  if (!container) return;

  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  let html = '';

  rows.forEach(r => {
    html += `<div class="seat-row">`;
    for (let i = 1; i <= 8; i++) {
      const seatId = `${r}${i}`;
      const isVip = VIP_SEATS.includes(seatId);
      const isOccupied = OCCUPIED_SEATS.includes(seatId);

      let classes = 'seat';
      if (isVip) classes += ' vip';
      if (isOccupied) classes += ' occupied';

      html += `<button type="button" class="${classes}" aria-pressed="false" aria-label="Seat ${seatId}${isVip ? ', VIP' : ''}${isOccupied ? ', occupied' : ''}" ${isOccupied ? 'disabled' : ''} onclick="toggleSeat('${seatId}', ${isOccupied}, this)">${seatId}</button>`;
    }
    html += `</div>`;
  });

  container.innerHTML = html;
}

function toggleSeat(seatId, isOccupied, element) {
  if (isOccupied) {
    showToast("Seat already taken!");
    return;
  }

  const idx = state.selectedSeats.indexOf(seatId);
  if (idx > -1) {
    state.selectedSeats.splice(idx, 1);
    element.classList.remove('selected');
    element.setAttribute('aria-pressed', 'false');
  } else {
    state.selectedSeats.push(seatId);
    element.classList.add('selected');
    element.setAttribute('aria-pressed', 'true');
  }

  updateSummary();
}

function updateSummary() {
  const listEl = document.getElementById('summary-seats-list');
  const countEl = document.getElementById('summary-seats-count');
  const priceEl = document.getElementById('summary-total-price');

  if (state.selectedSeats.length === 0) {
    listEl.innerText = 'None selected';
    countEl.innerText = '0';
    priceEl.innerText = '$0.00';
    return;
  }

  listEl.innerText = state.selectedSeats.join(', ');
  countEl.innerText = state.selectedSeats.length;

  let total = 0;
  state.selectedSeats.forEach(s => total += VIP_SEATS.includes(s) ? PRICE_VIP : PRICE_STANDARD);
  priceEl.innerText = `$${total.toFixed(2)}`;
}

function handleProceedToPayment(e) {
  e.preventDefault();
  if (state.selectedSeats.length === 0) {
    showToast("Please select at least 1 seat.");
    return;
  }

  state.customerDetails.name = document.getElementById('cust-name').value;
  state.customerDetails.email = document.getElementById('cust-email').value;
  state.customerDetails.phone = document.getElementById('cust-phone').value;

  document.getElementById('pay-summary-movie').innerText = state.selectedMovie.title;
  document.getElementById('pay-summary-time').innerText = `Today at ${state.selectedShowtime}`;
  document.getElementById('pay-summary-seats').innerText = state.selectedSeats.join(', ');
  document.getElementById('pay-summary-email').innerText = state.customerDetails.email;

  let total = 0;
  state.selectedSeats.forEach(s => total += VIP_SEATS.includes(s) ? PRICE_VIP : PRICE_STANDARD);
  document.getElementById('pay-summary-total').innerText = `$${total.toFixed(2)}`;

  navigateTo('payment');
}

/* CHARGILY PAY INTEGRATION */
async function handleChargilyCheckout() {
  const btn = document.getElementById('btn-chargily-pay');
  btn.disabled = true;
  btn.innerText = "Connecting to Chargily Pay...";

  let total = 0;
  state.selectedSeats.forEach(s => total += VIP_SEATS.includes(s) ? PRICE_VIP : PRICE_STANDARD);
  if (total === 0) total = 28.00;

  try {
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(total * 100),
        currency: 'dzd',
        email: state.customerDetails.email || 'alex@cosmos.com',
        movie: state.selectedMovie.title
      })
    });

    const data = await response.json();

    if (data.status !== 'success' || !data.checkout_url) {
      showToast(data.message || 'Unable to start payment. Please try again.');
      return;
    }

    if (data.status === 'success' && data.checkout_url) {
      showToast("Redirecting to Chargily Pay Checkout...");
      setTimeout(() => {
        window.location.href = data.checkout_url;
      }, 1000);
    } else {
      showToast("⚠️ Chargily session error. Fallback demo enabled.");
      simulateSuccessPayment();
    }
  } catch (err) {
    showToast('Unable to reach the payment service. Please try again later.');
    return;
    console.error("Chargily Error:", err);
    showToast("⚠️ Launching Chargily demo payment session...");
    simulateSuccessPayment();
  } finally {
    btn.disabled = false;
    btn.innerText = "Pay Now with Chargily Pay";
  }
}

function simulateSuccessPayment() {
  state.bookingRef = 'COSMOS-' + Math.floor(1000 + Math.random() * 9000);

  document.getElementById('ticket-ref-display').innerText = `REF: ${state.bookingRef}`;
  document.getElementById('ticket-movie-display').innerText = state.selectedMovie.title;
  document.getElementById('ticket-time-display').innerText = `Today, ${state.selectedShowtime}`;
  document.getElementById('ticket-hall-display').innerText = `Hall 1 (${state.selectedMovie.format})`;
  document.getElementById('ticket-seats-display').innerText = state.selectedSeats.join(', ');
  document.getElementById('ticket-holder-display').innerText = state.customerDetails.name || 'Alex Vance';

  document.getElementById('modal-email-recipient').innerText = state.customerDetails.email || 'alex@cosmos.com';
  document.getElementById('modal-email-movie').innerText = state.selectedMovie.title;
  document.getElementById('modal-email-time').innerText = `Today, ${state.selectedShowtime}`;
  document.getElementById('modal-email-seats').innerText = state.selectedSeats.join(', ');
  document.getElementById('modal-email-holder').innerText = state.customerDetails.name || 'Alex Vance';
  document.getElementById('modal-email-ref').innerText = state.bookingRef;

  saveReservation({
    ref: state.bookingRef,
    movie: state.selectedMovie.title,
    showtime: state.selectedShowtime,
    seats: state.selectedSeats,
    holder: state.customerDetails.name || 'Guest',
    email: state.customerDetails.email || '',
    createdAt: new Date().toISOString()
  });

  showToast("🎉 Chargily Payment Confirmed! Ticket emailed.");
  navigateTo('thank-you');
}

function getReservations() {
  try { return JSON.parse(localStorage.getItem('cinema_reservations') || '[]'); }
  catch (_) { return []; }
}

function saveReservation(reservation) {
  const reservations = getReservations();
  reservations.unshift(reservation);
  localStorage.setItem('cinema_reservations', JSON.stringify(reservations.slice(0, 20)));
  renderReservationHistory();
}

function renderReservationHistory() {
  const section = document.getElementById('past-reservations-section');
  const list = document.getElementById('past-reservations-list');
  if (!section || !list) return;
  if (!state.currentUser || state.isAdmin) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const reservations = getReservations().filter(r => !r.email || r.email === state.currentUser);
  if (!reservations.length) {
    list.innerHTML = '<p class="empty-state">No reservations saved on this device yet. Completed demo bookings will appear here.</p>';
    return;
  }
  list.innerHTML = reservations.map(r => `<div class="reservation-item"><div><strong>${escapeHTML(r.movie)}</strong><div class="reservation-meta">${escapeHTML(r.showtime)} · Seats ${escapeHTML(r.seats.join(', '))}</div></div><span class="reservation-ref">${escapeHTML(r.ref)}</span></div>`).join('');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

/* ==========================================================================
   ADMIN DASHBOARD ENGINE (ADD / EDIT / REMOVE MOVIES & SHOWTIMES)
   ========================================================================== */

function renderAdminMoviesTable() {
  const tbody = document.getElementById('admin-movies-table-body');
  const statMoviesEl = document.getElementById('admin-stat-movies');
  if (statMoviesEl) statMoviesEl.innerText = MOVIES_DATA.length;

  if (!tbody) return;

  if (MOVIES_DATA.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No movies found. Click "Add New Movie" above!</td></tr>`;
    return;
  }

  tbody.innerHTML = MOVIES_DATA.map(movie => `
    <tr>
      <td><img src="${movie.poster}" alt="${movie.title}" class="table-thumb"></td>
      <td><strong>${movie.title}</strong></td>
      <td>${movie.genre}</td>
      <td><span class="badge-format">${movie.format}</span></td>
      <td>${movie.duration}</td>
      <td>
        <div style="display: flex; gap: 0.3rem; flex-wrap: wrap; align-items: center;">
          ${movie.showtimes.map(t => `
            <span class="showtime-pill" title="Click to remove showtime ${t}" onclick="removeShowtimeFromMovie(${movie.id}, '${t}')">
              ${t} &times;
            </span>
          `).join('')}
          <button style="background: none; border: 1px dashed var(--primary); color: var(--primary); padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;" onclick="addShowtimeToMovie(${movie.id})">
            + Add
          </button>
        </div>
      </td>
      <td style="text-align: right;">
        <button class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; margin-right: 0.4rem;" onclick="openEditMovieModal(${movie.id})">
          <i data-lucide="edit-3"></i> Edit
        </button>
        <button class="btn-danger" onclick="deleteAdminMovie(${movie.id})">
          <i data-lucide="trash-2"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function openAddMovieModal() {
  document.getElementById('admin-modal-title').innerText = "Add New Movie";
  document.getElementById('modal-movie-id').value = "";
  document.getElementById('modal-movie-title').value = "";
  document.getElementById('modal-movie-genre').value = "";
  document.getElementById('modal-movie-duration').value = "";
  document.getElementById('modal-movie-format').value = "IMAX 3D";
  document.getElementById('modal-movie-poster').value = "images/poster_interstellar.jpg";
  document.getElementById('modal-movie-showtimes').value = "14:00, 17:30, 20:15";

  document.getElementById('admin-movie-modal').classList.add('active');
}

function openEditMovieModal(movieId) {
  const movie = MOVIES_DATA.find(m => m.id === movieId);
  if (!movie) return;

  document.getElementById('admin-modal-title').innerText = `Edit: ${movie.title}`;
  document.getElementById('modal-movie-id').value = movie.id;
  document.getElementById('modal-movie-title').value = movie.title;
  document.getElementById('modal-movie-genre').value = movie.genre;
  document.getElementById('modal-movie-duration').value = movie.duration;
  document.getElementById('modal-movie-format').value = movie.format;
  document.getElementById('modal-movie-poster').value = movie.poster;
  document.getElementById('modal-movie-showtimes').value = movie.showtimes.join(', ');

  document.getElementById('admin-movie-modal').classList.add('active');
}

function closeAdminMovieModal() {
  document.getElementById('admin-movie-modal').classList.remove('active');
}

function saveAdminMovie(e) {
  e.preventDefault();

  const idVal = document.getElementById('modal-movie-id').value;
  const title = document.getElementById('modal-movie-title').value.trim();
  const genre = document.getElementById('modal-movie-genre').value.trim();
  const duration = document.getElementById('modal-movie-duration').value.trim();
  const format = document.getElementById('modal-movie-format').value;
  const poster = document.getElementById('modal-movie-poster').value;
  const showtimesRaw = document.getElementById('modal-movie-showtimes').value;

  const showtimes = showtimesRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!title || !genre || !duration || !showtimes.length || !showtimes.every(time => validTime.test(time))) {
    showToast('Use a title, genre, duration, and showtimes in 24-hour HH:MM format.');
    return;
  }
  if (poster && !poster.startsWith('images/')) {
    showToast('Poster paths must point to an image in the images/ folder.');
    return;
  }

  if (idVal) {
    const movie = MOVIES_DATA.find(m => m.id == idVal);
    if (movie) {
      movie.title = title;
      movie.genre = genre;
      movie.duration = duration;
      movie.format = format;
      movie.poster = poster;
      movie.showtimes = showtimes;
    }
    showToast("✏️ Movie updated successfully!");
  } else {
    const newId = Date.now();
    MOVIES_DATA.push({
      id: newId,
      title,
      genre,
      duration,
      format,
      poster,
      showtimes
    });
    showToast("🎬 New Movie added to catalog!");
  }

  saveMovies(MOVIES_DATA);
  renderMoviesGrid();
  renderAdminMoviesTable();
  closeAdminMovieModal();
}

function deleteAdminMovie(movieId) {
  if (confirm("Are you sure you want to remove this movie from the website?")) {
    MOVIES_DATA = MOVIES_DATA.filter(m => m.id !== movieId);
    saveMovies(MOVIES_DATA);
    renderMoviesGrid();
    renderAdminMoviesTable();
    showToast("🗑️ Movie removed from catalog.");
  }
}

function addShowtimeToMovie(movieId) {
  const newTime = prompt("Enter new showtime (e.g. 19:15):", "19:15");
  if (newTime && newTime.trim()) {
    const movie = MOVIES_DATA.find(m => m.id === movieId);
    if (movie) {
      movie.showtimes.push(newTime.trim());
      saveMovies(MOVIES_DATA);
      renderMoviesGrid();
      renderAdminMoviesTable();
      showToast(`⏰ Added showtime ${newTime.trim()} to ${movie.title}`);
    }
  }
}

function removeShowtimeFromMovie(movieId, showtime) {
  const movie = MOVIES_DATA.find(m => m.id === movieId);
  if (movie) {
    if (movie.showtimes.length <= 1) {
      showToast("⚠️ A movie must have at least one showtime.");
      return;
    }
    movie.showtimes = movie.showtimes.filter(t => t !== showtime);
    saveMovies(MOVIES_DATA);
    renderMoviesGrid();
    renderAdminMoviesTable();
    showToast(`Removed showtime ${showtime}`);
  }
}

function openEmailModal() {
  document.getElementById('email-modal').classList.add('active');
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.remove('active');
}

function handleContactSubmit(e) {
  e.preventDefault();
  showToast("Message sent to support!");
  e.target.reset();
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerText = msg;
  container.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
