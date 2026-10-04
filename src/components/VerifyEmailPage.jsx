import React, { useEffect, useRef, useState } from "react";
import { verifyEmail } from "../api/client";
import { PALETTE, MONO, HEADING, RADII } from "../data/theme";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState(null);
  // StrictMode runs effects twice in dev; the token is single-use, so only POST once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    window.history.replaceState(null, "", "/verify-email");

    if (!token) {
      setStatus("error");
      setError("This link is missing its verification token.");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("verified"))
      .catch((err) => {
        setStatus("error");
        setError(err.message);
      });
  }, []);

  const heading =
    status === "verifying" ? "Verifying…" :
    status === "verified" ? "Your account has been verified" :
    "Verification failed";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: PALETTE.bg,
        color: PALETTE.text,
        padding: 16,
      }}
    >
      <div
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: RADII.lg,
          padding: 32,
          maxWidth: 420,
          width: "100%",
          boxSizing: "border-box",
          textAlign: "center",
          display: "grid",
          gap: 14,
        }}
      >
        <h1
          style={{
            fontFamily: HEADING,
            fontSize: 20,
            margin: 0,
            color: status === "verified" ? PALETTE.good : status === "error" ? PALETTE.bad : PALETTE.text,
          }}
        >
          {heading}
        </h1>

        {status === "verified" && (
          <p style={{ margin: 0, color: PALETTE.muted }}>
            Thanks for confirming your email address. You're all set.
          </p>
        )}
        {status === "error" && (
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: PALETTE.muted }}>{error}</p>
        )}

        {status !== "verifying" && (
          <a
            href="/"
            style={{
              fontFamily: HEADING,
              fontSize: 13,
              color: PALETTE.accent,
              border: `1px solid ${PALETTE.accent}`,
              background: PALETTE.accentSoft,
              borderRadius: RADII.md,
              padding: "8px 16px",
              textDecoration: "none",
              justifySelf: "center",
            }}
          >
            Continue to SkillTape
          </a>
        )}
      </div>
    </div>
  );
}
