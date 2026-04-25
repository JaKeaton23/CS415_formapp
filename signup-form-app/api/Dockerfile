# API Dockerfile for the Express + DynamoDB backend.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy the rest of the source.
COPY . .

EXPOSE 3001

# The compose file overrides this to first create the table and then start the server.
CMD ["node", "server.js"]
