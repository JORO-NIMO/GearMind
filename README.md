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
- `HF_API_BASES` (optional): comma-separated inference base URLs tried in order. Default is `https://router.huggingface.co/hf-inference/models/,https://api-inference.huggingface.co/models/`.
- `FRONTEND_URLS` (optional): comma-separated CORS allowlist, for example `https://your-app.vercel.app,http://localhost:8080`.
	Wildcards are supported, for example `https://*.placementbridge.org,https://*.vercel.app`.
	If this variable is not set, backend allows all origins.
- `API_KEY` (optional): if set, requests to `/analyze` and `/save-case` must include `x-api-key`.
- `RATE_LIMIT_WINDOW_MS` (optional): rate-limiter window in milliseconds. Default `60000`.
- `RATE_LIMIT_MAX_ANALYZE` (optional): max analyze requests per window per IP. Default `20`.
- `RATE_LIMIT_MAX_SAVE_CASE` (optional): max save requests per window per IP. Default `30`.
- `CASE_STORAGE_FILE` (optional): NDJSON file path for saved cases. Default `tmp/cases.ndjson`.

## 🧠 Features
- **Two-Stage AI Pipeline**: Image captioning + LLM diagnosis with structured output.
- **Validated AI Output**: Server-side schema validation guarantees response shape.
- **Resilient Inference Calls**: Timeout + retry logic for external model requests.
- **Safe Fallback Response**: Returns a normalized fallback diagnosis when AI output is invalid.
- **Rate-Limited Endpoints**: Protects `/analyze` and `/save-case` from abuse.
- **Persistent Case Storage**: Saves cases as append-only NDJSON on the backend.

## 🗂️ Project Structure
- `/api`: Vercel serverless entrypoint.
- `/backend`: Express server and API routes.
- `/models`: AI inference + validation pipeline.
- `/src`: React frontend screens, components, and tests.
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
