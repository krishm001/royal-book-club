# Royal Book Club — Cloud Architecture & Deployment Guide

Welcome to the **Royal Book Club** core repository. This ecosystem provides a highly polished, interactive library management and community portal, custom-designed to run on Google Cloud Platform (GCP) with an **ultra-low-cost, scale-to-zero architectural footprint**.

---

## 🏛️ System Architecture Overview

The system utilizes a modern decoupled full-stack architecture optimized for high-performance and zero idle operational expenses:

```mermaid
graph TD
    User([User Browser]) -->|Static Assets| GHP[GitHub Pages (Free Tier)]
    User -->|API Requests| CR[Google Cloud Run (Scale-to-Zero)]
    CR -->|No-SQL Transactions| CF[Cloud Firestore (Free Tier)]
    CR -->|OAuth 2.0 / MFA| FA[Firebase Authentication]
```

### 1. Frontend (Static SPA)
- **Framework**: React 18 + Vite (configured with SPA routing using HashRouter).
- **Styling**: Vanilla CSS featuring a premium royal dark-mode design system with deep blue backgrounds, shimmering gold/amber accents, micro-animations, and glassmorphic card layouts.
- **Hosting**: Deployed directly to GitHub Pages (`krishm001/krishm001.github.io`). Cost: **$0/month**.

### 2. Backend (Java REST API)
- **Framework**: Spring Boot 3.x with OpenJDK 21, compiled via Maven.
- **Containerization**: Multi-stage JVM-optimized container running on Alpine JRE.
- **Hosting**: Google Cloud Run (Fully Managed).
- **Scale-to-Zero**: Configured with `min_instances = 0` and `max_instances = 3`. Idle cost: **$0/month**.

### 3. Serverless Database & Security
- **Database**: Cloud Firestore (Native Mode). Provides 1 GiB free storage and 50,000 free read ops/day.
- **Authentication**: Firebase Auth (10,000 free monthly active users, fully verified sign-in/sign-up out-of-the-box).

---

## 📁 Repository Structure

```
royalbookclub/
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml    # Build, test & deploy Spring Boot API to GCP
│       └── deploy-frontend.yml   # Compile React app & push static assets to GitHub Pages
├── backend/                      # Java Spring Boot application (Maven-based)
├── frontend/                     # React 18 + Vite SPA source code
└── infrastructure/               # Terraform resource definitions for GCP provisioning
```

---

## 🚀 CI/CD Automation (GitHub Actions)

### 🎨 Frontend Pipeline (`deploy-frontend.yml`)
- Triggers on pushes targeting the `frontend/` directory.
- Sets up Node.js 20, runs production builds (`npm run build`).
- Deploys static assets directly to the target landing repository `krishm001/krishm001.github.io` using a secure Deployment Personal Access Token (`DEPLOY_PAT`).

### ☕ Backend Pipeline (`deploy-backend.yml`)
- Triggers on pushes targeting the `backend/` directory.
- Compiles source and executes the full JUnit test suite using Maven.
- Authenticates securely with Google Cloud using **Workload Identity Federation (WIF)** (eliminating static security keys).
- Builds, tags, and pushes Docker containers to the Google Artifact Registry.
- Triggers an automated update to the Cloud Run service, setting `min_instances = 0` and `max_instances = 3` for zero-cost idling.

---

## 🛠️ Infrastructure as Code (Terraform)

All GCP cloud resources are fully provisioned via Terraform within the `/infrastructure` directory:

- `main.tf`: Configures the HashiCorp Google provider.
- `variables.tf`: Declares input variables with sensible, secure defaults.
- `artifact_registry.tf`: Provisions a Docker repository with integrated cleanup policies that prune old containers automatically after 14 days, preventing storage-creep fees.
- `cloud_run.tf`: Provisions a low-privilege custom Service Account, binds IAM roles for Cloud Logging and Firestore (`roles/datastore.user`), deploys the Cloud Run service with a scale-to-zero envelope, and enables public unauthenticated access.
- `outputs.tf`: Exports the generated registry coordinates and service endpoint URLs.

### To provision:
1. Ensure the `gcloud` CLI is logged in.
2. Initialize Terraform:
   ```bash
   cd infrastructure
   terraform init
   ```
3. Run a planning phase:
   ```bash
   terraform plan -var="project_id=YOUR_PROJECT_ID"
   ```
4. Apply the configuration:
   ```bash
   terraform apply -var="project_id=YOUR_PROJECT_ID" -auto-approve
   ```

---

## 💎 Local Development Guide

### Running the Backend:
```bash
cd backend
./mvnw clean spring-boot:run
```

### Running the Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to interact with the responsive views.

---

## 🔐 Required Secrets
Set the following secrets in your GitHub Actions settings to enable flawless deployments:
- `DEPLOY_PAT`: GitHub Personal Access Token with read/write access to `krishm001/krishm001.github.io`.
- `GCP_WIF_PROVIDER`: The Google Workload Identity Provider URL.
- `GCP_WIF_SERVICE_ACCOUNT`: The GitHub Actions service account email in GCP.
