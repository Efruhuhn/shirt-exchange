# ---- Build/Runtime Image ----
FROM node:22-alpine

# Nicht als root laufen
WORKDIR /app

# Nur Manifeste zuerst kopieren -> bessere Layer-Caching-Nutzung
COPY package*.json ./
RUN npm ci --omit=dev

# App-Code
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Datenverzeichnis (wird als Volume gemountet) dem node-User geben
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

CMD ["node", "server.js"]
