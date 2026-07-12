# 🚀 Google Cloud Deployment Guide - GearMind

This guide explains how to deploy the production-ready containerized version of **GearMind** to **Google Cloud Run** with distributed, stateful rate-limiting provided by **Upstash Redis**, and persistent case storage using **Google Cloud Storage (GCS) FUSE**.

---

## 🏗️ Architecture Overview

When deployed to Google Cloud, the application runs inside a secure, autoscaling container:
1. **Frontend + Backend Consolidated**: The Vite React frontend is compiled and served directly by the Node.js Express backend in production. They run on the same port, avoiding CORS issues.
2. **Stateless Rate Limiting**: Shared state rate limiting is handled globally via **Upstash Redis** (via HTTP REST calls, which is extremely lightweight and serverless-friendly).
3. **Persistent File Storage**: Saved cases (`cases.ndjson`) are persisted to a **Google Cloud Storage Bucket** mounted directly to the container's directory using **Cloud Storage FUSE**.

---

## 🛠️ Step 1: Set Up Upstash Redis

Upstash Redis is perfect for serverless rate limiting because it runs over HTTP/REST, avoiding socket exhaustion.

1. Go to [Upstash Console](https://console.upstash.com/) and sign up.
2. Create a new **Redis Database**. Choose a region close to your GCP deployment (e.g., `us-central1`).
3. Under the database details, copy the following credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 📦 Step 2: Google Cloud Prerequisites

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) on your local machine.
2. Initialize and authenticate the CLI:
   ```bash
   gcloud init
   gcloud auth login
   ```
3. Set your Google Cloud Project ID:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
4. Enable the necessary APIs:
   ```bash
   gcloud services enable run.googleapis.com \
                          cloudbuild.googleapis.com \
                          storage.googleapis.com
   ```

---

## 🪣 Step 3: Set Up Persistent Storage (GCS Bucket)

To make sure your saved `cases.ndjson` file is never lost when Cloud Run scales down to zero or restarts, we will mount a GCS bucket to `/app/tmp`.

1. Create a unique Cloud Storage Bucket:
   ```bash
   gcloud storage buckets create gs://gearmind-cases-storage --location=us-central1
   ```
2. Cloud Run automatically supports mounting this bucket as a directory at runtime using Cloud Storage FUSE.

---

## 🚀 Step 4: Build and Deploy to Google Cloud Run

We will use **Google Cloud Build** to package the application container and push it to Google Artifact Registry, then deploy it to **Cloud Run**.

### 1. Build the Docker Image on the Cloud
Run the following command from the repository root to build and register your container:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/gearmind
```

### 2. Deploy to Cloud Run
Deploy the container, mount the GCS bucket to `/app/tmp`, and set your secret environment variables:

```bash
gcloud run deploy gearmind \
  --image gcr.io/YOUR_PROJECT_ID/gearmind \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3001 \
  --update-env-vars HF_TOKEN="your_huggingface_token_here" \
  --update-env-vars UPSTASH_REDIS_REST_URL="https://your-database.upstash.io" \
  --update-env-vars UPSTASH_REDIS_REST_TOKEN="your_upstash_token_here" \
  --update-env-vars CASE_STORAGE_FILE="/app/tmp/cases.ndjson" \
  --add-volume=name=cases-volume,type=cloud-storage,bucket=gearmind-cases-storage \
  --add-volume-mount=volume=cases-volume,mount-path=/app/tmp
```

> ⚠️ **Note**: Replace `YOUR_PROJECT_ID`, `your_huggingface_token_here`, and your Upstash Redis credentials with your actual values.

---

## ⚙️ Environment Variables Summary

| Variable Name | Required | Description |
|---|---|---|
| `HF_TOKEN` | Yes | Hugging Face API Token for AI Image + Diagnosis pipelines. |
| `UPSTASH_REDIS_REST_URL` | Yes (for prod) | Your Upstash Redis REST endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (for prod) | Your Upstash Redis REST token.|
| `CASE_STORAGE_FILE` | Yes | Path to write NDJSON cases, e.g., `/app/tmp/cases.ndjson`. |
| `API_KEY` | Optional | If set, secure backend endpoints with an API key (`x-api-key` header). |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit time frame in milliseconds (default: `60000`). |
| `RATE_LIMIT_MAX_ANALYZE` | Optional | Max analysis requests per window (default: `20`). |
| `RATE_LIMIT_MAX_SAVE_CASE` | Optional | Max case saves per window (default: `30`). |

---

## 🔄 Updating Your Application

Whenever you update your code:
1. Re-build the image:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/gearmind
   ```
2. Re-deploy (Cloud Run will pick up the new container and perform a zero-downtime rolling update):
   ```bash
   gcloud run deploy gearmind --image gcr.io/YOUR_PROJECT_ID/gearmind --region us-central1
   ```

Now your GearMind deployment is extremely resilient, scalable, securely rate-limited via Upstash, and state-persisted via GCS! 🎉
