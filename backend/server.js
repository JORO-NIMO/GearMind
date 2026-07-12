import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import analyzeRoute from './routes/analyze.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const CASE_STORAGE_FILE = process.env.CASE_STORAGE_FILE || (process.env.VERCEL ? '/tmp/cases.ndjson' : path.resolve(__dirname, '../tmp/cases.ndjson'));

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

const parseAllowedOrigins = () => {
  const raw = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
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

const allowedOriginMatchers = parseAllowedOrigins().map((pattern) => {
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

const corsOptions = {
  origin(origin, callback) {
    return callback(null, isOriginAllowed(origin));
  },
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

const optionalApiKeyAuth = (req, res, next) => {
  const requiredApiKey = process.env.API_KEY;
  if (!requiredApiKey) return next();

  const provided = req.headers['x-api-key'];
  if (provided === requiredApiKey) return next();

  return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid API key' });
};


let caseWriteQueue = Promise.resolve();
const enqueueCaseWrite = (record) => {
  caseWriteQueue = caseWriteQueue.then(async () => {
    await fs.mkdir(path.dirname(CASE_STORAGE_FILE), { recursive: true });
    await fs.appendFile(CASE_STORAGE_FILE, `${JSON.stringify(record)}\n`, 'utf8');
  });
  return caseWriteQueue;
};

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

    await enqueueCaseWrite(record);
    return res.json({ success: true, message: 'Case saved', id: record.id, savedAt: record.savedAt });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid case payload', message: error.message });
    }
    return res.status(500).json({ error: 'Failed to save case', message: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server (using a more ESM-friendly check)
const isMain = import.meta.url.startsWith('file:');
if (isMain && process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;
