import fs from 'node:fs';
import path from 'node:path';

const directory = path.resolve('content/lore');
const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(file => file.endsWith('.json')).sort() : [];
const errors = [];

for (const file of files) {
  const filePath = path.join(directory, file);
  const source = fs.readFileSync(filePath, 'utf8');
  if (source.charCodeAt(0) === 0xfeff) errors.push(`${file}: remove the UTF-8 BOM`);
  if (!source.endsWith('\n')) errors.push(`${file}: must end with a newline`);
  if (source.includes('\r')) errors.push(`${file}: use LF line endings`);
  source.split('\n').forEach((line, index) => {
    if (/\t/.test(line)) errors.push(`${file}:${index + 1}: use spaces instead of tabs`);
    if (/\s+$/.test(line)) errors.push(`${file}:${index + 1}: remove trailing whitespace`);
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) errors.push(`${file}: top level must be an object`);
    if (!Array.isArray(parsed?.entries) || parsed.entries.length === 0) errors.push(`${file}: entries must be a non-empty array`);
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Lore format check passed for ${files.length} JSON file${files.length === 1 ? '' : 's'}.`);
}
