import React, { useState } from "react";
import { resendVerification } from "../api/client";
import { PALETTE, MONO } from "../data/theme";

export default function VerifyNotice() {
  const [state, setState] = useState(null);

  async function resend() {
    setState("sending");
    try {
      const result = await resendVerification();
      setState(result?.alreadyVerified ? "already" : "sent");
    } catch (err) {
      setState(err.message);
    }
  }

  const linkBtn = {
    background: "none",
    border: "none",
    padding: 0,
    color: PALETTE.accent,
    fontFamily: "inherit",
    fontSize: "inherit",
    textDecoration: "underline",
    cursor: "pointer",
  };

  const isError = state && !["sending", "sent", "already"].includes(state);

  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 12,
        color: PALETTE.warn,
        textTransform: "none",
        letterSpacing: "normal",
        textAlign: "center",
      }}
    >
      {state === "already" ? (
        "Already verified. Reload the page."
      ) : state === "sent" ? (
        "Sent! Check your inbox (and spam folder)."
      ) : (
        <>
          Check your inbox to verify your email.{" "}
          <button type="button" onClick={resend} disabled={state === "sending"} style={linkBtn}>
            {state === "sending" ? "Sending…" : "Resend email"}
          </button>
        </>
      )}
      {isError && <div style={{ color: PALETTE.bad, marginTop: 4 }}>{state}</div>}
    </div>
  );
}
