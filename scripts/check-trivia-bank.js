import assert from 'node:assert/strict';
import { importedQuestionStats } from '../src/trivia-bank.js';
import { questions } from '../src/questions.js';

const imported = questions.filter(question => question.id.startsWith('bowl-'));
const stats = importedQuestionStats();
assert.ok(stats.rows > 40_000, `Expected the supplied CSV to contain many rows; got ${stats.rows}.`);
assert.equal(stats.duplicates, 0, 'Trivia CSV contains duplicate IDs.');
assert.equal(new Set(imported.map(question => question.id)).size, imported.length, 'Loaded trivia IDs are not unique.');
for (const question of imported) {
  assert.equal(question.choices.length, 4, `${question.id} does not have four choices.`);
  assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, `${question.id} has an invalid answer index.`);
}
console.log(`Trivia bank valid: ${stats.imported} imported, ${stats.skipped} skipped, ${stats.duplicates} duplicate IDs.`);
