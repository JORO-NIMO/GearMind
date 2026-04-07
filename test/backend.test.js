import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../backend/server.js';
import { classifyImage } from '../models/hfClassifier.js';

const createTempCaseFile = async () => {
  const directory = path.resolve('tmp', `test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, 'cases.ndjson');
};

const startServer = async (app) => {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
};

test('save-case, list cases, and get case by id work together', async () => {
  const caseStorageFile = await createTempCaseFile();
  const { server, baseUrl } = await startServer(createApp({ caseStorageFile }));

  try {
    const payload = {
      diagnosis: {
        part: 'brake pad',
        originalLabel: 'front brake pad',
        diagnosis: 'Brake pad is heavily worn and should be replaced soon.',
        solutions: ['Replace the worn brake pads', 'Inspect the rotor surface before reassembly'],
        tools: ['socket set', 'jack'],
        risk: 'High',
        confidence: 0.91,
      },
      image: 'data:image/jpeg;base64,ZmFrZQ==',
    };

    const saveResponse = await fetch(`${baseUrl}/save-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    });
    assert.equal(saveResponse.status, 200);

    const saved = await saveResponse.json();
    assert.equal(saved.success, true);
    assert.equal(saved.case.diagnosis.part, payload.diagnosis.part);
    assert.ok(saved.case.id);

    const listResponse = await fetch(`${baseUrl}/cases`);
    assert.equal(listResponse.status, 200);
    const listData = await listResponse.json();
    assert.equal(listData.total, 1);
    assert.equal(listData.cases[0].id, saved.case.id);

    const detailResponse = await fetch(`${baseUrl}/cases/${saved.case.id}`);
    assert.equal(detailResponse.status, 200);
    const detailData = await detailResponse.json();
    assert.equal(detailData.case.id, saved.case.id);
    assert.equal(detailData.case.diagnosis.originalLabel, payload.diagnosis.originalLabel);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await fs.rm(path.dirname(caseStorageFile), { recursive: true, force: true });
  }
});

test('case endpoints honor optional api key auth when configured', async () => {
  const caseStorageFile = await createTempCaseFile();
  const { server, baseUrl } = await startServer(createApp({ caseStorageFile, apiKey: 'secret-key' }));

  try {
    const unauthorized = await fetch(`${baseUrl}/cases`);
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(`${baseUrl}/cases`, {
      headers: { 'x-api-key': 'secret-key' },
    });
    assert.equal(authorized.status, 200);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await fs.rm(path.dirname(caseStorageFile), { recursive: true, force: true });
  }
});

test('classifyImage backfills originalLabel from the caption when the model omits it', async () => {
  let callCount = 0;
  const result = await classifyImage('data:image/jpeg;base64,ZmFrZQ==', {
    callHFImpl: async () => {
      callCount += 1;

      if (callCount === 1) {
        return [{ generated_text: 'front brake rotor' }];
      }

      return [{
        generated_text: JSON.stringify({
          part: 'brake rotor',
          diagnosis: 'Rotor surface appears worn and should be inspected for scoring.',
          solutions: ['Inspect rotor thickness', 'Resurface or replace if below spec'],
          tools: ['micrometer', 'socket set'],
          risk: 'Medium',
          confidence: 0.84,
        }),
      }];
    },
  });

  assert.equal(result.originalLabel, 'front brake rotor');
  assert.equal(result.part, 'brake rotor');
});
