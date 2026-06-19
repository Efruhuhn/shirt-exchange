'use strict';

const nodemailer = require('nodemailer');

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

async function sendMail({ to, subject, html, text }) {
  const from =
    process.env.MAIL_FROM || process.env.SMTP_USER || 'shirt-tausch@example.com';
  const plain = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (!transporter) {
    // Dry-Run: ohne SMTP-Konfiguration werden Mails nur geloggt.
    // Praktisch zum Testen – die geheimen Links kann man von Hand kopieren.
    console.log('\n──────── [DRY-RUN E-MAIL] (kein SMTP konfiguriert) ────────');
    console.log('An:     ', to);
    console.log('Betreff:', subject);
    console.log('Inhalt: ', plain);
    console.log('───────────────────────────────────────────────────────────\n');
    return { dryRun: true };
  }

  return transporter.sendMail({ from, to, subject, html, text: plain });
}

module.exports = { sendMail, isConfigured };
