'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

function ensure() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}
ensure();

function write(level, msg, meta) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta } : {}),
  });
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function logInfo(msg, meta) {
  console.log(msg, meta || '');
  write('info', msg, meta);
}

function logError(msg, meta) {
  console.error(msg, meta || '');
  write('error', msg, meta);
}

module.exports = { logInfo, logError };
