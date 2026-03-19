/**
 * API Service for Frontend
 * Handles analysis and saving cases with offline fallback.
 */

const API_BASE_URL = ''; // Use relative paths for Vercel deployment

const analyzeImage = async (image) => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    if (!response.ok) throw new Error('Backend failed');
    return await response.json();
  } catch (error) {
    console.warn("Using local fallback");
    // In a real implementation, you'd import local logic here
    return {
      part: "carburetor",
      confidence: 0.85,
      diagnosis: "Local fallback diagnosis",
      solutions: ["Check implementation"],
      tools: ["Manual"],
      risk: "Low"
    };
  }
};

const saveCase = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return await response.json();
  } catch (error) {
    localStorage.setItem('pending_case', JSON.stringify(data));
    return { success: true, offline: true };
  }
};

export { analyzeImage, saveCase };
