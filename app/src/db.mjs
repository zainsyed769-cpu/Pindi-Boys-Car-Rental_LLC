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

let depth = 0;

/**
 * Run fn inside a transaction, rolling back on any throw.
 *
 * Re-entrant. SQLite has no nested BEGIN, but the ledger composes: reversing an
 * entry has to void the original and post its mirror as one unit, and posting
 * is itself transactional. A nested call therefore takes a SAVEPOINT, so an
 * inner failure unwinds only its own work and an outer failure still takes the
 * whole thing with it.
 */
export function tx(fn) {
  const d = open();
  const nested = depth > 0;
  const name = `sp_${depth}`;
  d.exec(nested ? `SAVEPOINT ${name}` : 'BEGIN');
  depth += 1;
  try {
    const out = fn();
    d.exec(nested ? `RELEASE ${name}` : 'COMMIT');
    return out;
  } catch (err) {
    // ROLLBACK TO leaves the savepoint in place, so it is released straight
    // after; otherwise it would sit on the stack and break the next unwind.
    d.exec(nested ? `ROLLBACK TO ${name}; RELEASE ${name}` : 'ROLLBACK');
    throw err;
  } finally {
    depth -= 1;
  }
}
