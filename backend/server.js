const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const analyzeRoute = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for base64 images

// Routes
app.use('/analyze', analyzeRoute);

// Save case endpoint (optional)
app.post('/save-case', (req, res) => {
  const { data } = req.body;
  console.log("Saving case:", data);
  // In a real app, this would save to a database or local file
  res.json({ success: true, message: "Case saved locally" });
});

// Only start the server if this file is run directly (not as a module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;
