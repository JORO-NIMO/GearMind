const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../data/knowledge.json');

/**
 * Rules Engine
 * Matches a detected part with entries in the knowledge base.
 */
const processDiagnosis = (detectedPart) => {
  try {
    const knowledgeBase = JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8'));
    const partKey = detectedPart.toLowerCase();
    
    const partInfo = knowledgeBase[partKey];
    
    if (!partInfo) {
      return {
        diagnosis: "Unknown part detected",
        solutions: ["Inspect part manually", "Consult technical manual"],
        tools: ["General toolkit"],
        risk: "Unknown"
      };
    }

    return {
      diagnosis: partInfo.diagnosis,
      solutions: partInfo.solutions,
      tools: partInfo.tools,
      risk: partInfo.risk
    };
  } catch (error) {
    console.error("Error reading knowledge base:", error);
    return {
      diagnosis: "Error processing diagnosis",
      solutions: ["Retry analysis"],
      tools: [],
      risk: "Unknown"
    };
  }
};

module.exports = { processDiagnosis };
