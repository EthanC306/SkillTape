import React from "react";
import { PALETTE, MONO } from "../data/theme";
import SettingsMenu from "./SettingsMenu";

/**
 * Header — top bar with the app logo (click = home) and the open topic's
 * title. The account control (see AuthBar) and the theme picker now live
 * inside SettingsMenu's gear panel, fixed to the top of the page, rather
 * than inline here.
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
      {auth && <SettingsMenu auth={auth} />}
    </div>
  );
}
