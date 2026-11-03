import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(root, 'content', 'trivia', 'questions.csv');
const letters = 'WXYZ';

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value); value = '';
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function normalizeQuestion(row, indexes) {
  const get = name => row[indexes[name]]?.trim() || '';
  if (get('format') !== 'Multiple Choice') return null;
  const choices = ['w', 'x', 'y', 'z'].map(name => get(name));
  const answerLetter = get('answer')[0];
  const answer = letters.indexOf(answerLetter);
  if (answer < 0 || choices.some(choice => !choice || choice.length > 80)) return null;
  const prompt = get('question').replace(/\s+/g, ' ').trim();
  if (!prompt || prompt.length > 700) return null;
  const subject = get('subject').toLowerCase().replace(/\s+/g, '-');
  return {
    id: `bowl-${get('id')}`,
    category: subject || 'general-science',
    prompt,
    choices,
    answer,
    explanation: `The correct answer is ${choices[answer]}. This is a ${subject || 'general science'} question from the imported question bank.`,
    difficulty: 'hard',
  };
}

export function loadImportedQuestions() {
  if (!fs.existsSync(csvPath)) return [];
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const headers = rows.shift()?.map(value => value.trim()) || [];
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const seen = new Set();
  return rows.map(row => normalizeQuestion(row, indexes)).filter(question => {
    if (!question || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}
