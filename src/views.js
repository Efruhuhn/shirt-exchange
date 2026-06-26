'use strict';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const FITS = ['Unisex', 'Tailliert / Damen', 'Gerade / Herren'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title, body) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<main class="card">
${body}
</main>
<footer>Geheime Shirt-Auslosung 👕 · niemand sieht die Zuordnung außer dir selbst</footer>
</body>
</html>`;
}

function sizeSelect(selected) {
  const opts = SIZES.map(
    (s) => `<option value="${esc(s)}"${s === selected ? ' selected' : ''}>${esc(s)}</option>`
  ).join('');
  return `<select name="size" required>
    <option value="" ${selected ? '' : 'selected'} disabled>Bitte wählen…</option>
    ${opts}
  </select>`;
}

function fitSelect(selected) {
  const opts = FITS.map(
    (f) => `<option value="${esc(f)}"${f === selected ? ' selected' : ''}>${esc(f)}</option>`
  ).join('');
  return `<select name="fit"><option value="">egal / keine Angabe</option>${opts}</select>`;
}

function stripEmoji(s) {
  return String(s ?? '')
    .replace(
      /[\u{1F1E6}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function copyBox(url) {
  const id = `cb_${Math.random().toString(36).slice(2, 8)}`;
  return `<div class="copybox">
  <input id="${id}" readonly value="${esc(url)}" onclick="this.select()">
  <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('${id}').value).then(()=>{this.textContent='✓ Kopiert';setTimeout(()=>this.textContent='Kopieren',2000)})">Kopieren</button>
</div>`;
}

// ---------- Seiten ----------

function homePage() {
  return layout(
    'Shirt-Auslosung erstellen',
    `<h1>👕 Geheime Shirt-Auslosung</h1>
<p class="lead">Wichteln, aber mit Shirts: Jede:r bekommt eine Person zugelost und besorgt ihr ein T-Shirt.
Niemand sieht, wer wen zieht – auch der Orga nicht. Nur du selbst erfährst per E-Mail dein Ziel und dessen Größe.</p>
<form method="post" action="/events">
  <label>Titel der Aktion
    <input type="text" name="title" placeholder="z.B. Hurricane Shirt-Tausch" required>
  </label>
  <label>Wann wird das Shirt getragen? <span class="muted">(optional)</span>
    <input type="text" name="wearDate" placeholder="z.B. Samstag am Festival">
  </label>
  <button type="submit">Auslosung erstellen</button>
</form>
<p class="muted small">Du bekommst danach einen <strong>Orga-Link</strong> (für dich) und einen <strong>Beitritts-Link</strong>
(den teilst du in der Gruppe, damit sich alle eintragen).</p>`
  );
}

function eventCreatedPage(ev, baseUrl) {
  const adminUrl = `${baseUrl}/admin/${ev.adminToken}`;
  const joinUrl = `${baseUrl}/join/${ev.joinCode}`;
  return layout(
    'Auslosung erstellt',
    `<h1>✅ Auslosung erstellt!</h1>
<p>Bewahre diese beiden Links gut auf:</p>

<h2>🔧 Dein Orga-Link <span class="muted small">(nur für dich!)</span></h2>
${copyBox(adminUrl)}
<p class="muted small">Hier verwaltest du die Aktion und startest die Auslosung. Nicht weitergeben.</p>

<h2>📨 Beitritts-Link <span class="muted small">(in die Gruppe teilen)</span></h2>
${copyBox(joinUrl)}
<p class="muted small">Über diesen Link tragen sich alle mit Name, E-Mail und Shirt-Größe ein.</p>

<p><a class="btn" href="${esc(adminUrl)}">Weiter zur Orga-Seite →</a></p>`
  );
}

function joinPage(ev, baseUrl, { error, prefill } = {}) {
  if (ev.drawnAt) {
    return layout(
      'Bereits ausgelost',
      `<h1>${esc(ev.title)}</h1>
<p class="lead">Diese Auslosung wurde bereits durchgeführt – eine Anmeldung ist nicht mehr möglich.</p>
<p class="muted">Du bist schon dabei? Dann schau in deine E-Mails: Dort ist dein persönlicher Link mit deinem Ziel.</p>`
    );
  }
  return layout(
    `Mitmachen: ${ev.title}`,
    `<h1>👕 ${esc(ev.title)}</h1>
<p class="lead">Trag dich ein – du bekommst danach eine E-Mail mit deinem persönlichen Link.
Nach der Auslosung erfährst du darüber, <strong>wen</strong> du beschenkst und welche <strong>Größe</strong> die Person hat.</p>
${error ? `<p class="error">${esc(error)}</p>` : ''}
<form method="post" action="/join/${esc(ev.joinCode)}">
  <label>Name <input type="text" name="name" required value="${esc(prefill?.name || '')}"></label>
  <label>E-Mail <input type="email" name="email" required value="${esc(prefill?.email || '')}"
    placeholder="für deinen geheimen Link"></label>
  <label>Deine Shirt-Größe ${sizeSelect(prefill?.size)}</label>
  <label>Schnitt / Passform ${fitSelect(prefill?.fit)}</label>
  <label>Wünsche &amp; No-Gos <span class="muted">(optional)</span>
    <textarea name="notes" rows="3" placeholder="z.B. Lieblingsfarbe schwarz, keine engen Schnitte, ...">${esc(prefill?.notes || '')}</textarea>
  </label>
  <button type="submit">Eintragen</button>
</form>
<div class="rules">
  <strong>Spielregeln 😬</strong>
  <ul>
    <li>Nichts Rassistisches, Faschistisches o.ä. – versteht sich von selbst.</li>
    <li>Das geschenkte Shirt wird einen Tag lang von allen getragen!</li>
  </ul>
</div>`
  );
}

function participantPage(p, ev, baseUrl, { saved } = {}) {
  const target = p._target; // optional eingehängt
  let assignmentBlock = '';
  if (ev.drawnAt && target) {
    assignmentBlock = `
<div class="reveal">
  <div class="reveal-label">🎁 Du besorgst ein Shirt für</div>
  <div class="reveal-name">${esc(target.name)}</div>
  <table class="kv">
    <tr><th>Größe</th><td><strong>${esc(target.size || '—')}</strong></td></tr>
    <tr><th>Schnitt</th><td>${esc(target.fit || 'egal')}</td></tr>
    ${target.notes ? `<tr><th>Wünsche / No-Gos</th><td>${esc(target.notes)}</td></tr>` : ''}
  </table>
  <p class="muted small">Psst – das sieht nur du. ${esc(target.name)} weiß nicht, dass du es bist. 🤫</p>
</div>`;
  } else if (ev.drawnAt && !target) {
    assignmentBlock = `<p class="muted">Es wurde ausgelost, aber dir ist noch nichts zugeordnet. Melde dich beim Orga.</p>`;
  } else {
    assignmentBlock = `<div class="pending">⏳ Es wurde noch nicht ausgelost. Sobald es so weit ist,
      bekommst du eine E-Mail und siehst hier, wen du beschenkst.</div>`;
  }

  const locked = !!ev.drawnAt;
  const form = locked
    ? `<p class="muted small">Nach der Auslosung können die Angaben nicht mehr geändert werden.</p>`
    : `<form method="post" action="/p/${esc(p.token)}">
  <label>Name <input type="text" name="name" required value="${esc(p.name)}"></label>
  <label>Deine Shirt-Größe ${sizeSelect(p.size)}</label>
  <label>Schnitt / Passform ${fitSelect(p.fit)}</label>
  <label>Wünsche &amp; No-Gos <span class="muted">(optional)</span>
    <textarea name="notes" rows="3">${esc(p.notes)}</textarea>
  </label>
  <button type="submit">Speichern</button>
</form>`;

  return layout(
    `Dein Bereich: ${ev.title}`,
    `<h1>👕 ${esc(ev.title)}</h1>
<p class="lead">Hallo ${esc(p.name)}! Das ist dein persönlicher, geheimer Bereich.</p>
${saved ? `<p class="success">✅ Gespeichert.</p>` : ''}
${assignmentBlock}
<h2>Deine Angaben</h2>
${form}`
  );
}

function mailStatusBadge(status) {
  if (!status) return '<span class="muted">—</span>';
  return status.ok ? '✅' : '❌';
}

function adminPage(ev, participants, baseUrl, { mailConfigured, message } = {}) {
  const joinUrl = `${baseUrl}/join/${ev.joinCode}`;
  const rows = participants
    .map((p) => {
      const status = ev.drawnAt ? p.drawMailStatus : p.inviteMailStatus;
      const removeBtn = ev.drawnAt
        ? ''
        : `<form method="post" action="/admin/${esc(ev.adminToken)}/remove/${esc(p.id)}"
            onsubmit="return confirm('${esc(p.name)} wirklich aus der Auslosung entfernen?');">
          <button type="submit" class="secondary small-btn danger">🗑️ entfernen</button>
        </form>`;
      return `<tr>
      <td data-label="Name">${esc(p.name)}</td>
      <td data-label="E-Mail" class="email-cell">${esc(p.email)}</td>
      <td data-label="Mail-Status">${mailStatusBadge(status)}</td>
      <td data-label="Aktionen" class="actions-cell">
        <form method="post" action="/admin/${esc(ev.adminToken)}/resend-one/${esc(p.id)}">
          <button type="submit" class="secondary small-btn">✉️ erneut senden</button>
        </form>
        ${removeBtn}
      </td>
    </tr>`;
    })
    .join('');

  const canDraw = participants.length >= 3 && !ev.drawnAt;

  return layout(
    `Orga: ${ev.title}`,
    `<h1>🔧 Orga · ${esc(ev.title)}</h1>
${message ? `<p class="success">${esc(message)}</p>` : ''}
${
  mailConfigured
    ? ''
    : `<p class="warn">⚠️ Kein E-Mail-Versand konfiguriert (SMTP). Mails werden nur im Server-Log angezeigt (Dry-Run). Siehe README.</p>`
}

<h2>📨 Beitritts-Link teilen</h2>
${copyBox(joinUrl)}
<p class="muted small">Diesen Link in die Gruppe schicken, damit sich alle eintragen.</p>

<h2>👥 Teilnehmer:innen (${participants.length})</h2>
<p class="muted small"><strong>Wer wen zieht, siehst auch du nicht.</strong></p>
${
  participants.length
    ? `<div class="table-wrap"><table class="list">
  <thead><tr><th>Name</th><th>E-Mail</th><th>Mail-Status</th><th>Aktionen</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>`
    : '<p class="muted">Noch niemand eingetragen.</p>'
}

<h2>🎲 Auslosung</h2>
${
  ev.drawnAt
    ? `<p class="success">✅ Bereits ausgelost am ${esc(new Date(ev.drawnAt).toLocaleString('de-DE'))}.
       Alle haben ihre E-Mail bekommen.</p>
       <form method="post" action="/admin/${esc(ev.adminToken)}/resend">
         <button type="submit" class="secondary">Auslosungs-Mails erneut senden</button>
       </form>`
    : `<p>Wenn alle eingetragen sind, hier auslosen. Danach ist kein Beitritt mehr möglich
       und alle bekommen automatisch ihre E-Mail.</p>
       <form method="post" action="/admin/${esc(ev.adminToken)}/draw"
         onsubmit="return confirm('Jetzt endgültig auslosen und alle Mails verschicken?');">
         <button type="submit"${canDraw ? '' : ' disabled'}>🎲 Jetzt auslosen &amp; Mails senden</button>
       </form>
       ${participants.length < 3 ? '<p class="muted small">Mindestens 3 Teilnehmer:innen nötig.</p>' : ''}
       <form method="post" action="/admin/${esc(ev.adminToken)}/remind" style="margin-top:1rem">
         <button type="submit" class="secondary">Erinnerung an alle ohne Größe senden</button>
       </form>`
}`
  );
}

function simplePage(title, heading, text) {
  return layout(title, `<h1>${esc(heading)}</h1><p class="lead">${esc(text)}</p>`);
}

// ---------- E-Mail-Texte ----------

function inviteEmail(p, ev, baseUrl) {
  const url = `${baseUrl}/p/${p.token}`;
  return {
    subject: stripEmoji(`${ev.title}: Du bist dabei!`),
    html: `<p>Hallo ${esc(p.name)},</p>
<p>du machst bei <strong>${esc(ev.title)}</strong> mit. 🎉</p>
<p>Hier ist dein <strong>persönlicher, geheimer Link</strong>. Über ihn kannst du deine Größe ändern und siehst
nach der Auslosung, <strong>wen</strong> du mit einem Shirt beschenkst:</p>
<p><a href="${url}">${url}</a></p>
<p class="muted">Behalte den Link für dich – er ist dein privater Zugang.</p>
<p>Bis bald! 👕</p>`,
  };
}

function drawEmail(p, ev, baseUrl) {
  const url = `${baseUrl}/p/${p.token}`;
  return {
    subject: stripEmoji(`${ev.title}: Die Auslosung ist da!`),
    html: `<p>Hallo ${esc(p.name)},</p>
<p>es ist ausgelost! Klick auf deinen geheimen Link, um zu sehen, <strong>für wen</strong> du ein Shirt besorgst
und welche <strong>Größe</strong> die Person hat:</p>
<p><a href="${url}">${url}</a></p>
<p class="muted">Nur du siehst dein Ziel. Viel Spaß beim Aussuchen! 🤫👕</p>`,
  };
}

module.exports = {
  SIZES,
  FITS,
  esc,
  homePage,
  eventCreatedPage,
  joinPage,
  participantPage,
  adminPage,
  simplePage,
  inviteEmail,
  drawEmail,
};
