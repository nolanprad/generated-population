/* ============================================================
   timeline.js — frises chronologiques des individus échantillonnés
   Couleurs par canton (cohérentes Residence/Work) + légende par individu.
   Labels education lisibles. Double graduation âge / année.
   ============================================================ */

const TL = {
  colors: {
    education: '#2c5f6f',
    licence:   '#b8860b',
    neutral:   '#9a948a',
    grid:      '#d8d3c7',
  },
  cantonPalette: [
    '#d50032', '#2c5f6f', '#e8a33d', '#5b8c5a', '#7d5ba6',
    '#c1666b', '#3a7ca5', '#d68c45', '#6b8e23', '#8a6d3b',
  ],
  rowH: 26, gap: 8, padL: 60, padR: 16, padT: 26, padB: 26, legendH: 24,
};

const EDU_EVENT = {
  MandatoryEduc: 'Primary education',
  SecondaryEduc: 'Secondary education',
  TertiaryEduc:  'Tertiary education',
};
const EDU_INST = { HES_HEP: 'HES or HEP', UNI_EPF: 'University or EPF' };
const EDU_PATH = { ASE: 'Academic', PSE: 'Vocational' };

function eduLabel(e) { return EDU_EVENT[e.event] || e.event || 'Education'; }
function eduTooltip(e) {
  const parts = [EDU_EVENT[e.event] || e.event || 'Education'];
  if (e.pathway && EDU_PATH[e.pathway]) parts.push(EDU_PATH[e.pathway]);
  if (e.institution) parts.push(EDU_INST[e.institution] || e.institution);
  if (e.level) parts.push(e.level);
  if (e.title) parts.push(e.title);
  parts.push(`${e.year_start}–${e.year_end}`);
  return parts.join(' · ');
}

function buildCantonColors(person) {
  const order = [];
  const add = c => { if (c && !order.includes(c)) order.push(c); };
  person.residence.forEach(s => add(s.canton));
  person.events.forEach(e => { if (e.kind === 'work') add(e.place_work); });
  const map = {};
  order.forEach((c, i) => { map[c] = TL.cantonPalette[i % TL.cantonPalette.length]; });
  return map;
}

function tlScale(ageMax, width) {
  const x0 = TL.padL, x1 = width - TL.padR;
  return age => x0 + (age / ageMax) * (x1 - x0);
}

const NS = 'http://www.w3.org/2000/svg';

function tlAxis(svg, ageMax, birthYear, width, height) {
  const x = tlScale(ageMax, width);
  for (let a = 0; a <= ageMax; a += 10) {
    const xa = x(a);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', xa); line.setAttribute('x2', xa);
    line.setAttribute('y1', TL.padT); line.setAttribute('y2', height - TL.padB);
    line.setAttribute('stroke', TL.colors.grid); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    const tA = document.createElementNS(NS, 'text');
    tA.setAttribute('x', xa); tA.setAttribute('y', TL.padT - 10);
    tA.setAttribute('text-anchor', 'middle'); tA.setAttribute('class', 'tl-ax tl-ax-age');
    tA.textContent = a; svg.appendChild(tA);
    const tY = document.createElementNS(NS, 'text');
    tY.setAttribute('x', xa); tY.setAttribute('y', height - TL.padB + 16);
    tY.setAttribute('text-anchor', 'middle'); tY.setAttribute('class', 'tl-ax tl-ax-year');
    tY.textContent = Math.round(birthYear + a); svg.appendChild(tY);
  }
}

function tlSegment(svg, x, y, x2, color, label, sub) {
  const w = Math.max(2, x2 - x);
  const rect = document.createElementNS(NS, 'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', y);
  rect.setAttribute('width', w); rect.setAttribute('height', TL.rowH);
  rect.setAttribute('rx', '4'); rect.setAttribute('fill', color);
  rect.setAttribute('fill-opacity', '0.9');
  const title = document.createElementNS(NS, 'title');
  title.textContent = sub ? `${label} — ${sub}` : label;
  rect.appendChild(title); svg.appendChild(rect);
  if (w > 40 && label) {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x + 7); t.setAttribute('y', y + TL.rowH / 2 + 4);
    t.setAttribute('class', 'tl-seg-label'); t.textContent = label;
    svg.appendChild(t);
  }
}

function tlMarker(svg, x, y, color, label) {
  const r = document.createElementNS(NS, 'circle');
  r.setAttribute('cx', x); r.setAttribute('cy', y + TL.rowH / 2);
  r.setAttribute('r', '7'); r.setAttribute('fill', color);
  r.setAttribute('stroke', '#fff'); r.setAttribute('stroke-width', '1.5');
  const title = document.createElementNS(NS, 'title');
  title.textContent = label; r.appendChild(title); svg.appendChild(r);
}

function tlRowLabel(svg, y, text) {
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', 6); t.setAttribute('y', y + TL.rowH / 2 + 4);
  t.setAttribute('class', 'tl-row-label'); t.textContent = text;
  svg.appendChild(t);
}

function tlLegend(svg, colorMap, y) {
  const entries = Object.entries(colorMap);
  if (!entries.length) return;
  let x = TL.padL;
  const swatch = 11, gap = 6, itemGap = 18;
  entries.forEach(([canton, color]) => {
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', swatch); rect.setAttribute('height', swatch);
    rect.setAttribute('rx', '2'); rect.setAttribute('fill', color);
    svg.appendChild(rect);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x + swatch + gap); t.setAttribute('y', y + swatch - 1);
    t.setAttribute('class', 'tl-legend-label'); t.textContent = canton;
    svg.appendChild(t);
    x += swatch + gap + canton.length * 7 + itemGap;
  });
}

function makeSVG(width, height) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%'); svg.setAttribute('class', 'tl-svg');
  return svg;
}

function drawResidence(person, width, colorMap) {
  const ageMax = Math.ceil(person.lifespan || 90);
  const height = TL.padT + TL.rowH + TL.padB + TL.legendH;
  const svg = makeSVG(width, height);
  tlAxis(svg, ageMax, person.birth_year, width, height - TL.legendH);
  const x = tlScale(ageMax, width);
  const y = TL.padT;
  tlRowLabel(svg, y, 'Home');
  person.residence.forEach(s => {
    const col = colorMap[s.canton] || TL.colors.neutral;
    tlSegment(svg, x(s.age_start), y, x(s.age_end), col,
      s.canton || '', `${s.year_start}–${s.year_end}`);
  });
  tlLegend(svg, colorMap, height - TL.legendH + 6);
  return svg;
}

function drawLife(person, width, colorMap) {
  const ageMax = Math.ceil(person.lifespan || 90);
  const height = TL.padT + 3 * (TL.rowH + TL.gap) + TL.padB;
  const svg = makeSVG(width, height);
  tlAxis(svg, ageMax, person.birth_year, width, height);
  const x = tlScale(ageMax, width);
  const yEdu = TL.padT;
  const yWork = TL.padT + (TL.rowH + TL.gap);
  const yLic = TL.padT + 2 * (TL.rowH + TL.gap);
  tlRowLabel(svg, yEdu, 'Edu');
  tlRowLabel(svg, yWork, 'Work');
  tlRowLabel(svg, yLic, 'Licence');
  person.events.forEach(e => {
    if (e.kind === 'education') {
      tlSegment(svg, x(e.age_start), yEdu, x(e.age_end), TL.colors.education,
        eduLabel(e), eduTooltip(e));
    } else if (e.kind === 'work') {
      const col = colorMap[e.place_work] || TL.colors.neutral;
      const sub = e.income
        ? `${e.place_work || ''} · ${e.income.toLocaleString('fr-CH')} CHF · ${e.year_start}–${e.year_end}`
        : `${e.place_work || ''} · ${e.year_start}–${e.year_end}`;
      tlSegment(svg, x(e.age_start), yWork, x(e.age_end), col, e.place_work || 'Work', sub);
    } else if (e.kind === 'licence' && e.obtained_age != null) {
      tlMarker(svg, x(e.obtained_age), yLic, TL.colors.licence,
        `Driving licence obtained at age ${Math.round(e.obtained_age)} (${Math.round(e.obtained_year)})`);
    }
  });
  return svg;
}

async function initTimelines() {
  const mount = document.getElementById('timelines');
  if (!mount) return;
  let data;
  try {
    const res = await fetch('data/sample_10.json');
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (e) {
    mount.innerHTML = `<p class="csv-empty">Sample not loaded. Generate <code>data/sample_10.json</code> with the notebook in <code>scripts/</code>, then view through a server or online.</p>`;
    return;
  }
  const width = 820;
  mount.innerHTML = '';
  data.people.forEach(person => {
    const colorMap = buildCantonColors(person);
    const card = document.createElement('div');
    card.className = 'tl-card';
    const head = document.createElement('div');
    head.className = 'tl-head';
    head.innerHTML = `<strong>Individual #${person.id}</strong>` +
      `<span class="tl-meta">born ${Math.round(person.birth_year)} · ${person.sex || '—'} · ` +
      `birth canton ${person.birth_canton || '—'} · lifespan ${Math.round(person.lifespan)} yrs</span>`;
    card.appendChild(head);
    const l1 = document.createElement('div');
    l1.className = 'tl-block';
    l1.innerHTML = '<span class="tl-cap">Life: education · work · licence</span>';
    l1.appendChild(drawLife(person, width, colorMap));
    card.appendChild(l1);
    const l2 = document.createElement('div');
    l2.className = 'tl-block';
    l2.innerHTML = '<span class="tl-cap">Residence</span>';
    l2.appendChild(drawResidence(person, width, colorMap));
    card.appendChild(l2);
    mount.appendChild(card);
  });
}
