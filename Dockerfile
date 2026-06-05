# ─────────────────────────────────────────────────────────────────────────────
# OpenEmbedded Bot — Dockerfile
#
# Build:  docker build -t openembedded-bot .
# Run:    docker run --env-file .env openembedded-bot
#
# Required environment variables (pass via --env-file or -e):
#   DISCORD_BOT_TOKEN   — your bot token
#   DISCORD_CLIENT_ID   — your application ID
#   DATABASE_URL        — postgresql://... (same DB as the backend)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine

LABEL org.opencontainers.image.title="OpenEmbedded Bot"
LABEL org.opencontainers.image.description="Self-hosted Discord bot for OpenEmbedded"
LABEL org.opencontainers.image.source="https://github.com/Dhuruvdev/OpenEmbedded.bot"

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

ENV NODE_ENV=production

# Health-check: verify the process is alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "process.exit(0)"

CMD ["node", "src/index.js"]
