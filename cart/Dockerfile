# ===================================
# Stage 1: Build Stage (Development)
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src

RUN npm run build 

# ===================================
# Stage 2: Production Stage (Runtime)
# ===================================
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist 

EXPOSE 3000

CMD ["node", "dist/index.js"]
