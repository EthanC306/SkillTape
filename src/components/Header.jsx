import React from "react";
import { PALETTE, MONO } from "../data/theme";
import SettingsMenu from "./SettingsMenu";

/**
 * Header — top bar with the app logo (click = home) and the open topic's
 * title. The account control (see AuthBar) and the theme picker now live
 * inside SettingsMenu's gear panel, fixed to the top of the page, rather
 * than inline here.
 *
 * Header no longer carries anything account-related: signing in and out moved
 * to the home screen (src/Shell.jsx), because it decides whose data the WHOLE
 * app shows rather than anything about the course being read.
 */
export default function Header({ topic, onHome }) {
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
      <SettingsMenu />
    </div>
  );
}
