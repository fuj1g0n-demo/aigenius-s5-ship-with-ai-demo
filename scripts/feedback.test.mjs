import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { FEEDBACK_LIMITS, loadSubmissions, saveSubmission } from '../src/lib/feedback.js';

beforeEach((t) => {
  const entries = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
});

test('feedback submissions persist trimmed text and their topic', () => {
  const saved = saveSubmission(' Ada ', ' Code review ', '\nCheck the diff\n');
  assert.equal(saved.length, 1);
  assert.deepEqual(loadSubmissions(), saved);
  assert.deepEqual(
    { name: saved[0].name, topic: saved[0].topic, message: saved[0].message },
    { name: 'Ada', topic: 'Code review', message: 'Check the diff' },
  );
  assert.ok(!Number.isNaN(Date.parse(saved[0].submittedAt)));
});

test('anonymous feedback is allowed', () => {
  assert.equal(saveSubmission('   ', 'Topic', 'Message')[0].name, '');
});

test('topic and message must contain non-whitespace text', () => {
  for (const value of ['', ' \n\t ']) {
    assert.throws(() => saveSubmission('Ada', value, 'Message'), /Topic is required/);
    assert.throws(() => saveSubmission('Ada', 'Topic', value), /Message is required/);
  }
  assert.deepEqual(loadSubmissions(), []);
});

test('each field rejects non-text inputs without writing', () => {
  for (const index of [0, 1, 2]) {
    for (const value of [null, undefined, 42, {}, new Blob(['text'])]) {
      const fields = ['Ada', 'Topic', 'Message'];
      fields[index] = value;
      assert.throws(() => saveSubmission(...fields), /must be text/);
    }
  }
  assert.deepEqual(loadSubmissions(), []);
});

test('length limits accept the boundary and reject one extra character', () => {
  const fields = Object.values(FEEDBACK_LIMITS).map((limit) => 'x'.repeat(limit));
  saveSubmission(...fields);
  for (const index of [0, 1, 2]) {
    const oversized = [...fields];
    oversized[index] += 'x';
    assert.throws(() => saveSubmission(...oversized), /characters or fewer/);
  }
  assert.equal(loadSubmissions().length, 1);
});

test('legacy feedback is preserved when a new entry is saved', () => {
  const legacy = { name: 'Ada', message: 'Earlier feedback', submittedAt: '2026-09-01T00:00:00Z' };
  localStorage.setItem('ship-with-ai-feedback', JSON.stringify([legacy]));
  const saved = saveSubmission('Grace', 'Topic', 'Message');
  assert.deepEqual(saved[0], legacy);
  assert.equal(saved.length, 2);
});

test('invalid stored data is reported without overwriting it', () => {
  for (const raw of ['not JSON', '{}', 'null']) {
    localStorage.setItem('ship-with-ai-feedback', raw);
    assert.throws(() => saveSubmission('Ada', 'Topic', 'Message'), /Saved feedback is unreadable/);
    assert.equal(localStorage.getItem('ship-with-ai-feedback'), raw);
  }
});

test('storage write and read errors reach the caller', (t) => {
  const quotaError = new DOMException('Storage full', 'QuotaExceededError');
  t.mock.method(localStorage, 'setItem', () => { throw quotaError; });
  assert.throws(() => saveSubmission('Ada', 'Topic', 'Message'), (error) => error === quotaError);
  assert.deepEqual(loadSubmissions(), []);

  const accessError = new DOMException('Storage blocked', 'SecurityError');
  t.mock.method(localStorage, 'getItem', () => { throw accessError; });
  assert.throws(() => loadSubmissions(), (error) => error === accessError);
  assert.throws(() => saveSubmission('Ada', 'Topic', 'Message'), (error) => error === accessError);
});
