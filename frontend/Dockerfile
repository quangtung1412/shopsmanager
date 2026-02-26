# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Receive build-time env vars (VITE_* are baked into the JS bundle)
ARG VITE_API_URL=http://localhost:5000
ARG VITE_CONTACT_EMAIL=admin@etsyerp.local
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL

COPY . .
RUN npm run build

# ---- Serve stage ----
FROM node:20-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
