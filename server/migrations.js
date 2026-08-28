// One-way structural migrations that CREATE TABLE IF NOT EXISTS cannot express.
//
// db.js's ensureColumn() handles the easy half of schema drift: adding a column.
// This file handles the half SQLite has no syntax for. There is no
// `ALTER TABLE ... ALTER COLUMN SET NOT NULL` and no `ADD CONSTRAINT`, so
// tightening a column means the documented 12-step rebuild — create a correctly
// shaped table, copy the rows in, drop the original, rename — inside one
// transaction with foreign keys disabled around it.
//
// Kept out of db.js because it is a different KIND of operation: ensureColumn is
// additive and can never lose data, while everything here rewrites a table and
// therefore has to be reasoned about as a migration with a failure mode.

/** Tables whose user_id must become NOT NULL REFERENCES users(id) ON DELETE CASCADE. */
const OWNED_TABLES = [
  "attempts",
  "item_review_state",
  "item_attempts",
  "item_suspensions",
  "scheduler_settings",
  "ui_settings",
];

// Preferences are regenerated the moment the user touches the relevant control,
// so an orphaned row is worth nothing and is dropped without ceremony. HISTORY
// is not: it cannot be reconstructed, so an orphan there stops the boot instead
// (see claimOrphans below). The split is the whole safety story of this file.
const DISPOSABLE = new Set(["scheduler_settings", "ui_settings"]);

/** Does `table`.user_id already have the NOT NULL + FK shape we want? */
function isLocked(db, table) {
  const col = db.prepare(`PRAGMA table_info(${table})`).all().find((c) => c.name === "user_id");
  if (!col) return true; // table doesn't own rows; nothing to do
  const hasFk = db
    .prepare(`PRAGMA foreign_key_list(${table})`)
    .all()
    .some((fk) => fk.table === "users" && fk.from === "user_id");
  // dflt_value must be gone too: a DEFAULT 0 left in place would let an INSERT
  // that omits user_id resurrect the exact sentinel this change removes.
  return col.notnull === 1 && hasFk && col.dflt_value == null;
}

/**
 * Rows that belong to nobody: the retired `user_id = 0` sentinel, SQL NULL, or
 * an id with no surviving `users` row.
 *
 * @returns {Record<string, number>} table -> orphan count, omitting zeroes
 */
export function countOrphans(db) {
  const out = {};
  for (const table of OWNED_TABLES) {
    const { n } = db
      .prepare(
        `SELECT COUNT(*) AS n FROM ${table}
          WHERE user_id IS NULL
             OR user_id NOT IN (SELECT id FROM users)`
      )
      .get();
    if (n > 0) out[table] = n;
  }
  return out;
}

/**
 * Reassign every orphaned row to `userId`. The "migrate the anonymous bucket
 * into a named account" step, factored out so scripts/claimAnonymousData.mjs
 * and the boot path below can share one implementation.
 *
 * @returns {Record<string, number>} table -> rows moved
 */
export function claimOrphans(db, userId, { tables = OWNED_TABLES } = {}) {
  const moved = {};
  const run = db.transaction(() => {
    for (const table of tables) {
      // A user may already own a row for the same primary key — they drilled the
      // item logged in as well as logged out. The composite-PK tables would
      // throw on the collision, so the doomed anonymous copy is deleted rather
      // than allowed to abort the whole claim. The logged-in row is the better
      // record in every case: it is the one the account has actually been
      // scheduling against.
      if (table === "item_review_state" || table === "item_suspensions") {
        db.prepare(
          `DELETE FROM ${table}
            WHERE (user_id IS NULL OR user_id NOT IN (SELECT id FROM users))
              AND item_id IN (SELECT item_id FROM ${table} WHERE user_id = ?)`
        ).run(userId);
      } else if (table === "scheduler_settings" || table === "ui_settings") {
        db.prepare(
          `DELETE FROM ${table}
            WHERE (user_id IS NULL OR user_id NOT IN (SELECT id FROM users))
              AND EXISTS (SELECT 1 FROM ${table} WHERE user_id = ?)`
        ).run(userId);
      }

      const info = db
        .prepare(
          `UPDATE ${table} SET user_id = ?
            WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM users)`
        )
        .run(userId);
      if (info.changes > 0) moved[table] = info.changes;
    }
  });
  run();
  return moved;
}

/** Rebuild one table with a NOT NULL, foreign-keyed, default-less user_id. */
function rebuild(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const names = cols.map((c) => c.name);

  // Re-declare the table from its live shape rather than from a hardcoded DDL
  // string. schema.sql plus db.js's ensureColumn()s are what actually produced
  // this table, and a second copy of that DDL here would drift the first time
  // someone adds a column.
  const decls = cols.map((c) => {
    if (c.name === "user_id") {
      return "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE";
    }
    let d = `${c.name} ${c.type}`;
    if (c.notnull) d += " NOT NULL";
    if (c.dflt_value != null) d += ` DEFAULT ${c.dflt_value}`;
    return d;
  });

  // AUTOINCREMENT is deliberately NOT preserved. It only guarantees ids are
  // never reused, which nothing here relies on — `attempts.question_id` is
  // already documented as a legacy surrogate, and the identities that matter
  // (items.id, questions.stable_id, topics.id) are authored TEXT.
  const pk = cols.filter((c) => c.pk).sort((a, b) => a.pk - b.pk);
  if (pk.length === 1 && /INTEGER/i.test(pk[0].type)) {
    const i = names.indexOf(pk[0].name);
    // APPEND to the existing declaration rather than replacing it. On
    // scheduler_settings and ui_settings the single INTEGER primary key IS
    // user_id, so overwriting the declaration here silently discarded the
    // NOT NULL and the foreign key this whole function exists to add — and
    // left the column a rowid alias, which SQLite happily auto-fills when an
    // INSERT omits it. That is the sentinel coming back under another name:
    // an unowned settings row, created by a write that named no user.
    decls[i] = `${decls[i]} PRIMARY KEY`;
  } else if (pk.length > 1) {
    decls.push(`PRIMARY KEY (${pk.map((c) => c.name).join(", ")})`);
  }

  const list = names.join(", ");
  db.exec(`
    CREATE TABLE ${table}__new (${decls.join(",\n      ")});
    INSERT INTO ${table}__new (${list}) SELECT ${list} FROM ${table};
    DROP TABLE ${table};
    ALTER TABLE ${table}__new RENAME TO ${table};
  `);
}

/**
 * Make the database itself refuse an unowned row.
 *
 * Idempotent: a table already in the target shape is skipped, so this runs on
 * every boot for the same reason schema.sql does.
 *
 * Throws rather than deleting when unclaimed HISTORY exists. Refusing to start
 * is a loud, recoverable failure; quietly dropping someone's drill history is
 * neither, and this function is the last moment that data still exists.
 */
export function lockUserOwnership(db) {
  const pending = OWNED_TABLES.filter((t) => !isLocked(db, t));
  if (pending.length === 0) return { rebuilt: [], dropped: {} };

  const orphans = countOrphans(db);
  const dropped = {};
  for (const table of Object.keys(orphans)) {
    if (!DISPOSABLE.has(table)) {
      throw new Error(
        `Refusing to migrate: ${orphans[table]} row(s) in "${table}" belong to no account ` +
          `(the retired user_id = 0 bucket). This is unrecoverable history, so it will not ` +
          `be dropped automatically.\n` +
          `Run:  node scripts/claimAnonymousData.mjs <email>\n` +
          `to move it onto a real account first, then start the server again.`
      );
    }
    dropped[table] = orphans[table];
  }

  // Indexes name their table, so they must be recreated after the rename.
  // schema.sql's CREATE INDEX IF NOT EXISTS statements do exactly that on the
  // next boot — but db.js runs schema.sql BEFORE this, so re-run them here.
  const indexes = db
    .prepare(
      `SELECT sql FROM sqlite_master
        WHERE type = 'index' AND sql IS NOT NULL AND tbl_name IN (${pending.map(() => "?").join(",")})`
    )
    .all(...pending)
    .map((r) => r.sql);

  // foreign_keys must be OFF around a rebuild: DROP TABLE would otherwise
  // cascade into child rows, and the schema comments already record one
  // incident where a cascade silently wiped FSRS state. It is a no-op inside a
  // transaction, so it is toggled outside one.
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      for (const table of Object.keys(dropped)) {
        db.prepare(
          `DELETE FROM ${table} WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM users)`
        ).run();
      }
      for (const table of pending) rebuild(db, table);
      for (const sql of indexes) db.exec(sql.replace(/^CREATE (UNIQUE )?INDEX /i, "CREATE $1INDEX IF NOT EXISTS "));
    })();

    // Prove the rebuild did not strand a reference before re-arming enforcement.
    const violations = db.pragma("foreign_key_check");
    if (violations.length > 0) {
      throw new Error(`foreign_key_check failed after migration: ${JSON.stringify(violations)}`);
    }
  } finally {
    db.pragma("foreign_keys = ON");
  }

  return { rebuilt: pending, dropped };
}

export { OWNED_TABLES };
