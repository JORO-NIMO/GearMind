const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const Jimp = require('jimp');

let model = null;

/**
 * Maps MobileNet labels to our knowledge base keys.
 */
const LABEL_MAPPING = {
  'radiator': 'radiator',
  'carburetor': 'carburetor',
  'brake': 'brake pad',
  'pad': 'brake pad',
  'belt': 'alternator belt',
  'engine': 'carburetor', // Generic engine might be a carburetor issue
  'car wheel': 'brake pad', // Wheel area often relates to brakes
};

/**
 * Loads the MobileNet model.
 */
const loadModel = async () => {
  if (model) return model;
  console.log("Loading MobileNet model...");
  model = await mobilenet.load({
    version: 2,
    alpha: 1.0
  });
  console.log("Model loaded!");
  return model;
};

/**
 * Processes image and returns classification.
 */
const classifyImage = async (imageSource) => {
  try {
    const loadedModel = await loadModel();

    // 1. Decode image (handle base64/data URLs)
    const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const image = await Jimp.read(buffer);
    
    // 2. Preprocess (resize to 224x224 as required by MobileNet)
    image.cover(224, 224);
    
    // 3. Convert Jimp image to Tensor
    const { width, height, data } = image.bitmap;
    const bufferData = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      bufferData[i * 3 + 0] = data[i * 4 + 0] / 255;
      bufferData[i * 3 + 1] = data[i * 4 + 1] / 255;
      bufferData[i * 3 + 2] = data[i * 4 + 2] / 255;
    }
    const tensor = tf.tensor3d(bufferData, [height, width, 3]);

    // 4. Classify
    const predictions = await loadedModel.classify(tensor);
    tensor.dispose(); // Free memory

    console.log("Predictions:", predictions);

    // 5. Map to Knowledge Base
    // Find the best match between top predictions and our labels
    for (const pred of predictions) {
      const label = pred.className.toLowerCase();
      for (const [key, part] of Object.entries(LABEL_MAPPING)) {
        if (label.includes(key)) {
          return {
            part: part,
            confidence: pred.probability,
            originalLabel: label
          };
        }
      }
    }

    // Default if no specific match
    return {
      part: "unknown part",
      confidence: predictions[0].probability,
      originalLabel: predictions[0].className
    };
  } catch (error) {
    console.error("Classification error:", error);
    throw error;
  }
};

module.exports = { classifyImage };
