FROM node:20.9.0-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=0 /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile