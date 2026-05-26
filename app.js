/* ============================================================
   app.js — chargement des onglets (fragments) + nav + galerie + CSV
   ============================================================ */

/* ------------------------------------------------------------
   CONFIG — CSV chargé automatiquement depuis data/ (site en ligne).
   Pour l'instant un seul fichier. Changez le chemin/titre si besoin.
   ------------------------------------------------------------ */
const CSV_FILES = [
  { file: "data/results.csv", title: "Résultats" },
];

/* ============================================================
   1) CHARGEMENT DES FRAGMENTS D'ONGLETS
   Chaque <section data-src="tabs/x.html"> reçoit son contenu.
   On attend que tout soit injecté avant d'initialiser le reste.
   ============================================================ */
async function loadTabs() {
  const sections = document.querySelectorAll('.panel[data-src]');
  await Promise.all([...sections].map(async (sec) => {
    try {
      const res = await fetch(sec.dataset.src);
      if (!res.ok) throw new Error(res.status);
      sec.innerHTML = await res.text();
    } catch (e) {
      sec.innerHTML = `<div class="results-banner"><p><strong>Onglet non chargé.</strong> Impossible de charger <code>${sec.dataset.src}</code>. En local, ouvrez le site via un serveur (<code>python3 -m http.server</code>) plutôt qu'en double-clic.</p></div>`;
      console.warn(`Fragment non chargé : ${sec.dataset.src}`, e);
    }
  }));
}

/* ============================================================
   2) NAVIGATION PAR ONGLETS
   ============================================================ */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('is-active', t === tab));
      panels.forEach(p => p.classList.toggle('is-active', p.id === target));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   3) GALERIE PNG — emplacements vides
   ============================================================ */
function initGallery() {
  document.querySelectorAll('.gallery img').forEach(img => {
    const showPlaceholder = () => {
      img.classList.add('missing');
      const fig = img.closest('figure');
      if (fig && !fig.querySelector('.ph-label')) {
        const label = document.createElement('span');
        label.className = 'ph-label';
        label.textContent = img.dataset.ph || img.getAttribute('src') || 'img/…';
        img.insertAdjacentElement('afterend', label);
      }
    };
    if (!img.getAttribute('src')) showPlaceholder();
    img.addEventListener('error', showPlaceholder);
    img.addEventListener('load', () => {
      if (img.getAttribute('src')) {
        img.classList.remove('missing');
        const lbl = img.closest('figure')?.querySelector('.ph-label');
        if (lbl) lbl.remove();
      }
    });
  });
}

/* ============================================================
   4) CSV — parseur (séparateur auto), rendu, chargement, upload
   ============================================================ */
function detectDelimiter(sample) {
  const firstLine = sample.split(/\r?\n/)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  return Object.keys(counts).reduce((a, b) => counts[b] > counts[a] ? b : a, ',');
}

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const delim = detectDelimiter(text);
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* géré par \n */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function renderTable(rows, title) {
  if (!rows.length) return;
  const container = document.getElementById('csvTables');
  if (!container) return;

  const block = document.createElement('div');
  block.className = 'csv-block';

  const [header, ...body] = rows;

  if (title) {
    const h = document.createElement('h3');
    h.className = 'csv-title';
    h.textContent = title;
    block.appendChild(h);
  }

  // Méta : nombre de lignes / colonnes
  const meta = document.createElement('p');
  meta.className = 'csv-meta';
  meta.textContent = `${body.length.toLocaleString('fr-CH')} rows · ${header.length} columns`;
  block.appendChild(meta);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  header.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.trim();
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  wrap.appendChild(table);
  block.appendChild(wrap);

  // ---------- Pagination (pour gros CSV, ex. 100 000 lignes) ----------
  const PAGE = 50;
  let page = 0;
  const pageCount = Math.max(1, Math.ceil(body.length / PAGE));

  const nav = document.createElement('div');
  nav.className = 'csv-pager';
  const prev = document.createElement('button');
  prev.className = 'pager-btn'; prev.textContent = '← Prev';
  const next = document.createElement('button');
  next.className = 'pager-btn'; next.textContent = 'Next →';
  const label = document.createElement('span');
  label.className = 'pager-label';
  nav.appendChild(prev); nav.appendChild(label); nav.appendChild(next);

  function renderPage() {
    tbody.innerHTML = '';
    const start = page * PAGE;
    const slice = body.slice(start, start + PAGE);
    const frag = document.createDocumentFragment();
    slice.forEach(r => {
      const tr = document.createElement('tr');
      header.forEach((_, j) => {
        const td = document.createElement('td');
        td.textContent = (r[j] ?? '').trim();
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    label.textContent = `Page ${page + 1} / ${pageCount}  ·  rows ${start + 1}–${Math.min(start + PAGE, body.length)}`;
    prev.disabled = page === 0;
    next.disabled = page >= pageCount - 1;
  }
  prev.addEventListener('click', () => { if (page > 0) { page--; renderPage(); } });
  next.addEventListener('click', () => { if (page < pageCount - 1) { page++; renderPage(); } });

  if (pageCount > 1) block.appendChild(nav);
  container.appendChild(block);
  renderPage();
}

function updateEmptyHint() {
  const container = document.getElementById('csvTables');
  if (!container) return;
  const hasTable = container.querySelector('.csv-block');
  let hint = document.getElementById('csvEmptyHint');
  if (!hasTable) {
    if (!hint) {
      hint = document.createElement('p');
      hint.id = 'csvEmptyHint';
      hint.className = 'csv-empty';
      hint.textContent = "Aucun tableau chargé pour l'instant. Déposez votre CSV dans data/results.csv (en ligne) ou utilisez le bouton « Charger un CSV… » ci-dessus.";
      container.appendChild(hint);
    }
  } else if (hint) {
    hint.remove();
  }
}

async function loadConfiguredCSVs() {
  for (const { file, title } of CSV_FILES) {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(res.status);
      const text = await res.text();
      renderTable(parseCSV(text), title || file.split('/').pop());
    } catch (e) {
      console.warn(`CSV non chargé : ${file}`, e);
    }
  }
  updateEmptyHint();
}

function initCSV() {
  const input = document.getElementById('csvInput');
  if (input) {
    input.addEventListener('change', (ev) => {
      const files = Array.from(ev.target.files || []);
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = () => { renderTable(parseCSV(reader.result), f.name); updateEmptyHint(); };
        reader.readAsText(f);
      });
      ev.target.value = '';
    });
  }
  loadConfiguredCSVs();
}

/* ============================================================
   DÉMARRAGE — l'ordre compte : fragments d'abord, puis le reste
   ============================================================ */
(async function start() {
  await loadTabs();   // injecte le contenu des onglets
  initTabs();         // nav
  initGallery();      // emplacements PNG
  initCSV();          // tableaux CSV
  if (typeof initTimelines === 'function') initTimelines();  // frises
})();
