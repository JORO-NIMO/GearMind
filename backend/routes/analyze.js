const express = require('express');
const router = express.Router();
const { classifyImage } = require('../../models/hfClassifier');
const { processDiagnosis } = require('../rulesEngine');

/**
 * POST /analyze
 * Input: { image: "base64_string" }
 */
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // 1. Pass image to Hugging Face Zero-Shot CLIP classifier
    const classification = await classifyImage(image);

    // 2. Run rules engine based on predicted part
    const ruleResult = processDiagnosis(classification.part);

    // 3. Construct structured output
    const output = {
      part: classification.part,
      confidence: classification.confidence,
      diagnosis: ruleResult.diagnosis,
      solutions: ruleResult.solutions,
      tools: ruleResult.tools,
      risk: ruleResult.risk,
      originalLabel: classification.originalLabel // Added for transparency
    };

    return res.json(output);
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ error: "Internal server error during analysis" });
  }
});

module.exports = router;
