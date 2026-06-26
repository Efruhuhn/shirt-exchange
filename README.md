# 👕 Geheime Shirt-Auslosung

Wichteln, aber mit T-Shirts: Jede:r bekommt eine zufällige Person zugelost und besorgt ihr ein Shirt.
**Niemand sieht, wer wen zieht** – auch der Orga nicht. Nur jede Person erfährt über einen geheimen,
per E-Mail zugeschickten Link ihr eigenes Ziel und dessen Shirt-Größe.

## So läuft's ab

1. **Orga erstellt die Aktion** auf der Startseite → bekommt einen *Orga-Link* (privat) und einen *Beitritts-Link* (zum Teilen).
2. **Alle tragen sich ein** über den Beitritts-Link: Name, E-Mail, Shirt-Größe, Schnitt, Wünsche/No-Gos.
   Jede:r bekommt sofort eine E-Mail mit dem eigenen geheimen Link.
3. **Orga klickt „Auslosen"** → die App verlost so, dass niemand sich selbst zieht, und schickt
   automatisch allen die „Auslosung ist da"-Mail.
4. **Jede:r öffnet den eigenen Link** und sieht: *„Du besorgst ein Shirt für **Name**, Größe **M**"* – nur für die eigenen Augen. 🤫

## Lokal starten

Im Projektordner:

```bash
npm install
npm start
```

Dann im Browser **http://localhost:3000** öffnen.

## Mit Docker starten

```bash
cp .env.example .env      # Werte (BASE_URL + SMTP) eintragen
docker compose up -d --build
```

Die App läuft dann auf **http://localhost:3000** (Host-Port über `HOST_PORT` änderbar).
Die Auslosung wird im benannten Volume `shirt-data` persistent gespeichert und übersteht
Neustarts/Rebuilds. Logs ansehen: `docker compose logs -f`. Stoppen: `docker compose down`.

Ohne E-Mail-Konfiguration läuft die App im **Dry-Run**: Mails werden nicht verschickt, sondern
nur ins Terminal/Server-Log geschrieben (mit dem jeweiligen geheimen Link) – ideal zum Ausprobieren.

## E-Mail-Versand einrichten

1. `.env.example` nach `.env` kopieren.
2. SMTP-Daten eintragen. **Gmail-Beispiel:**
   - Im Google-Konto die **2-Faktor-Authentifizierung** aktivieren.
   - Unter *Sicherheit → App-Passwörter* ein **App-Passwort** erzeugen und als `SMTP_PASS` eintragen
     (nicht das normale Passwort!).
3. `BASE_URL` auf die öffentliche Adresse setzen (wichtig, damit die Links in den Mails stimmen).
4. `npm start`.

## E-Mails landen im Spam – was tun?

Die häufigste Ursache ist fehlendes **SPF, DKIM und DMARC** für die Absenderdomain. Das ist
reine DNS-Konfiguration bei deinem Mail-/Domain-Provider, kein Code-Problem:

- **SPF**-Record für die Domain hinter `MAIL_FROM` einrichten, der den SMTP-Server autorisiert.
- **DKIM** beim SMTP-Provider aktivieren (signiert die Mails kryptografisch).
- **DMARC**-Record ergänzen, sobald SPF/DKIM stehen.

Zusätzlich hilft:
- `MAIL_FROM` so setzen, dass die Domain zum SMTP-Anbieter passt (z.B. nicht über einen
  Fremd-SMTP mit einer `@gmail.com`-Absenderadresse senden – wirkt wie Spoofing).
- Einen eigenen Mail-Versanddienst (z.B. SMTP von einem Transaktionsmail-Anbieter) statt eines
  privaten Gmail-Postfachs nutzen, sobald viele Mails verschickt werden.

Im Code wurde bereits gegengesteuert: vollständiges HTML-Grundgerüst statt Fragmenten,
`Reply-To`-Header, Empfängername in der `To`-Adresse, keine Emojis mehr im Betreff, sowie
ein kleines Delay zwischen Massen-Sends.

## Online stellen (damit alle mitmachen können)

Die App ist ein normaler Node-Server und läuft auf jedem Hoster, der Node unterstützt
(z.B. **Render**, **Railway**, **Fly.io**). Faustregeln:

- Start-Befehl: `npm start`
- Umgebungsvariablen aus `.env.example` im Hoster-Dashboard setzen (v.a. `BASE_URL` + SMTP).
- Die Auslosung wird in `data/db.json` gespeichert. Für dauerhaften Betrieb ein **persistentes Volume**
  einbinden und `DATA_DIR` darauf zeigen lassen, sonst gehen die Daten beim Neustart verloren.

## Technik & Sicherheit

- **Geheimhaltung:** Wer wen zieht, wird nie in einer Übersicht angezeigt. Die Zuordnung erscheint
  ausschließlich auf der persönlichen Seite (`/p/<token>`), die nur über den per Mail verschickten,
  nicht erratbaren Token erreichbar ist. Auch die Orga-Seite zeigt sie nicht.
- **Faire Auslosung:** [Sattolo-Shuffle](https://de.wikipedia.org/wiki/Zyklische_Permutation) –
  garantiert, dass niemand sich selbst zieht.
- **Speicher:** schlanke JSON-Datei (`data/db.json`), kein Datenbank-Server nötig.
- **Abhängigkeiten:** nur `express` (Webserver) und `nodemailer` (E-Mail).

## Struktur

```
shirt-exchange/
├── server.js          # Routen / Express
├── src/
│   ├── store.js       # JSON-Speicher (Events + Teilnehmer)
│   ├── draw.js        # Auslosung (Sattolo, kein Selbst-Zug)
│   ├── mailer.js      # E-Mail-Versand (SMTP / Dry-Run)
│   └── views.js       # HTML-Seiten + E-Mail-Texte
├── public/styles.css  # Styling
├── Dockerfile         # Container-Image
├── docker-compose.yml # Container-Setup inkl. persistentem Volume
├── .env.example       # Konfigurationsvorlage
└── data/              # wird zur Laufzeit angelegt (nicht im Git)
```
