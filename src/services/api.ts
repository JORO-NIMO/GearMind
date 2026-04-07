const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
const API_KEY = import.meta.env.VITE_API_KEY;

export interface AnalysisResponse {
  part: string;
  confidence: number;
  diagnosis: string;
  solutions: string[];
  tools: string[];
  risk: "Low" | "Medium" | "High" | "Unknown";
  originalLabel?: string;
}

export interface SavedCase {
  id: string;
  savedAt: string;
  diagnosis: AnalysisResponse;
  image: string;
}

const createHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  return headers;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Backend failed');
  }

  return await response.json();
};

/**
 * Analyzes an image using the backend AI pipeline.
 */
export const analyzeImage = async (image: string): Promise<AnalysisResponse> => {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ image }),
  });

  return await parseJson<AnalysisResponse>(response);
};

/**
 * Saves a diagnostic case.
 */
export const saveCase = async (data: { diagnosis: AnalysisResponse; image: string }) => {
  const response = await fetch(`${API_BASE_URL}/save-case`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ data }),
  });

  return await parseJson<{ success: true; message: string; case: SavedCase }>(response);
};

export const listCases = async (limit = 50) => {
  const response = await fetch(`${API_BASE_URL}/cases?limit=${limit}`, {
    headers: createHeaders(),
  });

  return await parseJson<{ cases: SavedCase[]; total: number }>(response);
};

export const getCase = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/cases/${id}`, {
    headers: createHeaders(),
  });

  return await parseJson<{ case: SavedCase }>(response);
};
