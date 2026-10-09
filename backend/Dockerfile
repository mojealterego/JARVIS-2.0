FROM node:24-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && mkdir -p /app/data && chown node:node /app/data
COPY server.mjs ./
COPY src ./src
COPY db ./db

ENV NODE_ENV=production
ENV PORT=8787
ENV JARVIS_STATE_FILE=/app/data/jarvis-state.json
USER node
EXPOSE 8787
VOLUME ["/app/data"]
CMD ["node", "server.mjs"]
