FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine AS serve

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
