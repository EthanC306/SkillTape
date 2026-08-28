// Move every unowned row onto a real account, so server/migrations.js can then
// lock user_id down to NOT NULL.
//
//   node scripts/claimAnonymousData.mjs you@example.com
//
// "Unowned" means the retired `user_id = 0` sentinel, SQL NULL, or an id whose
// users row is gone. Those are the three ways a row could exist before an
// account owned it; all of them are invisible to every logged-in user, which is
// the bug this whole change fixes.
//
// Idempotent: with nothing to claim it reports so and exits 0.
// Set BEFORE server/db.js is imported: it runs the ownership lockdown at import
// time, and that lockdown THROWS on exactly the condition this script exists to
// clear. Hence the dynamic import below rather than a static one.
process.env.SKILLTAPE_SKIP_LOCK = "1";

const { default: db, DB_PATH } = await import("../server/db.js");
const { claimOrphans, countOrphans } = await import("../server/migrations.js");

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/claimAnonymousData.mjs <email>");
  console.error("       the account must already exist — sign up in the app first.");
  process.exit(1);
}

const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email);
if (!user) {
  const known = db.prepare("SELECT email FROM users ORDER BY id").all().map((r) => r.email);
  console.error(`No account with email "${email}".`);
  console.error(known.length ? `Known accounts:\n  ${known.join("\n  ")}` : "There are no accounts yet.");
  process.exit(1);
}

console.log(`Database: ${DB_PATH}`);
const before = countOrphans(db);
if (Object.keys(before).length === 0) {
  console.log("Nothing to claim — every row already belongs to an account.");
  process.exit(0);
}

console.log("Unowned rows found:");
for (const [table, n] of Object.entries(before)) console.log(`  ${table.padEnd(20)} ${n}`);

const moved = claimOrphans(db, user.id);
console.log(`\nClaimed onto ${user.email} (id ${user.id}):`);
for (const [table, n] of Object.entries(moved)) console.log(`  ${table.padEnd(20)} ${n}`);

const after = countOrphans(db);
if (Object.keys(after).length > 0) {
  // Only reachable if a row collided with one the account already had, in which
  // case claimOrphans deleted the anonymous copy rather than the account's.
  console.log("\nRemaining (superseded by rows the account already owned):", after);
}
console.log("\nDone. Start the server to apply the NOT NULL migration.");
