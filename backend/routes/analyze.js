const express = require('express');
const router = express.Router();
const { classifyImage } = require('../../models/hfClassifier');

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

    // 1. Pass image to Dynamic AI pipeline (VLM + LLM)
    const result = await classifyImage(image);

    // 2. Return the dynamic AI result directly
    return res.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ 
      error: "Internal server error during analysis", 
      message: error.message 
    });
  }
});

module.exports = router;
