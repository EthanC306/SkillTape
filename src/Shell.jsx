import React, { useState, useEffect, useRef } from "react";
import App from "./App";
import UpdateBanner from "./components/UpdateBanner";
import useUpdater from "./hooks/useUpdater";
import { COURSES } from "./data/courses";
import { PALETTE, MONO, HEADING, RADII, fadeDivider } from "./data/theme";

// Shared look for the buttons in the bottom bar. `active` highlights the
// button for the course you are currently reading.
function barButtonStyle(active) {
  const style = {
    fontFamily: HEADING,
    fontSize: 13,
    letterSpacing: 1,
    padding: "8px 20px",
    borderRadius: RADII.md,
    cursor: "pointer",
    border: `1px solid ${PALETTE.line}`,
    background: "transparent",
    color: PALETTE.text,
    fontWeight: 500,
  };

  if (active) {
    style.border = `1px solid ${PALETTE.accent}`;
    style.background = PALETTE.accentSoft;
    style.color = PALETTE.accent;
  }

  return style;
}

// One row inside the drop-up menu.
function menuItemStyle(active) {
  const style = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    borderRadius: RADII.sm,
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: PALETTE.text,
  };

  if (active) {
    style.background = PALETTE.accentSoft;
    style.color = PALETTE.accent;
  }

  return style;
}

export default function Shell() {
  // `course` is a course id from COURSES, or null while on the home screen.
  const [course, setCourse] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { appVersion } = useUpdater();

  // Close the menu when you click somewhere else, or press Escape.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  function openCourse(id) {
    setCourse(id);
    setMenuOpen(false);
  }

  function goHome() {
    setCourse(null);
    setMenuOpen(false);
  }

  // The course object for the label on the menu button.
  const selectedCourse = COURSES.find((entry) => entry.id === course);

  let menuLabel = "Choose a class";
  if (selectedCourse) {
    menuLabel = selectedCourse.title;
  }

  let menuArrow = "\u25B4";
  if (menuOpen) {
    menuArrow = "\u25BE";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: PALETTE.bg,
        color: PALETTE.text,
      }}
    >
      <UpdateBanner />

      <div style={{ flex: 1, minHeight: 0 }}>
        {course ? (
          <App key={course} course={course} />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              minHeight: "80vh",
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: PALETTE.muted,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                textTransform: "none",
                letterSpacing: "normal",
                textAlign: "center",
                maxWidth: 480,
              }}
            >
              <img
                src="/icons/256x256.png"
                alt="SkillTape"
                width={96}
                height={96}
                style={{
                  width: 96,
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: RADII.lg,
                  marginBottom: 10,
                }}
              />

              <div
                style={{
                  fontFamily: HEADING,
                  fontSize: 12,
                  fontWeight: 600,
                  color: PALETTE.accent,
                }}
              >
                Question what you know
              </div>

              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 32,
                  color: PALETTE.muted,
                }}
              >
                A quiet place to review your coursework.
              </div>

              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  color: PALETTE.muted,
                }}
              >
                Pick a class below to read through topic notes, drill yourself
                with fill-in-the-blank recall, or run a multiple-choice quiz.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href="https://github.com/EthanC306/SkillTape"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: HEADING,
                  fontWeight: 500,
                  fontSize: 13,
                  letterSpacing: 1,
                  padding: "8px 20px",
                  borderRadius: RADII.md,
                  cursor: "pointer",
                  border: `1px solid ${PALETTE.line}`,
                  background: "transparent",
                  color: PALETTE.text,
                  textDecoration: "none",
                  textTransform: "none",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                View on GitHub
              </a>

              {appVersion && (
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: PALETTE.muted,
                  }}
                >
                  v{appVersion}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <nav
        className="app-chrome"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "10px 16px",
          background: `${fadeDivider()} no-repeat top / 100% 1px, ${PALETTE.panel}`,
        }}
      >
        <button type="button" onClick={goHome} style={barButtonStyle(course === null)}>
          Home
        </button>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            style={barButtonStyle(selectedCourse !== undefined)}
          >
            {menuLabel} {menuArrow}
          </button>

          {menuOpen && (
            <div
              role="listbox"
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                minWidth: 240,
                maxHeight: 320,
                overflowY: "auto",
                padding: 6,
                borderRadius: RADII.md,
                border: `1px solid ${PALETTE.line}`,
                background: PALETTE.panel,
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
                zIndex: 50,
              }}
            >
              {COURSES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={course === entry.id}
                  onClick={() => openCourse(entry.id)}
                  style={menuItemStyle(course === entry.id)}
                >
                  <div style={{ fontFamily: HEADING, fontSize: 13 }}>
                    {entry.title}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      color: PALETTE.muted,
                    }}
                  >
                    {entry.subtitle}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}