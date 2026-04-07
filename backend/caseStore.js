import fs from 'fs/promises';
import path from 'path';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const createStorageError = (message, cause) => {
  const error = new Error(message);
  error.cause = cause;
  return error;
};

const parseLimit = (value, fallback = 50) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const createFileCaseStore = ({ filePath, parseRecord }) => {
  let caseWriteQueue = Promise.resolve();

  const readAllRecords = async () => {
    await caseWriteQueue;

    let raw = '';
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }

    const records = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        records.push(parseRecord(JSON.parse(trimmed)));
      } catch (error) {
        console.warn('Skipping malformed saved case record:', error?.message || error);
      }
    }

    return records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  };

  return {
    kind: 'file',
    async saveCase(record) {
      caseWriteQueue = caseWriteQueue.then(async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
      });

      await caseWriteQueue;
      return record;
    },
    async listCases(limit = 50) {
      const records = await readAllRecords();
      return {
        cases: records.slice(0, parseLimit(limit)),
        total: records.length,
      };
    },
    async getCase(id) {
      const records = await readAllRecords();
      return records.find((record) => record.id === id) || null;
    },
    async countCases() {
      const records = await readAllRecords();
      return records.length;
    },
  };
};

export const createUpstashCaseStore = ({
  url,
  token,
  prefix = 'gearmind:cases',
  fetchImpl = fetch,
  parseRecord,
}) => {
  if (!url || !token) {
    throw new Error('Upstash case storage requires a REST URL and token');
  }

  const baseUrl = trimTrailingSlash(url);
  const indexKey = `${prefix}:index`;
  const recordKey = (id) => `${prefix}:record:${id}`;

  const requestBatch = async (endpoint, commands) => {
    const response = await fetchImpl(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    const text = await response.text();
    let payload = [];
    try {
      payload = text ? JSON.parse(text) : [];
    } catch (error) {
      throw createStorageError(`Failed to parse Upstash response: ${text}`, error);
    }

    if (!response.ok) {
      const message = Array.isArray(payload)
        ? payload.find((entry) => entry?.error)?.error
        : payload?.error;
      throw new Error(message || `Upstash request failed with status ${response.status}`);
    }

    return Array.isArray(payload) ? payload : [payload];
  };

  const extractResults = (payload) => payload.map((entry) => {
    if (entry?.error) {
      throw new Error(entry.error);
    }
    return entry?.result;
  });

  const parseStoredRecord = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    return parseRecord(JSON.parse(value));
  };

  return {
    kind: 'upstash',
    async saveCase(record) {
      const score = Date.parse(record.savedAt) || Date.now();
      const payload = await requestBatch('/multi-exec', [
        ['SET', recordKey(record.id), JSON.stringify(record)],
        ['ZADD', indexKey, score, record.id],
      ]);

      extractResults(payload);
      return record;
    },
    async listCases(limit = 50) {
      const safeLimit = Math.max(1, parseLimit(limit));
      const [idsPayload, totalPayload] = await Promise.all([
        requestBatch('/pipeline', [['ZREVRANGE', indexKey, 0, safeLimit - 1]]),
        requestBatch('/pipeline', [['ZCARD', indexKey]]),
      ]);

      const [ids] = extractResults(idsPayload);
      const [total] = extractResults(totalPayload);
      const recordIds = Array.isArray(ids) ? ids : [];

      if (!recordIds.length) {
        return { cases: [], total: Number(total) || 0 };
      }

      const recordsPayload = await requestBatch(
        '/pipeline',
        recordIds.map((id) => ['GET', recordKey(id)]),
      );

      const cases = extractResults(recordsPayload)
        .map((value) => {
          try {
            return parseStoredRecord(value);
          } catch (error) {
            console.warn('Skipping malformed Upstash saved case record:', error?.message || error);
            return null;
          }
        })
        .filter(Boolean);

      return {
        cases,
        total: Number(total) || cases.length,
      };
    },
    async getCase(id) {
      const payload = await requestBatch('/pipeline', [['GET', recordKey(id)]]);
      const [record] = extractResults(payload);
      if (record == null) return null;
      return parseStoredRecord(record);
    },
    async countCases() {
      const payload = await requestBatch('/pipeline', [['ZCARD', indexKey]]);
      const [count] = extractResults(payload);
      return Number(count) || 0;
    },
  };
};

export const createCaseStore = ({ caseStorageFile, driver, fetchImpl, parseRecord, storagePrefix } = {}) => {
  const selectedDriver = driver || process.env.CASE_STORAGE_DRIVER || 'auto';
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (selectedDriver === 'upstash' || (selectedDriver === 'auto' && upstashUrl && upstashToken)) {
    return createUpstashCaseStore({
      url: upstashUrl,
      token: upstashToken,
      prefix: storagePrefix || process.env.CASE_STORAGE_PREFIX || 'gearmind:cases',
      fetchImpl,
      parseRecord,
    });
  }

  if (selectedDriver !== 'auto' && selectedDriver !== 'file') {
    throw new Error(`Unsupported case storage driver: ${selectedDriver}`);
  }

  return createFileCaseStore({
    filePath: caseStorageFile,
    parseRecord,
  });
};
