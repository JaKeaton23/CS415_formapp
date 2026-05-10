# Frontend Dockerfile for the React + Vite app.
# Runs the dev server in development; for production builds use `vite build`
# and serve the `dist/` folder from a static file server (e.g. nginx).
FROM node:20-alpine

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy the rest of the source.
COPY . .

EXPOSE 5173

# Default to the dev server, which Vite is configured to bind to 0.0.0.0:5173.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
