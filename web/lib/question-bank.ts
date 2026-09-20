import source from '@/data/question-bank.json';

export const questionBank = source;
export const questions = source.items;
export const responseOptions = source.options;
export const bankVersion = source.source_sha256;
const ids = new Set(questions.map(item => item.item_id));
const values = new Set(responseOptions.map(option => option.value));

export function validateAnswers(input: unknown): input is Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  return Object.entries(input).every(([id, value]) => ids.has(id) && typeof value === 'number' && Number.isInteger(value) && values.has(value));
}

export function isComplete(answers: Record<string, number>) {
  return validateAnswers(answers) && questions.every(item => answers[item.item_id] !== undefined);
}

export function validItemIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < questions.length;
}
