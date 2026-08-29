import React, { useState, useEffect, useRef } from "react";
import App from "./App";
import UpdateBanner from "./components/UpdateBanner";
import AuthBar from "./components/AuthBar";
import useAuth from "./hooks/useAuth";
import useUpdater from "./hooks/useUpdater";
import { getCourses, postCourse } from "./api/client";
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

const PREEXISTING_CATEGORIES = [
  { label: "Computer Science", ids: new Set(["spring", "cpp", "discrete"]) },
  { label: "Mathematics", ids: new Set(["calcII"]) },
];

export default function Shell() {
  // `course` is a course id from COURSES, or null while on the home screen.
  const [course, setCourse] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [courseDialog, setCourseDialog] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSubtitle, setCourseSubtitle] = useState("");
  const [courseSave, setCourseSave] = useState(null);
  const menuRef = useRef(null);
  const { appVersion } = useUpdater();
  // Lives here rather than in App: every per-user read is scoped to the session
  // server-side, so who is signed in decides what the ENTIRE app shows — not
  // just the course currently open. The home screen is the one view reachable
  // without picking a course, which makes it the only honest place for it.
  const auth = useAuth();

  useEffect(() => {
    let cancelled = false;
    getCourses()
      .then((rows) => {
        if (cancelled) return;
        setCourses(rows);
        setCourse((current) => current && !rows.some((entry) => entry.id === current) ? null : current);
      })
      .catch(() => { /* Built-in fallback remains available if the API is offline. */ });
    return () => { cancelled = true; };
  }, [auth.user?.id]);

  async function addCourse(event) {
    event.preventDefault();
    if (!courseTitle.trim() || courseSave === "saving") return;
    setCourseSave("saving");
    try {
      const created = await postCourse(courseTitle.trim(), courseSubtitle.trim());
      const rows = await getCourses();
      setCourses(rows);
      setCourseDialog(false);
      setCourseTitle("");
      setCourseSubtitle("");
      setCourseSave(null);
      openCourse(created.id);
    } catch (error) {
      setCourseSave(error.message);
    }
  }

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
  const selectedCourse = courses.find((entry) => entry.id === course);
  const ownedCourses = courses.filter((entry) => entry.ownerId != null);
  const preexistingCourses = courses.filter((entry) => entry.ownerId == null);
  const categorizedPreexisting = PREEXISTING_CATEGORIES.map((category) => ({
    label: category.label,
    courses: preexistingCourses.filter((entry) => category.ids.has(entry.id)),
  }));
  const categorizedIds = new Set(PREEXISTING_CATEGORIES.flatMap((category) => [...category.ids]));
  const uncategorizedPreexisting = preexistingCourses.filter((entry) => !categorizedIds.has(entry.id));

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

            {/* Signed out this is the way in, so it sits above the class
                picker in the reading order rather than tucked in a menu. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                textTransform: "none",
                letterSpacing: "normal",
              }}
            >
              <AuthBar
                user={auth.user}
                onLogin={auth.login}
                onSignup={auth.signup}
                onLogout={auth.logout}
              />
              {!auth.user && (
                <div style={{ fontFamily: MONO, fontSize: 12, color: PALETTE.muted, textTransform: "none", letterSpacing: "normal" }}>
                  Sign in to record your progress — quizzes and drills are saved
                  to your account.
                </div>
              )}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 7px 10px", borderBottom: `1px solid ${PALETTE.line}`, marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: PALETTE.muted, textTransform: "uppercase", letterSpacing: 1 }}>{auth.user ? "Your courses" : "Sign in to view courses"}</span>
                <button
                  type="button"
                  aria-label="Create a new course"
                  title="Create a new course"
                  onClick={() => { setMenuOpen(false); setCourseDialog(true); }}
                  style={{ width: 30, height: 30, display: "grid", placeItems: "center", padding: 0, border: `1px solid ${PALETTE.line}`, borderRadius: RADII.sm, background: "transparent", color: PALETTE.accent, cursor: "pointer", fontSize: 16 }}
                >
                  ✎
                </button>
              </div>
              {auth.user && ownedCourses.length === 0 && (
                <div style={{ padding: "8px 12px 10px", fontFamily: MONO, fontSize: 10, color: PALETTE.muted }}>No personal courses yet.</div>
              )}
              {ownedCourses.map((entry) => (
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
              {auth.user && (
                <div style={{ padding: "10px 10px 6px", marginTop: ownedCourses.length ? 5 : 0, borderTop: `1px solid ${PALETTE.line}`, fontFamily: MONO, fontSize: 10, color: PALETTE.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                  Preexisting courses
                </div>
              )}
              {[...categorizedPreexisting, { label: "Other", courses: uncategorizedPreexisting }].map((group) => group.courses.length > 0 && (
                <div key={group.label} role="group" aria-label={group.label}>
                  <div style={{ padding: "8px 12px 4px", fontFamily: HEADING, fontSize: 11, fontWeight: 600, color: PALETTE.accent }}>
                    {group.label}
                  </div>
                  {group.courses.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={course === entry.id}
                      onClick={() => openCourse(entry.id)}
                      style={menuItemStyle(course === entry.id)}
                    >
                      <div style={{ fontFamily: HEADING, fontSize: 13 }}>{entry.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>{entry.subtitle}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>
      {courseDialog && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && courseSave !== "saving") setCourseDialog(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(8, 9, 16, 0.72)" }}>
          <form role="dialog" aria-modal="true" aria-labelledby="create-course-title" onSubmit={addCourse} style={{ width: "min(440px, 100%)", boxSizing: "border-box", display: "grid", gap: 16, padding: "24px 26px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.lg, background: PALETTE.panel }}>
            <div>
              <div id="create-course-title" style={{ fontFamily: HEADING, fontSize: 20, fontWeight: 600, marginBottom: 5 }}>New course</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>{auth.user ? "This course and everything you add inside it belong to your account." : "Sign in from Home before creating a course so it can be saved to your account."}</div>
            </div>
            <label style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              TITLE
              <input autoFocus value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} maxLength={200} placeholder="Physics II" style={{ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, color: PALETTE.text, fontFamily: HEADING, fontSize: 15 }} />
            </label>
            <label style={{ display: "grid", gap: 6, fontFamily: MONO, fontSize: 11, color: PALETTE.muted }}>
              SUBTITLE
              <input value={courseSubtitle} onChange={(event) => setCourseSubtitle(event.target.value)} maxLength={200} placeholder="Electricity and magnetism" style={{ boxSizing: "border-box", width: "100%", padding: "10px 12px", border: `1px solid ${PALETTE.line}`, borderRadius: RADII.md, background: PALETTE.bg, color: PALETTE.text, fontFamily: MONO, fontSize: 13 }} />
            </label>
            {courseSave && courseSave !== "saving" && <div role="alert" style={{ fontFamily: MONO, fontSize: 11, color: PALETTE.bad }}>{courseSave}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" disabled={courseSave === "saving"} onClick={() => setCourseDialog(false)} style={barButtonStyle(false)}>Cancel</button>
              <button type="submit" disabled={!auth.user || !courseTitle.trim() || courseSave === "saving"} style={{ ...barButtonStyle(Boolean(auth.user && courseTitle.trim())), opacity: auth.user && courseTitle.trim() && courseSave !== "saving" ? 1 : 0.5 }}>{courseSave === "saving" ? "Creating…" : "Create +"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
