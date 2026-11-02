import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseCsvLine(line) {
  const fields = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { fields.push(value); value = ''; }
    else value += char;
  }
  if (quoted) throw new Error('Instructor CSV has an unclosed quoted value.');
  fields.push(value); return fields;
}

export function parseInstructorCsv(text) {
  const rows = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  const headers = rows.shift()?.map(value => value.trim());
  const required = ['role_id', 'role_name', 'instructor_user_id', 'instructor_tag'];
  if (!headers) throw new Error('Instructor CSV is empty.');
  const indexes = Object.fromEntries(required.map(name => [name, headers.indexOf(name)]));
  if (Object.values(indexes).some(index => index < 0)) throw new Error('Instructor CSV is missing required columns.');
  const courses = new Map();
  for (const row of rows) {
    const [roleId, roleName, userId, username] = required.map(name => row[indexes[name]]?.trim() || '');
    if (!roleId || !roleName || !userId || !username) continue;
    const course = courses.get(roleId) || { name: roleName, roleId, roleName, instructors: [] };
    if (!course.instructors.some(instructor => instructor.userId === userId)) course.instructors.push({ userId, username });
    courses.set(roleId, course);
  }
  if (!courses.size) throw new Error('Instructor CSV has no complete course rows.');
  return [...courses.values()];
}

export function loadRepositoryInstructorCsv() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return parseInstructorCsv(fs.readFileSync(path.join(repositoryRoot, 'Sciovirtual database - Sheet1.csv'), 'utf8'));
}
