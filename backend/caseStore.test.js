import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpstashCaseStore } from './caseStore.js';

test('upstash case store persists and retrieves cases through REST commands', async () => {
  const savedRecords = new Map();
  const orderedIds = [];

  const fetchImpl = async (url, options) => {
    const endpoint = new URL(url).pathname;
    const commands = JSON.parse(options.body);

    if (endpoint === '/multi-exec') {
      for (const command of commands) {
        if (command[0] === 'SET') {
          savedRecords.set(command[1], command[2]);
        }

        if (command[0] === 'ZADD') {
          orderedIds.unshift(command[3]);
        }
      }

      return new Response(JSON.stringify(commands.map(() => ({ result: 'OK' }))), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (endpoint === '/pipeline') {
      const results = commands.map((command) => {
        if (command[0] === 'ZREVRANGE') {
          return { result: orderedIds.slice(Number(command[2]), Number(command[3]) + 1) };
        }

        if (command[0] === 'ZCARD') {
          return { result: orderedIds.length };
        }

        if (command[0] === 'GET') {
          return { result: savedRecords.get(command[1]) ?? null };
        }

        return { error: `Unhandled command ${command[0]}` };
      });

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unexpected endpoint' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const store = createUpstashCaseStore({
    url: 'https://example.upstash.io',
    token: 'secret',
    fetchImpl,
    parseRecord: (value) => value,
    prefix: 'test:cases',
  });

  const record = {
    id: 'case-1',
    savedAt: '2026-04-07T10:00:00.000Z',
    diagnosis: {
      part: 'alternator',
      originalLabel: 'alternator housing',
      diagnosis: 'Charging system output looks weak.',
      solutions: ['Test output voltage', 'Replace alternator if output remains low'],
      tools: ['multimeter', 'socket set'],
      risk: 'Medium',
      confidence: 0.77,
    },
    image: 'data:image/jpeg;base64,ZmFrZQ==',
  };

  await store.saveCase(record);

  const listed = await store.listCases(10);
  assert.equal(listed.total, 1);
  assert.equal(listed.cases[0].id, record.id);

  const detailed = await store.getCase(record.id);
  assert.equal(detailed.diagnosis.part, 'alternator');
  assert.equal(await store.countCases(), 1);
});
