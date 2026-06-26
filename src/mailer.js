'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

const isConfigured = () => !!transporter;

// Komplettes HTML-Grundgerüst statt Fragmenten – manche Spamfilter werten
// unvollständiges HTML negativ.
function wrapHtml(html) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

async function sendMail({ to, toName, subject, html, text }) {
  const from =
    process.env.MAIL_FROM || process.env.SMTP_USER || 'shirt-tausch@example.com';
  const replyTo = process.env.MAIL_FROM || process.env.SMTP_USER || undefined;
  const recipient = toName ? `${toName} <${to}>` : to;
  const plain = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fullHtml = wrapHtml(html);

  if (!transporter) {
    // Dry-Run: ohne SMTP-Konfiguration werden Mails nur geloggt.
    // Praktisch zum Testen – die geheimen Links kann man von Hand kopieren.
    console.log('\n──────── [DRY-RUN E-MAIL] (kein SMTP konfiguriert) ────────');
    console.log('An:     ', recipient);
    console.log('Betreff:', subject);
    console.log('Inhalt: ', plain);
    console.log('───────────────────────────────────────────────────────────\n');
    logger.logInfo('Mail (dry-run)', { to, subject });
    return { dryRun: true };
  }

  try {
    const result = await transporter.sendMail({
      from,
      to: recipient,
      replyTo,
      subject,
      html: fullHtml,
      text: plain,
    });
    logger.logInfo('Mail versendet', { to, subject });
    return result;
  } catch (err) {
    logger.logError('Mail-Versand fehlgeschlagen', { to, subject, error: err.message });
    throw err;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { sendMail, isConfigured, delay };
