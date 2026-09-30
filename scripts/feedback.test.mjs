import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSubmissions, saveSubmission } from '../src/lib/feedback.js';

test('feedback submissions persist their topic alongside name and message', () => {
  const entries = new Map();
  globalThis.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  try {
    const saved = saveSubmission('Ada', 'Code review', 'Check the diff');
    assert.equal(saved.length, 1);
    assert.deepEqual(loadSubmissions(), saved);
    assert.deepEqual(
      { name: saved[0].name, topic: saved[0].topic, message: saved[0].message },
      { name: 'Ada', topic: 'Code review', message: 'Check the diff' },
    );
    assert.ok(!Number.isNaN(Date.parse(saved[0].submittedAt)));
  } finally {
    delete globalThis.localStorage;
  }
});
