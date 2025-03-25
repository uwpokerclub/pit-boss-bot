FROM node:22.14.0-bookworm AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

FROM node:22.14.0-alpine
WORKDIR /app
RUN apk add python3 py3-pip make g++
COPY --from=build /app/dist ./
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
CMD [ "node", "src/index.js" ]