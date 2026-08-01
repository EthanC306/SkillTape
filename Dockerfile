# ---- deps: install once, reused by both the frontend build and the api ----
# Node 22, not 20: better-sqlite3's prebuilt addon requires it (its own
# package.json says node >=22). On Node 20 the ABI mismatch doesn't error
# cleanly — dlopen segfaults the moment the addon loads.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the Vite frontend to static files ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- web: nginx serving the built frontend, proxying /api to the api service ----
FROM nginx:alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ---- api: the Express server, reusing deps' already-installed node_modules ----
FROM deps AS api
COPY server ./server
# db:seed (server/seed.js) imports the curriculum straight out of src/data —
# it's the authored source of truth, loaded directly rather than through the
# built frontend bundle.
COPY src/data ./src/data
ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
