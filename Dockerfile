# Use the official Playwright image which comes with Node.js and browsers installed
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
# We use --prefix frontend to run npm install in the frontend directory
RUN npm ci --prefix frontend

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build --prefix frontend

# Expose the API port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
