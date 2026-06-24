FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm config set strict-ssl false
RUN npm install
COPY . .
ARG VITE_MS_AUTH_URL=http://localhost:3001
ARG VITE_MS_ALERTS_URL=
ENV VITE_MS_AUTH_URL=$VITE_MS_AUTH_URL
ENV VITE_MS_ALERTS_URL=$VITE_MS_ALERTS_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm config set strict-ssl false
RUN npm install -g vite
COPY --from=build /app/dist ./dist
COPY vite.preview.config.cjs ./vite.preview.config.cjs
EXPOSE 4002
CMD ["vite", "preview", "--config", "vite.preview.config.cjs"]
