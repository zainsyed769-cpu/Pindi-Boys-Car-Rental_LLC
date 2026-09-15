import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DB_PATH = process.env.PB_DB ?? join(ROOT, 'data', 'pindiboys.db');

let db;

export function open() {
  if (db) return db;
  db = new DatabaseSync(DB_PATH);
  db.exec(readFileSync(join(ROOT, 'schema.sql'), 'utf8'));
  return db;
}

export const all = (sql, ...p) => open().prepare(sql).all(...p);
export const get = (sql, ...p) => open().prepare(sql).get(...p);
export const run = (sql, ...p) => open().prepare(sql).run(...p);

/** Run fn inside a transaction, rolling back on any throw. */
export function tx(fn) {
  const d = open();
  d.exec('BEGIN');
  try {
    const out = fn();
    d.exec('COMMIT');
    return out;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  }
}
