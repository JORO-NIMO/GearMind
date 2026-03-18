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

// Rules endpoint
app.get('/rules', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const knowledgeBase = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/knowledge.json'), 'utf8'));
  res.json(knowledgeBase);
});

app.post('/rules', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const { rules } = req.body;
  if (!rules) return res.status(400).json({ error: "Missing rules data" });
  
  try {
    fs.writeFileSync(path.join(__dirname, '../data/knowledge.json'), JSON.stringify(rules, null, 2));
    res.json({ success: true, message: "Knowledge base updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update rules" });
  }
});

// Save case endpoint (optional)
app.post('/save-case', (req, res) => {
  const { data } = req.body;
  console.log("Saving case:", data);
  // In a real app, this would save to a database or local file
  res.json({ success: true, message: "Case saved locally" });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
