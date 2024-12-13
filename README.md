# GlucoScan Deployment Guide

![GlucoScan Develompment](https://github.com/GlucoScan-Bangkit/GlucoScan_Cloud/blob/main/Screenshot%202024-12-13%20175931.png)

## Introduction
This document provides detailed instructions for deploying the GlucoScan project, which includes both the Flask API and the Node.js backend service. The project is designed to leverage machine learning for nutrition analysis and integrates with a mobile app.

## Features
- Flask-based backend API for machine learning inference.
- Node.js backend for managing user interactions.
- Firebase integration for authentication and database.
- Dockerized for easy deployment.
- Deployable on Google Cloud Run.

## Prerequisites
1. Install Python (version 3.8 or above).
2. Install Node.js and npm.
3. Install Docker.
4. Optional: Install Google Cloud SDK (for cloud deployment).

## Project Structure
```
project/
|-- flask-app/
|   |-- app.py
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- uploads/ (optional directory for file uploads)
|   |-- final_nutrition_model_ML.h5 (ML model file)
|   |-- serviceAccountKey.json (Firebase credentials)
|
|-- node-app/
|   |-- package.json
|   |-- package-lock.json
|   |-- src/
|-- Dockerfile
```

## Running Flask App Locally

### 1. Navigate to Flask Directory
```bash
cd flask-app
```

### 2. Create a Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # For Linux/MacOS
venv\Scripts\activate   # For Windows
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Run the Flask App
```bash
python app.py
```

### 5. Access the Application
The Flask app will be available at `http://127.0.0.1:5000`.

## Running Node.js App Locally

### 1. Navigate to Node.js Directory
```bash
cd gluco-scan
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Node.js App
```bash
npm run start
```

### 4. Access the Application
The Node.js app will be available at `http://127.0.0.1:3000`.

## Using Docker

### 1. Build Docker Images
- Flask App:
```bash
cd flask-app
docker build -t flask-app .
```

- Node.js App:
```bash
cd gluco-scan
docker build -t gluco-scan-app .
```

### 2. Run Docker Containers
- Flask App:
```bash
docker run -p 5000:5000 flask-app
```

- Node.js App:
```bash
docker run -p 3000:3000 gluco-scan-app
```

## Running on Virtual Machine (VM)

### VM Specifications
- **Name**: web-server
- **Machine Type**: e2-standard-2
- **CPU Platform**: Intel Broadwell
- **Location**: asia-southeast2-b
- **Disk**: 10GB boot disk, 150GB additional disk

### Steps to Deploy
1. SSH into your VM:
   ```bash
   gcloud compute ssh web-server --zone=asia-southeast2-b
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/GlucoScan-Bangkit/GlucoScan_Cloud.git
   cd GlucoScan_Cloud
   ```

3. For Flask App:
   ```bash
   cd flask-app
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```

4. For Node.js App:
   ```bash
   cd gluco-scan
   npm install
   npm run start
   ```

5. Ensure the necessary ports (5000 and 3000) are open in the firewall settings of your VM.

## Deploying to Google Cloud Run

### 1. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project <your-project-id>
gcloud auth configure-docker
```

### 2. Build and Push Docker Images
- Flask App:
```bash
cd flask-app
docker build -t gcr.io/<your-project-id>/flask-app .
docker push gcr.io/<your-project-id>/flask-app
```

- Node.js App:
```bash
cd gluco-scan
docker build -t gcr.io/<your-project-id>/gluco-scan-app .
docker push gcr.io/<your-project-id>/gluco-scan-app
```

### 3. Deploy to Cloud Run
- Flask App:
```bash
gcloud run deploy flask-app \
  --image gcr.io/<your-project-id>/flask-app \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated
```

- Node.js App:
```bash
gcloud run deploy gluco-scan-app \
  --image gcr.io/<your-project-id>/gluco-scan-app \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated
```

### 4. Access the Applications
Once deployed, Cloud Run will provide public URLs for both services.

## Environment Variables
Ensure the following environment variables are set if needed:
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to the Firebase `serviceAccountKey.json` file.
- `FLASK_ENV`: Set to `production` or `development`.

## API Endpoints

### Flask App
1. `/predict`
   - **Method**: POST
   - **Description**: Endpoint to predict nutrition data from uploaded images.
   - **Headers**: `Authorization: Bearer <JWT Token>`
   - **Body**: Form-data with a file field `file`.

2. `/get_history`
   - **Method**: GET
   - **Description**: Fetch user prediction history.
   - **Headers**: `Authorization: Bearer <JWT Token>`
   - **Query Parameter**: `date` (format: YYYY-MM-DD).

### Node.js App
1. `/register`
   - **Method**: POST
   - **Description**: User registration endpoint.

2. `/login`
   - **Method**: POST
   - **Description**: User login endpoint.

3. `/logout`
   - **Method**: POST
   - **Description**: User logout endpoint.

4. `/dashboard`
   - **Method**: GET
   - **Description**: Dashboard data retrieval.
   - **Authentication**: Required.

5. `/dashboard/ChangePassword`
   - **Method**: PATCH
   - **Description**: Change user password.
   - **Authentication**: Required.

6. `/dashboard/changeData`
   - **Method**: PATCH
   - **Description**: Update user profile data, including picture upload.
   - **Authentication**: Required.

## Troubleshooting
- **Error**: "ModuleNotFoundError"
  - Ensure dependencies are installed via `pip install -r requirements.txt` or `npm install`.

- **Error**: "No space left on device" (during Docker build)
  - Clean up unused Docker images and containers:
    ```bash
    docker system prune -af
    ```

- **Error**: "Permission Denied" (during Cloud Run deployment)
  - Ensure proper IAM roles are assigned to your Google Cloud account.


### Authors
Developed by the GlucoScan Team. Special thanks to **Hassan Fachrurrozi** and **Arya Saputra** and the team for their contributions to the backend and cloud deployment.

