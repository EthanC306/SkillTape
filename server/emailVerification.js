import crypto from "crypto";
import db from "./db.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

const deleteTokensForUser = db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?");

const insertToken = db.prepare(
    "INSERT INTO email_verification_tokens (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)"
);

const getToken = db.prepare(
  "SELECT user_id, expires_at FROM email_verification_tokens WHERE token_hash = ?"
);

const markVerified = db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?");

export const createVerificationToken = db.transaction((userId) => {
    // Delete any existing tokens for the user
    deleteTokensForUser.run(userId);

    // Generate a new token
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    insertToken.run(userId, hashToken(token), now, now + TOKEN_TTL_MS);
    
    return token; // Return the raw token to be sent via email
});

export const consumeVerificationToken = db.transaction((token) => {
    const row = getToken.get(hashToken(token));
    if (!row) return null;

    deleteTokensForUser.run(row.user_id);
    if (row.expires_at <= Date.now()) return null;

    markVerified.run(row.user_id);
    return row.user_id;
});