// Feedback widget storage + submit handling.

const STORAGE_KEY = 'ship-with-ai-feedback';
export const FEEDBACK_LIMITS = Object.freeze({ name: 100, topic: 120, message: 5000 });

export function loadSubmissions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let submissions;
  try {
    submissions = JSON.parse(raw);
  } catch {
    throw new Error('Saved feedback is unreadable. No feedback has been overwritten.');
  }
  if (!Array.isArray(submissions)) {
    throw new Error('Saved feedback is unreadable. No feedback has been overwritten.');
  }
  return submissions;
}

function validateText(value, field, required) {
  const label = field[0].toUpperCase() + field.slice(1);
  if (typeof value !== 'string') {
    throw new Error(`${label} must be text.`);
  }
  const text = value.trim();
  if (required && !text) {
    throw new Error(`${label} is required.`);
  }
  if (text.length > FEEDBACK_LIMITS[field]) {
    throw new Error(`${label} must be ${FEEDBACK_LIMITS[field]} characters or fewer.`);
  }
  return text;
}

export function saveSubmission(name, topic, message) {
  name = validateText(name, 'name', false);
  topic = validateText(topic, 'topic', true);
  message = validateText(message, 'message', true);
  const submissions = loadSubmissions();
  submissions.push({ name, topic, message, submittedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  return submissions;
}
