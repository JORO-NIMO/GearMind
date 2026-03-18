/**
 * Mock AI Classifier
 * Simulates an image classification model.
 */

const parts = ["carburetor", "radiator", "brake pad", "alternator belt"];

/**
 * Predicts the part in the image.
 * @param {string} image - Base64 or file path.
 * @returns {Promise<{part: string, confidence: number}>}
 */
const classifyImage = async (image) => {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Randomly pick a part
  const randomIndex = Math.floor(Math.random() * parts.length);
  const part = parts[randomIndex];
  const confidence = 0.7 + Math.random() * 0.25; // Random confidence between 0.70 and 0.95

  return {
    part,
    confidence: parseFloat(confidence.toFixed(2)),
  };
};

module.exports = { classifyImage };
