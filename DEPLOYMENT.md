# Deployment Guide

This application is ready to be deployed as a single unit (Frontend + Backend). The Node.js backend serves the React frontend static files.

## Option 1: Docker (Recommended)

This is the most reliable method because scraping requires specific browser dependencies that are pre-installed in the Docker image.

1.  **Status**: A `Dockerfile` and `.dockerignore` have been created in your project root.
2.  **Build & Run Locally**:
    ```bash
    docker build -t web-scraper .
    docker run -p 3000:3000 web-scraper
    ```
3.  **Deploy to Render.com (Docker)**:
    - Create a specific **"Web Service"**.
    - Connect your GitHub repository.
    - Select **Docker** as the Runtime (it should auto-detect the Dockerfile).
    - Deploy.

## Option 2: Render.com (Native Node)

If you prefer not to use Docker, you can use a standard Node.js environment.

1.  **Settings**:
    - **Build Command**: `npm install && npm run build`
      - _Note: We updated the build script to install Playwright browsers automatically._
    - **Start Command**: `npm start`
2.  **Environment Variables**:
    - `NODE_VERSION`: `20` (Recommended)

## Option 3: Railway / Heroku

- **Railway**: Connect GitHub, it handles the Dockerfile automatically.
- **Heroku**: Requires the `heroku-buildpack-nodejs`. You might need to add a specialized buildpack for Playwright dependencies if the build script fails to install them due to missing OS libraries.

## Important Notes

- **Persistent Storage**: The app stores scrapes in the `outputs/` directory. On most PaaS (Render, Heroku), the filesystem is **ephemeral** (deleted on restart).
- **Solution**: For a production scraper, you should update the code to upload results to S3/Cloud Storage, or use a persistent disk (Render Disks) mounted at `/app/outputs`.
