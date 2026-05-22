/* ============================================================
   app.js — navigation par onglets + galerie PNG + chargeur CSV
   ============================================================ */

/* ------------------------------------------------------------
   CONFIG — fichiers CSV chargés automatiquement depuis data/
   Ajoutez vos fichiers ici (ils doivent être dans le dossier data/).
   Laissez la liste vide si vous préférez tout charger via le bouton.
   ------------------------------------------------------------ */
const CSV_FILES = [
  // { file: "data/cantons.csv",  title: "Distribution cantonale" },
  // { file: "data/params.csv",   title: "Paramètres du modèle" },
];

/* ---------- Navigation par onglets ---------- */
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

/* ---------- Emplacements de plots vides ---------- */
document.querySelectorAll('.gallery img').forEach(img => {
  const showPlaceholder = () => {
    img.classList.add('missing');
    const fig = img.closest('figure');
    if (fig && !fig.querySelector('.ph-label')) {
      const label = document.createElement('span');
      label.className = 'ph-label';
      label.textContent = img.dataset.ph || 'img/…';
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

/* ============================================================
   PARSEUR CSV — détection auto du séparateur, support guillemets
   ============================================================ */
function detectDelimiter(sample) {
  const firstLine = sample.split(/\r?\n/)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  // séparateur le plus fréquent hors guillemets
  return Object.keys(counts).reduce((a, b) => counts[b] > counts[a] ? b : a, ',');
}

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');           // retire le BOM éventuel
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
      else if (c === '\r') { /* ignore, géré par \n */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // retire d'éventuelles lignes totalement vides
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

/* ---------- Rendu d'un tableau ---------- */
function renderTable(rows, title) {
  if (!rows.length) return;
  const container = document.getElementById('csvTables');

  const block = document.createElement('div');
  block.className = 'csv-block';

  if (title) {
    const h = document.createElement('h3');
    h.className = 'csv-title';
    h.textContent = title;
    block.appendChild(h);
  }

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';

  const [header, ...body] = rows;
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
  body.forEach(r => {
    const tr = document.createElement('tr');
    header.forEach((_, j) => {
      const td = document.createElement('td');
      td.textContent = (r[j] ?? '').trim();
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
  block.appendChild(wrap);
  container.appendChild(block);
}

/* ---------- Chargement auto depuis data/ ---------- */
async function loadConfiguredCSVs() {
  for (const { file, title } of CSV_FILES) {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(res.status);
      const text = await res.text();
      renderTable(parseCSV(text), title || file.split('/').pop());
    } catch (e) {
      // silencieux en local (file://) ; visible si le fichier est listé mais absent en ligne
      console.warn(`CSV non chargé : ${file}`, e);
    }
  }
}

/* ---------- Upload manuel ---------- */
document.getElementById('csvInput')?.addEventListener('change', (ev) => {
  const files = Array.from(ev.target.files || []);
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = () => renderTable(parseCSV(reader.result), f.name);
    reader.readAsText(f);
  });
  ev.target.value = ''; // permet de recharger le même fichier
});

/* lance le chargement auto au démarrage */
loadConfiguredCSVs();
