# GearMind - AI Mechanic Assistant

**GearMind** is an offline-first AI assistant designed for field mechanics. Scan a part, get a diagnosis, and decide on the fix—all without needing a stable internet connection.

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

## 🧠 Features
- **AI Part Classification**: Identifies mechanical parts from photos (Mock AI included).
- **Rules Engine**: Matches parts to a local knowledge base for diagnosis and solutions.
- **Offline-First**: Falls back to local JS modules if the backend is unreachable.
- **Save Case**: Save diagnostic results locally or to the backend.

## 🗂️ Project Structure
- `/frontend`: API services and integration.
- `/backend`: Node.js server, rules engine, and routes.
- `/models`: Pluggable AI classifier (mock).
- `/data`: Local knowledge base (`knowledge.json`).
- `/src`: React frontend screens and components.

---
*AI gives suggestions. You make the final call.*
