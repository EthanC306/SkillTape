import React from "react";
import { PALETTE, MONO } from "../data/theme";
import AuthBar from "./AuthBar";

/**
 * Header — top bar with the app logo (click = home), the open topic's title,
 * and the account control on the right (see AuthBar).
 *
 * auth is the { user, login, signup, logout } object from useAuth, threaded
 * straight through from App — Header itself has no auth logic of its own.
 */
export default function Header({ topic, onHome, auth }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <span
        onClick={onHome}
        title="Back to topic list"
        style={{ cursor: "pointer", fontFamily: MONO, fontSize: 18, fontWeight: 700, color: PALETTE.accent }}
      >
        &gt;_ skill.tape
      </span>
      {topic && (
        <span style={{ fontFamily: MONO, fontSize: 13, color: PALETTE.muted }}>
          / {topic.title}
        </span>
      )}
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
        question what you know
      </span>
      {auth && (
        <AuthBar
          user={auth.user}
          onLogin={auth.login}
          onSignup={auth.signup}
          onLogout={auth.logout}
        />
      )}
    </div>
  );
}
