import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import analyzeRoute from './routes/analyze.js';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createCaseStore } from './caseStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

const SaveCaseSchema = z.object({
  diagnosis: z.object({
    part: z.string().min(1),
    diagnosis: z.string().min(1),
    solutions: z.array(z.string().min(1)).min(1).max(10),
    tools: z.array(z.string().min(1)).min(1).max(10),
    risk: z.enum(['Low', 'Medium', 'High', 'Unknown']),
    confidence: z.number().min(0).max(1).optional(),
    originalLabel: z.string().optional(),
  }),
  image: z.string().min(1),
});

const CaseRecordSchema = SaveCaseSchema.extend({
  id: z.string().min(1),
  savedAt: z.string().datetime().or(z.string().min(1)),
});

const parseAllowedOrigins = (rawValue) => {
  const raw = rawValue || process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wildcardToRegex = (pattern) => {
  const escaped = pattern
    .split('*')
    .map((segment) => escapeRegex(segment))
    .join('.*');
  return new RegExp(`^${escaped}$`);
};

const createCorsOptions = (patterns) => {
  const allowedOriginMatchers = parseAllowedOrigins(patterns).map((pattern) => {
    if (pattern === '*') return { type: 'any' };
    if (pattern.includes('*')) return { type: 'wildcard', regex: wildcardToRegex(pattern) };
    return { type: 'exact', value: pattern };
  });

  const isOriginAllowed = (origin) => {
    if (!origin) return true;

    // If no allowlist is configured, allow all origins to prevent accidental production lockout.
    if (!allowedOriginMatchers.length) return true;

    return allowedOriginMatchers.some((matcher) => {
      if (matcher.type === 'any') return true;
      if (matcher.type === 'exact') return matcher.value === origin;
      return matcher.regex.test(origin);
    });
  };

  return {
    origin(origin, callback) {
      return callback(null, isOriginAllowed(origin));
    },
  };
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

const createRateLimiter = ({ windowMs, maxRequests }) => {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const current = buckets.get(ip);

    if (!current || now > current.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Try again in ${retryAfterSeconds} seconds`,
      });
    }

    return next();
  };
};

const createOptionalApiKeyAuth = (requiredApiKey) => (req, res, next) => {
  if (!requiredApiKey) return next();

  const provided = req.headers['x-api-key'];
  if (provided === requiredApiKey) return next();

  return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid API key' });
};

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

export const createApp = (options = {}) => {
  const app = express();
  const caseStorageFile = options.caseStorageFile || process.env.CASE_STORAGE_FILE || path.resolve(__dirname, '../tmp/cases.ndjson');
  const corsOptions = createCorsOptions(options.frontendUrls);
  const optionalApiKeyAuth = createOptionalApiKeyAuth(options.apiKey ?? process.env.API_KEY);
  const caseStore = options.caseStore || createCaseStore({
    caseStorageFile,
    driver: options.caseStorageDriver,
    fetchImpl: options.fetchImpl,
    parseRecord: (value) => CaseRecordSchema.parse(value),
    storagePrefix: options.caseStoragePrefix,
  });

  // Middleware
  app.use(cors(corsOptions));
  app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for base64 images

  // Routes
  const analyzeRateLimiter = createRateLimiter({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_ANALYZE || 20),
  });

  const saveCaseRateLimiter = createRateLimiter({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_SAVE_CASE || 30),
  });

  app.use('/analyze', analyzeRateLimiter, optionalApiKeyAuth, analyzeRoute);

  app.post('/save-case', saveCaseRateLimiter, optionalApiKeyAuth, async (req, res) => {
    try {
      const payload = SaveCaseSchema.parse(req.body?.data);
      const record = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        diagnosis: payload.diagnosis,
        image: payload.image,
      };

      await caseStore.saveCase(record);
      return res.json({ success: true, message: 'Case saved', case: record });
    } catch (error) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid case payload', message: error.message });
      }
      return res.status(500).json({ error: 'Failed to save case', message: error.message });
    }
  });

  app.get('/cases', optionalApiKeyAuth, async (req, res) => {
    try {
      const limit = parsePositiveInt(req.query.limit, 50, 200);
      const result = await caseStore.listCases(limit);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load saved cases', message: error.message });
    }
  });

  app.get('/cases/:id', optionalApiKeyAuth, async (req, res) => {
    try {
      const record = await caseStore.getCase(req.params.id);

      if (!record) {
        return res.status(404).json({ error: 'Case not found', message: 'No saved case matches that id' });
      }

      return res.json({ case: record });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load saved case', message: error.message });
    }
  });

  app.get('/health', async (req, res) => {
    const savedCases = await caseStore.countCases().catch(() => 0);
    res.json({ status: 'ok', savedCases, storage: caseStore.kind });
  });

  return app;
};

const app = createApp();

// Start the server (using a more ESM-friendly check)
const isMain = import.meta.url.startsWith('file:');
if (isMain && process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;
