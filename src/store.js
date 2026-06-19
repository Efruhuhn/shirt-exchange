'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events: {}, participants: {} }, null, 2));
  }
}
ensure();

/** @type {{events: Object, participants: Object}} */
let db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

function save() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

const token = () => crypto.randomUUID().replace(/-/g, '');
// Kurzer, gut teilbarer Beitritts-Code (keine leicht verwechselbaren Zeichen)
const joinCode = () => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return s;
};

// ---------- Events ----------

function createEvent({ title, wearDate }) {
  const id = token();
  const ev = {
    id,
    title: title || 'Shirt-Auslosung',
    wearDate: wearDate || '',
    adminToken: token(),
    joinCode: joinCode(),
    createdAt: new Date().toISOString(),
    drawnAt: null,
  };
  db.events[id] = ev;
  save();
  return ev;
}

const getEvent = (id) => db.events[id] || null;
const getEventByAdmin = (adminToken) =>
  Object.values(db.events).find((e) => e.adminToken === adminToken) || null;
const getEventByJoin = (code) =>
  Object.values(db.events).find((e) => e.joinCode === code) || null;

function markDrawn(eventId) {
  db.events[eventId].drawnAt = new Date().toISOString();
  save();
}

// ---------- Participants ----------

function participantsByEvent(eventId) {
  return Object.values(db.participants)
    .filter((p) => p.eventId === eventId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

function findParticipantByEmail(eventId, email) {
  const e = email.trim().toLowerCase();
  return participantsByEvent(eventId).find((p) => p.email.toLowerCase() === e) || null;
}

function addParticipant({ eventId, name, email, size, fit, notes }) {
  const id = token();
  const p = {
    id,
    eventId,
    token: token(),
    name: name.trim(),
    email: email.trim(),
    size: size || '',
    fit: fit || '',
    notes: (notes || '').trim(),
    assignedToId: null,
    joinedAt: new Date().toISOString(),
  };
  db.participants[id] = p;
  save();
  return p;
}

const getParticipant = (id) => db.participants[id] || null;
const getParticipantByToken = (tok) =>
  Object.values(db.participants).find((p) => p.token === tok) || null;

function updateParticipant(id, fields) {
  Object.assign(db.participants[id], fields);
  save();
  return db.participants[id];
}

function setAssignments(pairs) {
  // pairs: [{ giverId, receiverId }]
  for (const { giverId, receiverId } of pairs) {
    db.participants[giverId].assignedToId = receiverId;
  }
  save();
}

module.exports = {
  createEvent,
  getEvent,
  getEventByAdmin,
  getEventByJoin,
  markDrawn,
  participantsByEvent,
  findParticipantByEmail,
  addParticipant,
  getParticipant,
  getParticipantByToken,
  updateParticipant,
  setAssignments,
};
