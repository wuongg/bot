FROM node:22-slim

# better-sqlite3 needs native build on deploy
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV DATABASE_PATH=/app/data/bot.db
ENV STORAGE=sqlite

RUN mkdir -p /app/data

VOLUME ["/app/data"]

CMD ["node", "index.js"]
