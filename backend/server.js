import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import analyzeRoute from './routes/analyze.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for base64 images

// Routes
app.use('/analyze', analyzeRoute);

// AI Health Check
app.get('/analyze/test', async (req, res) => {
  try {
    const { classifyImage } = await import('../models/hfClassifier.js');
    // Using a very small string to test token validity
    const result = await classifyImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==");
    res.json({ status: "ok", token_valid: true, result });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Save case endpoint (optional)
app.post('/save-case', (req, res) => {
  const { data } = req.body;
  console.log("Saving case:", data);
  // In a real app, this would save to a database or local file
  res.json({ success: true, message: "Case saved locally" });
});

// Start the server (using a more ESM-friendly check)
const isMain = import.meta.url.startsWith('file:');
if (isMain && process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;
