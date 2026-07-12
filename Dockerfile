# ==========================================
# Stage 1: Build the Vite Frontend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend production assets
RUN npm run build

# ==========================================
# Stage 2: Production Server Environment
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy backend files and built frontend assets
COPY backend ./backend
COPY models ./models
COPY --from=builder /app/dist ./dist

# Create a local tmp directory for cases fallback storage
RUN mkdir -p /app/tmp && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "backend/server.js"]
