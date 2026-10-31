import fs from 'node:fs';
import path from 'node:path';

const dataDirectory = path.resolve('data');
const profilePath = path.join(dataDirectory, 'profiles.json');
const backupDirectory = path.join(dataDirectory, 'backups');

export function backupProfileData(nowMs = Date.now(), keep = 14) {
  if (!fs.existsSync(profilePath)) return { created: false, reason: 'missing-data' };
  fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const stamp = new Date(nowMs).toISOString().replace(/[:.]/g, '-');
  const destination = path.join(backupDirectory, `profiles-${stamp}.json`);
  fs.copyFileSync(profilePath, destination);
  const backups = fs.readdirSync(backupDirectory).filter(name => name.startsWith('profiles-') && name.endsWith('.json')).sort().reverse();
  for (const oldBackup of backups.slice(keep)) fs.unlinkSync(path.join(backupDirectory, oldBackup));
  return { created: true, path: destination, retained: Math.min(backups.length, keep) };
}
