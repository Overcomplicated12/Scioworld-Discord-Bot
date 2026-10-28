import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDirectory = path.join(projectRoot, 'content', 'lore');
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(fileName, message) { throw new Error(`Invalid lore in ${fileName}: ${message}`); }

function validateStory(story, fileName) {
  if (!story || typeof story !== 'object' || Array.isArray(story)) fail(fileName, 'story must be an object');
  for (const field of ['id', 'title', 'author', 'description']) {
    if (typeof story[field] !== 'string' || !story[field].trim()) fail(fileName, `${field} is required`);
  }
  if (!idPattern.test(story.id)) fail(fileName, 'story id must use lowercase kebab-case');
  if (!Array.isArray(story.tags) || story.tags.some(tag => typeof tag !== 'string')) fail(fileName, 'tags must be an array of strings');
  if (!Array.isArray(story.entries) || story.entries.length === 0) fail(fileName, 'entries must be a non-empty array');
  const entryIds = new Set();
  for (const entry of story.entries) {
    if (!entry || typeof entry !== 'object') fail(fileName, 'each entry must be an object');
    for (const field of ['id', 'title', 'text']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) fail(fileName, `each entry needs ${field}`);
    }
    if (!idPattern.test(entry.id)) fail(fileName, `entry id ${entry.id} must use lowercase kebab-case`);
    if (entryIds.has(entry.id)) fail(fileName, `duplicate entry id ${entry.id}`);
    entryIds.add(entry.id);
    if (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string'))) fail(fileName, `entry ${entry.id} tags must be an array of strings`);
  }
  return story;
}

export function loadLore(directory = defaultDirectory) {
  const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(file => file.endsWith('.json')).sort() : [];
  const stories = files.map(file => validateStory(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')), file));
  const storyIds = new Set();
  const entryIds = new Set();
  for (const story of stories) {
    if (storyIds.has(story.id)) fail('collection', `duplicate story id ${story.id}`);
    storyIds.add(story.id);
    for (const entry of story.entries) {
      if (entryIds.has(entry.id)) fail('collection', `duplicate entry id ${entry.id}`);
      entryIds.add(entry.id);
    }
  }
  return { stories, entries: stories.flatMap(story => story.entries.map(entry => ({ ...entry, story }))) };
}
