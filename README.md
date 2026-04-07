# GearMind - AI Mechanic Assistant

**GearMind** is an AI-assisted mechanic workflow app: scan a part, receive a structured diagnosis, and review repair guidance before acting.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm installed

### 1. Setup
```sh
# Install dependencies
npm install
```

### 2. Run the Backend
```sh
# Start the Node.js Express server
node backend/server.js
```
The backend runs on `http://localhost:3001`.

### 3. Run the Frontend
```sh
# Start the Vite development server
npm run dev
```

## Environment Variables

Create environment variables for backend runtime:

- `HF_TOKEN` (required): Hugging Face API token for inference calls.
- `HF_API_BASES` (optional): comma-separated inference base URLs tried in order. Default is `https://router.huggingface.co/hf-inference/models/`.
- `HF_CAPTION_MODELS` (optional): comma-separated image captioning model IDs tried in order.
	Default is `Salesforce/blip-image-captioning-base,nlpconnect/vit-gpt2-image-captioning`.
- `FRONTEND_URLS` (optional): comma-separated CORS allowlist, for example `https://your-app.vercel.app,http://localhost:8080`.
	Wildcards are supported, for example `https://*.placementbridge.org,https://*.vercel.app`.
	If this variable is not set, backend allows all origins.
- `API_KEY` (optional): if set, requests to `/analyze` and `/save-case` must include `x-api-key`.
- `RATE_LIMIT_WINDOW_MS` (optional): rate-limiter window in milliseconds. Default `60000`.
- `RATE_LIMIT_MAX_ANALYZE` (optional): max analyze requests per window per IP. Default `20`.
- `RATE_LIMIT_MAX_SAVE_CASE` (optional): max save requests per window per IP. Default `30`.
- `CASE_STORAGE_FILE` (optional): NDJSON file path for saved cases. Default `tmp/cases.ndjson`.
- `CASE_STORAGE_DRIVER` (optional): `auto`, `file`, or `upstash`. Default `auto`.
- `CASE_STORAGE_PREFIX` (optional): key prefix when using Upstash REST storage. Default `gearmind:cases`.
- `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL` (optional): durable REST storage URL for saved cases.
- `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_TOKEN` (optional): token for the REST storage endpoint.

Frontend runtime:

- `VITE_API_URL` (optional): API base URL for the frontend. In local development the app now defaults to `http://localhost:3001`.
- `VITE_API_KEY` (optional): forwarded as `x-api-key` to backend requests when backend auth is enabled.

## 🧠 Features
- **Two-Stage AI Pipeline**: Image captioning + LLM diagnosis with structured output.
- **Validated AI Output**: Server-side schema validation guarantees response shape.
- **Resilient Inference Calls**: Timeout + retry logic for external model requests.
- **Strict AI Responses**: Returns explicit errors when inference output is invalid instead of mock fallback content.
- **Rate-Limited Endpoints**: Protects `/analyze` and `/save-case` from abuse.
- **Saved Case History**: Save diagnoses and reopen them later through `/cases` and `/cases/:id`.
- **Durable Case Storage**: Uses Upstash/Vercel-compatible REST storage in production when configured, with NDJSON fallback for local development.
- **Persistent Case Storage**: Saves cases as append-only NDJSON on the backend when remote storage is not configured.

## 🗂️ Project Structure
- `/api`: Vercel serverless entrypoint.
- `/backend`: Express server and API routes.
- `/models`: AI inference + validation pipeline.
- `/src`: React frontend screens and components.
- `/test`: backend integration tests using Node's built-in test runner.
- `/tmp`: local case storage output (`cases.ndjson`).

## 🚀 Deployment (Vercel)

This project is configured for **Vercel** deployment:
- **Frontend**: Vite (Root)
- **Backend**: Express (Vercel Serverless Functions in `/api`)

### Steps to Deploy
1. Push your changes to GitHub.
2. Import the repository to Vercel.
3. Vercel will automatically detect the settings and deploy both the frontend and backend.

---
*AI gives suggestions. You make the final call.*
