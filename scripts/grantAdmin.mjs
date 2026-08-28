// Grant or revoke the content-editing flag on an account.
//
//   node scripts/grantAdmin.mjs you@example.com          # grant
//   node scripts/grantAdmin.mjs you@example.com --revoke # revoke
//   node scripts/grantAdmin.mjs --list                   # who has it
//
// Admin means exactly one thing here: may edit SHARED content (the two Edit
// Mode routes in server/routes/topics.js). It confers nothing over other
// accounts' data — that isolation is enforced by user_id on every query and is
// not something a flag can override.
//
// There is deliberately no way to do this from inside the app. Self-promotion
// through the UI would only be safe if it were already gated on being an admin,
// which is circular; a shell on the box is the real trust boundary for a
// self-hosted install.
import db from "../server/db.js";

const args = process.argv.slice(2);
const list = args.includes("--list");
const revoke = args.includes("--revoke");
const email = args.find((a) => !a.startsWith("--"));

function show() {
  const rows = db.prepare("SELECT id, email, is_admin FROM users ORDER BY id").all();
  if (rows.length === 0) return console.log("There are no accounts yet.");
  console.log("\nid   admin  email");
  for (const r of rows) {
    console.log(String(r.id).padEnd(4), (r.is_admin ? " yes " : "  no ").padEnd(6), r.email);
  }
}

if (list) {
  show();
  process.exit(0);
}

if (!email) {
  console.error("usage: node scripts/grantAdmin.mjs <email> [--revoke]");
  console.error("       node scripts/grantAdmin.mjs --list");
  process.exit(1);
}

const user = db.prepare("SELECT id, email, is_admin FROM users WHERE email = ?").get(email);
if (!user) {
  console.error(`No account with email "${email}".`);
  show();
  process.exit(1);
}

// Refuse to remove the last admin: nobody could edit content afterwards, and
// nobody could grant the flag back from inside the app either.
if (revoke) {
  const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1").get().n;
  if (user.is_admin && admins <= 1) {
    console.error(
      `Refusing to revoke: ${user.email} is the only admin, and content would ` +
        `become uneditable. Grant the flag to another account first.`
    );
    process.exit(1);
  }
}

db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(revoke ? 0 : 1, user.id);
console.log(`${revoke ? "Revoked" : "Granted"} content-editing on ${user.email}.`);
show();
