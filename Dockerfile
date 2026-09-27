# Breakline's game and room server in one image (spec N1): Vite builds the game,
# rolldown the server, and the runtime keeps only the server's one dependency (ws).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG BUILD_ID=unknown
ENV BUILD_ID=$BUILD_ID
RUN npm run build && npm run build:server

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
EXPOSE 8080
CMD ["node", "dist-server/server.mjs"]
