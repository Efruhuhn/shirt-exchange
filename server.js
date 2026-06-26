'use strict';

const path = require('path');
const express = require('express');

const store = require('./src/store');
const { drawAssignments } = require('./src/draw');
const mailer = require('./src/mailer');
const V = require('./src/views');
const logger = require('./src/logger');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// ---------- Home / Event-Erstellung ----------

app.get('/', (req, res) => res.send(V.homePage()));

app.post('/events', (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).send(V.simplePage('Fehler', 'Fehler', 'Titel fehlt.'));
  const ev = store.createEvent({ title, wearDate: (req.body.wearDate || '').trim() });
  res.send(V.eventCreatedPage(ev, baseUrl(req)));
});

// ---------- Beitritt (Selbstbedienung) ----------

app.get('/join/:code', (req, res) => {
  const ev = store.getEventByJoin(req.params.code);
  if (!ev) return res.status(404).send(V.simplePage('Nicht gefunden', 'Ups', 'Diese Auslosung gibt es nicht.'));
  res.send(V.joinPage(ev, baseUrl(req)));
});

app.post('/join/:code', async (req, res) => {
  const ev = store.getEventByJoin(req.params.code);
  if (!ev) return res.status(404).send(V.simplePage('Nicht gefunden', 'Ups', 'Diese Auslosung gibt es nicht.'));
  if (ev.drawnAt) return res.send(V.joinPage(ev, baseUrl(req)));

  const { name, email, size, fit, notes } = req.body;
  const prefill = { name, email, size, fit, notes };

  if (!name || !name.trim()) {
    return res.status(400).send(V.joinPage(ev, baseUrl(req), { error: 'Bitte einen Namen angeben.', prefill }));
  }
  if (!isEmail(email)) {
    return res.status(400).send(V.joinPage(ev, baseUrl(req), { error: 'Bitte eine gültige E-Mail angeben.', prefill }));
  }
  if (!size || !V.SIZES.includes(size)) {
    return res.status(400).send(V.joinPage(ev, baseUrl(req), { error: 'Bitte eine Shirt-Größe auswählen.', prefill }));
  }
  if (store.findParticipantByEmail(ev.id, email)) {
    return res
      .status(400)
      .send(V.joinPage(ev, baseUrl(req), { error: 'Diese E-Mail ist schon eingetragen. Schau in deine Mails nach deinem Link.', prefill }));
  }

  const p = store.addParticipant({ eventId: ev.id, name, email, size, fit, notes });

  try {
    const mail = V.inviteEmail(p, ev, baseUrl(req));
    await mailer.sendMail({ to: p.email, toName: p.name, ...mail });
    store.updateParticipant(p.id, { inviteMailStatus: { sentAt: new Date().toISOString(), ok: true } });
  } catch (err) {
    logger.logError('Invite-Mail fehlgeschlagen', { email: p.email, error: err.message });
    store.updateParticipant(p.id, { inviteMailStatus: { sentAt: new Date().toISOString(), ok: false } });
  }

  res.send(
    V.simplePage(
      'Eingetragen',
      '✅ Du bist dabei!',
      'Wir haben dir eine E-Mail mit deinem persönlichen, geheimen Link geschickt. Sobald ausgelost wurde, erfährst du darüber dein Ziel.'
    )
  );
});

// ---------- Teilnehmer-Bereich ----------

app.get('/p/:token', (req, res) => {
  const raw = store.getParticipantByToken(req.params.token);
  if (!raw) return res.status(404).send(V.simplePage('Nicht gefunden', 'Ups', 'Dieser Link ist ungültig.'));
  const p = { ...raw };
  const ev = store.getEvent(p.eventId);
  if (ev.drawnAt && p.assignedToId) p._target = store.getParticipant(p.assignedToId);
  res.send(V.participantPage(p, ev, baseUrl(req), { saved: req.query.saved === '1' }));
});

app.post('/p/:token', (req, res) => {
  const p = store.getParticipantByToken(req.params.token);
  if (!p) return res.status(404).send(V.simplePage('Nicht gefunden', 'Ups', 'Dieser Link ist ungültig.'));
  const ev = store.getEvent(p.eventId);
  if (ev.drawnAt) return res.redirect(`/p/${p.token}`); // nach Auslosung gesperrt

  const { name, size, fit, notes } = req.body;
  store.updateParticipant(p.id, {
    name: (name || p.name).trim(),
    size: size || p.size,
    fit: fit || '',
    notes: (notes || '').trim(),
  });
  res.redirect(`/p/${p.token}?saved=1`);
});

// ---------- Orga ----------

function loadAdmin(req, res) {
  const ev = store.getEventByAdmin(req.params.adminToken);
  if (!ev) {
    res.status(404).send(V.simplePage('Nicht gefunden', 'Ups', 'Dieser Orga-Link ist ungültig.'));
    return null;
  }
  return ev;
}

app.get('/admin/:adminToken', (req, res) => {
  const ev = loadAdmin(req, res);
  if (!ev) return;
  const participants = store.participantsByEvent(ev.id);
  res.send(
    V.adminPage(ev, participants, baseUrl(req), {
      mailConfigured: mailer.isConfigured(),
      message: req.query.msg,
    })
  );
});

app.post('/admin/:adminToken/draw', async (req, res) => {
  const ev = loadAdmin(req, res);
  if (!ev) return;
  if (ev.drawnAt) return res.redirect(`/admin/${ev.adminToken}`);

  const participants = store.participantsByEvent(ev.id);
  if (participants.length < 3) {
    return res.send(
      V.adminPage(ev, participants, baseUrl(req), {
        mailConfigured: mailer.isConfigured(),
        message: 'Mindestens 3 Teilnehmer:innen nötig.',
      })
    );
  }

  const pairs = drawAssignments(participants.map((p) => p.id));
  store.setAssignments(pairs);
  store.markDrawn(ev.id);

  const refreshed = store.getEvent(ev.id);
  let sent = 0;
  for (const p of participants) {
    try {
      const mail = V.drawEmail(p, refreshed, baseUrl(req));
      await mailer.sendMail({ to: p.email, toName: p.name, ...mail });
      store.updateParticipant(p.id, { drawMailStatus: { sentAt: new Date().toISOString(), ok: true } });
      sent++;
    } catch (err) {
      logger.logError('Auslosungs-Mail fehlgeschlagen', { email: p.email, error: err.message });
      store.updateParticipant(p.id, { drawMailStatus: { sentAt: new Date().toISOString(), ok: false } });
    }
    await mailer.delay(200);
  }

  res.send(
    V.adminPage(refreshed, store.participantsByEvent(ev.id), baseUrl(req), {
      mailConfigured: mailer.isConfigured(),
      message: `Ausgelost! ${sent} E-Mail(s) verschickt.`,
    })
  );
});

app.post('/admin/:adminToken/resend', async (req, res) => {
  const ev = loadAdmin(req, res);
  if (!ev) return;
  if (!ev.drawnAt) return res.redirect(`/admin/${ev.adminToken}`);

  const participants = store.participantsByEvent(ev.id);
  let sent = 0;
  for (const p of participants) {
    try {
      await mailer.sendMail({ to: p.email, toName: p.name, ...V.drawEmail(p, ev, baseUrl(req)) });
      store.updateParticipant(p.id, { drawMailStatus: { sentAt: new Date().toISOString(), ok: true } });
      sent++;
    } catch (err) {
      logger.logError('Resend fehlgeschlagen', { email: p.email, error: err.message });
      store.updateParticipant(p.id, { drawMailStatus: { sentAt: new Date().toISOString(), ok: false } });
    }
    await mailer.delay(200);
  }
  res.redirect(`/admin/${ev.adminToken}?msg=${encodeURIComponent(`${sent} Auslosungs-Mail(s) erneut verschickt.`)}`);
});

app.post('/admin/:adminToken/resend-one/:participantId', async (req, res) => {
  const ev = loadAdmin(req, res);
  if (!ev) return;

  const p = store.getParticipant(req.params.participantId);
  if (!p || p.eventId !== ev.id) return res.redirect(`/admin/${ev.adminToken}`);

  let message;
  try {
    if (ev.drawnAt) {
      await mailer.sendMail({ to: p.email, toName: p.name, ...V.drawEmail(p, ev, baseUrl(req)) });
      store.updateParticipant(p.id, { drawMailStatus: { sentAt: new Date().toISOString(), ok: true } });
    } else {
      await mailer.sendMail({ to: p.email, toName: p.name, ...V.inviteEmail(p, ev, baseUrl(req)) });
      store.updateParticipant(p.id, { inviteMailStatus: { sentAt: new Date().toISOString(), ok: true } });
    }
    message = `E-Mail an ${p.name} erneut verschickt.`;
  } catch (err) {
    logger.logError('Einzel-Resend fehlgeschlagen', { email: p.email, error: err.message });
    store.updateParticipant(
      p.id,
      ev.drawnAt
        ? { drawMailStatus: { sentAt: new Date().toISOString(), ok: false } }
        : { inviteMailStatus: { sentAt: new Date().toISOString(), ok: false } }
    );
    message = `E-Mail an ${p.name} fehlgeschlagen: ${err.message}`;
  }

  res.redirect(`/admin/${ev.adminToken}?msg=${encodeURIComponent(message)}`);
});

app.post('/admin/:adminToken/remove/:participantId', (req, res) => {
  const ev = loadAdmin(req, res);
  if (!ev) return;
  if (ev.drawnAt) return res.redirect(`/admin/${ev.adminToken}`);

  const p = store.getParticipant(req.params.participantId);
  if (!p || p.eventId !== ev.id) return res.redirect(`/admin/${ev.adminToken}`);

  store.removeParticipant(p.id);

  res.send(
    V.adminPage(ev, store.participantsByEvent(ev.id), baseUrl(req), {
      mailConfigured: mailer.isConfigured(),
      message: `${p.name} wurde entfernt.`,
    })
  );
});

app.use((err, req, res, next) => {
  logger.logError('Unbehandelter Fehler', { path: req.path, error: err.message });
  res.status(500).send(V.simplePage('Fehler', 'Ups', 'Da ist etwas schiefgelaufen.'));
});

app.listen(PORT, () => {
  console.log(`\n👕 Shirt-Auslosung läuft auf http://localhost:${PORT}`);
  console.log(`   E-Mail-Versand: ${mailer.isConfigured() ? 'aktiv (SMTP)' : 'DRY-RUN (nur Server-Log)'}\n`);
});
