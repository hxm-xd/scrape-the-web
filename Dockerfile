# Playwright browsers in this image must match the playwright version in package.json.
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install backend dependencies
# Use --ignore-scripts to prevent the 'postinstall' script (which tries to cd to frontend) from running
RUN npm ci --ignore-scripts

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
