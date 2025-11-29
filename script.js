const resultsEl = document.querySelector('#results');
const favListEl = document.querySelector('#favoritesList');
const profileEl = document.querySelector('#profile');
const statsEl = document.querySelector('#stats');

const KEYS = { PREF: 'prefs', FAVS: 'favs', HISTORY: 'history' };

const load = (k, fallback) => JSON.parse(localStorage.getItem(k)) ?? fallback;
const save = (k, val) => localStorage.setItem(k, JSON.stringify(val));

// ---------- Fetch books ----------
async function fetchBooks(q) {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20`
    );
    const data = await res.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

// ---------- Render Books ----------
function renderBooks(list) {
  resultsEl.innerHTML = '';

  if (!list.length) {
    resultsEl.innerHTML = `<div class="card">No books found</div>`;
    return;
  }

  list.forEach(b => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <strong>${b.title}</strong>
      <div class="meta">${b.author_name?.join(', ') || 'Unknown author'}</div>
      <div class="meta">${b.first_publish_year ? 'First published: ' + b.first_publish_year : ''}</div>
    `;

    if (b.cover_i) {
      const img = document.createElement('img');
      img.src = `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`;
      img.style.width = '100%';
      img.style.borderRadius = '6px';
      card.prepend(img);
    }

    const btn = document.createElement('button');
    btn.textContent = 'Add to favorites';
    btn.onclick = () => addFav(b);

    card.appendChild(btn);
    resultsEl.appendChild(card);
  });
}

// ---------- Favorites ----------
function addFav(book) {
  const favs = load(KEYS.FAVS, []);
  if (favs.some(f => f.key === book.key)) return alert('Already added');
  favs.push(book);
  save(KEYS.FAVS, favs);
  renderFavs();
}

function removeFav(key) {
  const favs = load(KEYS.FAVS, []).filter(f => f.key !== key);
  save(KEYS.FAVS, favs);
  renderFavs();
}

function renderFavs() {
  const favs = load(KEYS.FAVS, []);
  favListEl.innerHTML = favs.length ? '' : `<div class="small">No favorites yet</div>`;

  favs.forEach(b => {
    const c = document.createElement('div');
    c.className = 'card small';
    c.innerHTML = `
      <strong>${b.title}</strong>
      <div class="meta">${b.author_name?.join(', ') || ''}</div>
    `;

    const rm = document.createElement('button');
    rm.textContent = 'Remove';
    rm.onclick = () => removeFav(b.key);
    c.appendChild(rm);

    favListEl.appendChild(c);
  });
}

// ---------- Stats (Top searches only) ----------
function updateStats() {
  const h = load(KEYS.HISTORY, []);

  const freq = h.reduce((acc, v) => {
    v = v.toLowerCase();
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, num]) => `${word} (${num})`)
    .join(', ') || '-';

  statsEl.innerHTML = `
    <div class="small">Top searches: <span class="badge">${top}</span></div>
  `;
}

// ---------- Profile ----------
function renderProfile() {
  const p = load(KEYS.PREF, null);

  profileEl.innerHTML = p
    ? `
        <strong>${p.name}</strong>
        <div class="meta">Preferred genre: ${p.genre}</div>
      `
    : 'No profile saved';
}

// ---------- Events ----------
document.querySelector('#prefsForm').onsubmit = (e) => {
  e.preventDefault();
  const name = document.querySelector('#userName').value.trim();
  const genre = document.querySelector('#prefGenre').value;
  if (!name || !genre) return alert('Fill both fields');

  save(KEYS.PREF, { name, genre });
  renderProfile();
  alert('Saved!');
};

document.querySelector('#searchBtn').onclick = async () => {
  const q = document.querySelector('#searchInput').value.trim();
  if (!q) return alert('Enter a search term');

  const history = load(KEYS.HISTORY, []);
  history.push(q);
  save(KEYS.HISTORY, history);
  updateStats();

  const books = await fetchBooks(q);

  const filter = document.querySelector('#filterSelect').value;
  const filtered = filter === 'hasCover'
    ? books.filter(b => b.cover_i)
    : books;

  const clean = filtered.map(b => ({
    key: b.key,
    title: b.title,
    author_name: b.author_name,
    first_publish_year: b.first_publish_year,
    cover_i: b.cover_i
  }));

  renderBooks(clean);
};

document.querySelector('#filterSelect').onchange = () => {
  if (document.querySelector('#searchInput').value.trim())
    document.querySelector('#searchBtn').click();
};

document.querySelector('#randomRec').onclick = () => {
  const p = load(KEYS.PREF, null);
  const fallback = ['fiction', 'fantasy', 'romance', 'history', 'science'];

  const term = p?.genre || fallback[Math.floor(Math.random() * fallback.length)];
  document.querySelector('#searchInput').value = term;
  document.querySelector('#searchBtn').click();
};

document.querySelector('#showFavs').onclick = () => {
  const favs = load(KEYS.FAVS, []);
  if (!favs.length) return alert('No favorites yet');
  renderBooks(favs);
};

// ---------- Init ----------
function init() {
  renderProfile();
  renderFavs();
  updateStats();

  const p = load(KEYS.PREF, null);
  if (p) {
    document.querySelector('#userName').value = p.name;
    document.querySelector('#prefGenre').value = p.genre;
  }
}

init();