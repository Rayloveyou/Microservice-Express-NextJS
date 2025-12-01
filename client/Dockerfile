# Stage 1: Dependencies and Build
FROM node:20 AS builder
WORKDIR /app

ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js application
RUN npm run build

# Stage 2: Production
FROM node:20
WORKDIR /app

ENV NODE_ENV=production

ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

CMD ["npm", "start"]
