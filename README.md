# Royal Book Club — Cloud Architecture & Running Guide

Welcome to the official repository of the **Royal Book Club** serverless ecosystem. This system is designed as a secure, full-stack, scale-to-zero application, utilizing Cloudflare Pages for the frontend static SPA distribution and GCP Cloud Run for its serverless Java Spring Boot 3 REST API.

---

## 🏛️ System Architecture Blueprint

For a complete breakdown of the high-level system layout, package architectures, databases, and authentication state transitions, please see the master [design_doc.md](file:///Users/deepikakumari/.gemini/antigravity/brain/66bef284-ee64-4b47-9c64-e9917b58fff8/design_doc.md).

---

## 🛠️ Infrastructure as Code (IaC) vs. Manual Configurations

All central, automated infrastructure is managed using Terraform within the `/infrastructure` directory.

### 1. Provisioned via Terraform (`/infrastructure`)
- **Artifact Registry**: Docker repository with automatic 14-day container pruning policies to avoid storage overhead fees.
- **Cloud Run API**: Deployed with scale-to-zero (`min_instances = 0`, `max_instances = 3`) to guarantee zero operational costs during idle times.
- **Cloud Firestore Native Database**: Schema-less serverless database.
- **Cloudflare Pages**: Global hosting, edge proxy functions, and custom DNS integration (`royalbookclub.com` and `www.royalbookclub.com`).
- **Workload Identity Federation (WIF)**: Authorizes GitHub Actions CI/CD pipeline deployments securely without permanent, static credential keys.

### 2. Manual Configurations Required
Before the infrastructure can be fully operational, you must manually execute the following setup steps:
1. **Firebase Project Creation**:
   - Create a project named `royal-book-club` inside the Firebase Console.
   - Enable **Firebase Authentication** and turn on **Email/Password** provider.
   - Generate a New Private Key for your service account from `Project Settings -> Service accounts` and save it locally as `backend/firebase-service-account.json`.
2. **LinkedIn Developer Portal Setup**:
   - Register an application in the LinkedIn Developer Console.
   - Request **Sign In with LinkedIn (OpenID Connect)** product permissions.
   - Configure Authorized Redirect URIs to include: `https://royalbookclub.com`.
   - Copy your **Client ID** and **Client Secret**.
3. **Cloudflare DNS Custom Nameserver Routing**:
   - Ensure your domain `royalbookclub.com` has its nameservers delegated to Cloudflare to allow Terraform's `cloudflare_zone` matching to complete.

---

## 🚀 Local Development Setup

To run the entire full-stack application on your development computer, follow these simple coordinates.

### 1. Backend API (Java Spring Boot)
Make sure you are using JDK 21 or newer.

```bash
cd backend

# Create or verify your service account private key file
# File: backend/firebase-service-account.json

# Launch the backend dev server
# (Optional: Provide LINKEDIN_* variables if testing actual LinkedIn OAuth locally, otherwise they default to mock credentials)
SPRING_PROFILES_ACTIVE=dev \
FIREBASE_CREDENTIALS_PATH=firebase-service-account.json \
LINKEDIN_CLIENT_ID=your-linkedin-client-id \
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret \
LINKEDIN_REDIRECT_URI=http://localhost:5173 \
./mvnw clean spring-boot:run
```
The API server will launch at `http://localhost:8080`. You can inspect documentation and test endpoints at the Swagger UI: `http://localhost:8080/swagger-ui.html`.

### 2. Frontend SPA (React 18 + Vite)
Make sure you have Node.js 20 installed.

```bash
cd frontend

# Verify or create your local env secrets file
# File: frontend/.env.local (See secrets registry below)

# Install dependencies
npm install

# Run the dev server
npm run dev
```
Open `http://localhost:5173` to interact with the responsive, royal glassmorphic catalog and community pages.

---

## 🔑 Secrets & Variables Registry

Set the following configuration variables inside your local environment or GitHub Actions Settings to enable successful runs and deployments.

### Local Environment Variables (Frontend `.env.local`)
These coordinates reside in `frontend/.env.local` to enable local Firebase API calls and point client requests to the Spring Boot mock/local backend:
```properties
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_API_BASE_URL=http://localhost:8080
```

### GitHub Secrets for CI/CD Deployment
Configure these encrypted secrets in your GitHub Repository under `Settings -> Secrets and variables -> Actions` to automate pipelines successfully:

| Secret Name | Description | Example / Target Value |
| :--- | :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | API Token authorized with Pages:Edit and DNS:Edit | `your-cloudflare-api-token` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Portal Account Identifier | `your-cloudflare-account-id` |
| `GCP_WIF_PROVIDER` | Workload Identity Federation provider URI | `projects/your-gcp-project-number/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider` |
| `GCP_WIF_SERVICE_ACCOUNT` | GCP Service Account authorized with Deployment roles | `github-actions-deployer@your-gcp-project-id.iam.gserviceaccount.com` |
| `VITE_API_BASE_URL` | Production cloud run URL mapped behind proxy | `https://your-custom-domain.com/api` |
| `VITE_FIREBASE_API_KEY` | Client Firebase Web SDK Authentication Token | `your-firebase-api-key` |

### Backend Runtime Environment Variables (GCP Cloud Run)
These variables are configured directly inside the GCP Cloud Run service template (or injected via GCP Secret Manager) to power core backend OAuth integrations and Firestore settings:

| Variable Name | Description | Recommended Placeholder / Format |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile for prod configurations | `prod` |
| `LINKEDIN_CLIENT_ID` | OAuth Client ID from LinkedIn Developer Console | `your-linkedin-client-id` |
| `LINKEDIN_CLIENT_SECRET` | OAuth Client Secret from LinkedIn Developer Console | `your-linkedin-client-secret` |
| `LINKEDIN_REDIRECT_URI` | Authorized Redirect URL mapped for callback | `https://your-custom-domain.com` |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account credentials raw JSON | `{"type": "service_account", ...}` |
| `CLOUDFLARE_SECRET` | Secret shared token mapped on Cloud Run and Edge proxy | `your-origin-shared-secret` |

---

## 🧪 E2E Checkout Matrix Testing

The project includes comprehensive end-to-end testing of all checkout flow combinations across **Platform × User State × Entry Point × Admin Gating Config** (360 total combinations).

### Running Tests Locally

```bash
cd frontend

# Sanity: 8 critical path tests (~3 min)
npx playwright test --project=sanity

# Smoke: 24 pairwise coverage tests (~8 min)
npx playwright test --project=smoke

# Full Matrix: all 360 combinations (~45-60 min)
npx playwright test --project=full-matrix

# Run existing non-matrix tests only
npx playwright test --project=chromium
```

### Viewing Reports

After running tests, reports are generated at:
- **HTML Report**: `frontend/test-reports/checkout-matrix-report.html` (open in browser)
- **Dated Archive**: `frontend/test-reports/checkout-matrix-report-YYYY-MM-DD.html`
- **JSON Data**: `frontend/test-reports/checkout-matrix-report.json`
- **Playwright HTML Report**: `frontend/playwright-report/index.html`

### CI/CD Integration

| Trigger | Level | Budget | Workflow |
|---------|-------|--------|----------|
| Push to main | Smoke (24 tests) | 10 min | `e2e-checkout-matrix.yml` |
| Daily cron (6 AM UTC) | Smoke (24 tests) | 10 min | `e2e-checkout-matrix.yml` |
| Manual dispatch | Configurable | 60 min | `e2e-checkout-matrix.yml` |

**Trigger full matrix manually:**
```bash
gh workflow run e2e-checkout-matrix.yml -f level=full-matrix
```

### Production Data Isolation

Test data is **completely invisible** to production users through multi-layered isolation:
- All test books use ISBN prefix `E2E_TEST_` and `isTest: true` flag
- Backend `getAllBooks()` and `getAllCheckouts()` skip `isTest: true` documents
- Test NFC UIDs use prefix `e2e000`, test QR IDs use range `999000001+`
- Test user emails use RFC 2606 `.invalid` TLD
- Admin gating settings are saved before tests and restored after

### Required GitHub Secrets for E2E

| Secret | Purpose |
|--------|---------|
| `TEST_USER_EMAIL` | Pre-existing test user email for auth tests |
| `TEST_USER_PASSWORD` | Test user password |
| `TEST_ADMIN_TOKEN` | Firebase admin token for test data setup/teardown |
| `PRODUCTION_URL` | Production URL target (optional, defaults to Cloudflare Pages URL) |

See [TEST_PLAN.md](TEST_PLAN.md) for the complete test matrix documentation.

---

## 🏷️ Physical Catalog Asset Fabrication & QR Generator

The system includes an integrated 65-up A4 physical sticker generator for catalog curation:
- **Route**: `/admin/qr-stickers` (Curator/Admin only)
- **Sheet Format**: Standard A4 (`210 mm × 297 mm`), 13 rows × 5 columns = 65 stickers per sheet.
- **Dimensions**: 39 mm × 21.0 mm stickers with 3 mm left margin, 11 mm top margin, 2 mm horizontal gap (273 mm total column height across 13 rows; 21.0 mm row pitch).
- **Deep Link Schema**: `https://bookshelfnet.com/?qr=<counter>` with vertically centered 17.5×17.5 mm QR code, middle emblem logo, and Royal Book Club serif branding.
- **Export Formats**: High-resolution vector PDF export (`jspdf` + `qrcode`) with optional cutting/alignment grid guides.

---

---

## 🤖 AI Agent Coding Guidelines

We maintain a strict, standardized pair-programming protocol. Any AI developer/agent interacting with this repository MUST consult the coding guidelines and hand-off rules documented in [AGENTS.md](file:///Users/deepikakumari/royalbookclub/AGENTS.md) before writing code.
```
- Rule 1: Always Design-First before making changes.
- Rule 2: Mandatory Test Cases written for all feature additions.
- Rule 3: Maintain README & design doc integrity whenever schemas/variables change.
- Rule 4: Safely look up and inspect local files for secrets when asked.
```
