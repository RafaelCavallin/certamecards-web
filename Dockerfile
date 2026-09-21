FROM node:24-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY --from=build /workspace/dist/certamecards-web/browser /usr/share/caddy
COPY docker/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
