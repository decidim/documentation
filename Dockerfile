FROM node:22.10.0-bookworm AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
ENV CONTEXT=production \
    ANTORA_CACHE_DIR=/src/node_modules/.cache/antora
RUN npm run build -- --fetch

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/build/site /usr/share/nginx/html
