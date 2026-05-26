/* ============================================================
   timeline.js — frises chronologiques des individus échantillonnés
   Lit data/sample_10.json et dessine, par individu :
     - une frise Résidence (cantons dans le temps)
     - une frise "le reste" (études, permis, emploi + salaire/lieu)
   Double graduation : âge (en haut) et année calendaire (en bas).
   ============================================================ */

const TL = {
  colors: {
    work:      '#d50032',
    education: '#2c5f6f',
    licence:   '#b8860b',
    residence: '#4a8a7a',
    axis:      '#8a857a',
    grid:      '#d8d3c7',
    ink:       '#1a1a1a',
    soft:      '#4a4843',
  },
  rowH: 26,        // hauteur d'une piste
  gap: 8,          // espace entre pistes
  padL: 54,        // marge gauche (labels)
  padR: 16,
  padT: 26,        // marge haut (axe âge)
  padB: 26,        // marge bas (axe année)
};

function tlScale(ageMax, width) {
  const x0 = TL.padL, x1 = width - TL.padR;
  return age => x0 + (age / ageMax) * (x1 - x0);
}

function tlAxis(svg, ageMax, birthYear, width, height) {
  const x = tlScale(ageMax, width);
  const ns = 'http://www.w3.org/2000/svg';
  // graduations tous les 10 ans
  for (let a = 0; a <= ageMax; a += 10) {
    const xa = x(a);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', xa); line.setAttribute('x2', xa);
    line.setAttribute('y1', TL.padT); line.setAttribute('y2', height - TL.padB);
    line.setAttribute('stroke', TL.colors.grid); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    // âge en haut
    const tA = document.createElementNS(ns, 'text');
    tA.setAttribute('x', xa); tA.setAttribute('y', TL.padT - 10);
    tA.setAttribute('text-anchor', 'middle'); tA.setAttribute('class', 'tl-ax tl-ax-age');
    tA.textContent = a;
    svg.appendChild(tA);
    // année en bas
    const tY = document.createElementNS(ns, 'text');
    tY.setAttribute('x', xa); tY.setAttribute('y', height - TL.padB + 16);
    tY.setAttribute('text-anchor', 'middle'); tY.setAttribute('class', 'tl-ax tl-ax-year');
    tY.textContent = Math.round(birthYear + a);
    svg.appendChild(tY);
  }
}

function tlSegment(svg, x, y, x2, color, label, sub) {
  const ns = 'http://www.w3.org/2000/svg';
  const w = Math.max(2, x2 - x);
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', y);
  rect.setAttribute('width', w); rect.setAttribute('height', TL.rowH);
  rect.setAttribute('rx', '4'); rect.setAttribute('fill', color);
  rect.setAttribute('fill-opacity', '0.85');
  const title = document.createElementNS(ns, 'title');
  title.textContent = sub ? `${label} — ${sub}` : label;
  rect.appendChild(title);
  svg.appendChild(rect);
  // label dans le segment si assez large
  if (w > 38 && label) {
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', x + 6); t.setAttribute('y', y + TL.rowH / 2 + 4);
    t.setAttribute('class', 'tl-seg-label');
    t.textContent = label;
    svg.appendChild(t);
  }
}

function tlMarker(svg, x, y, color, label) {
  const ns = 'http://www.w3.org/2000/svg';
  const r = document.createElementNS(ns, 'circle');
  r.setAttribute('cx', x); r.setAttribute('cy', y + TL.rowH / 2);
  r.setAttribute('r', '6'); r.setAttribute('fill', color);
  const title = document.createElementNS(ns, 'title');
  title.textContent = label;
  r.appendChild(title);
  svg.appendChild(r);
}

function tlRowLabel(svg, y, text) {
  const ns = 'http://www.w3.org/2000/svg';
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', 6); t.setAttribute('y', y + TL.rowH / 2 + 4);
  t.setAttribute('class', 'tl-row-label');
  t.textContent = text;
  svg.appendChild(t);
}

function makeSVG(width, height) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('class', 'tl-svg');
  return svg;
}

function drawResidence(person, width) {
  const ageMax = Math.ceil(person.lifespan || 90);
  const height = TL.padT + TL.rowH + TL.padB;
  const svg = makeSVG(width, height);
  tlAxis(svg, ageMax, person.birth_year, width, height);
  const x = tlScale(ageMax, width);
  const y = TL.padT;
  tlRowLabel(svg, y, 'Home');
  person.residence.forEach(s => {
    tlSegment(svg, x(s.age_start), y, x(s.age_end), TL.colors.residence,
      s.canton || '', `${s.year_start}–${s.year_end}`);
  });
  return svg;
}

function drawLife(person, width) {
  const ageMax = Math.ceil(person.lifespan || 90);
  // pistes : Education, Work, et un marqueur Licence sur sa propre ligne
  const rows = ['Education', 'Work', 'Licence'];
  const height = TL.padT + rows.length * (TL.rowH + TL.gap) + TL.padB;
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
      const lbl = [e.institution, e.title].filter(Boolean).join(' · ') || 'Education';
      tlSegment(svg, x(e.age_start), yEdu, x(e.age_end), TL.colors.education,
        e.institution || 'Edu', lbl);
    } else if (e.kind === 'work') {
      const lbl = e.place_work || 'Work';
      const sub = e.income ? `${e.place_work || ''} · ${e.income.toLocaleString('fr-CH')} CHF` : e.place_work;
      tlSegment(svg, x(e.age_start), yWork, x(e.age_end), TL.colors.work, lbl, sub);
    } else if (e.kind === 'licence' && e.obtained_age != null) {
      tlMarker(svg, x(e.obtained_age), yLic, TL.colors.licence,
        `Licence obtained at age ${Math.round(e.obtained_age)} (${Math.round(e.obtained_year)})`);
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
    mount.innerHTML = `<p class="csv-empty">Sample not loaded. Generate <code>data/sample_10.json</code> with <code>scripts/make_sample.py</code>, then view the site through a local server or online.</p>`;
    return;
  }

  const width = 820;
  mount.innerHTML = '';
  data.people.forEach(person => {
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
    l1.appendChild(drawLife(person, width));
    card.appendChild(l1);

    const l2 = document.createElement('div');
    l2.className = 'tl-block';
    l2.innerHTML = '<span class="tl-cap">Residence</span>';
    l2.appendChild(drawResidence(person, width));
    card.appendChild(l2);

    mount.appendChild(card);
  });
}
