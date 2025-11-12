# ===================================
# Stage 1: Build Stage (Development)
# ===================================
# Mục đích: Compile TypeScript → JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files trước để tận dụng Docker layer caching
COPY package*.json ./

# Install ALL dependencies (bao gồm cả devDependencies) để build TypeScript
RUN npm ci && npm cache clean --force

# Copy source code và config files
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript → JavaScript vào folder dist/
RUN npm run build 

# ===================================
# Stage 2: Production Stage (Runtime)
# ===================================
# Mục đích: Tạo image nhỏ gọn chỉ để chạy app
FROM node:20-alpine

WORKDIR /app

# Copy package files và install CHỈ production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy CHỈ compiled JavaScript (không copy TypeScript source)
COPY --from=builder /app/dist ./dist 

# Expose port mà app sẽ listen
EXPOSE 3000

# Chạy compiled JavaScript file (KHÔNG phải TypeScript)
CMD ["node", "dist/index.js"]