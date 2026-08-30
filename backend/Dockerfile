# Multi-stage/Production Backend Dockerfile
FROM node:20-alpine AS base

# Install curl for container health check
RUN apk add --no-cache curl

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source
COPY src/ ./src/

# Change ownership to non-root user
RUN chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose backend API port
EXPOSE 5000

# Environment variables default
ENV NODE_ENV=production
ENV PORT=5000

# Container Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
