import { useEffect, useState } from "react";
import {
  ACCENT_PRESETS,
  COLOR_SCHEMES,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_THEME_ID,
} from "../data/theme";

const THEME_KEY = "skilltape:theme";
const SCHEME_KEY = "skilltape:scheme";

/**
 * useTheme — accent preset + dark/light scheme, both persisted across reloads.
 *
 * Accent: sets --nocturne-accent; soft tints are color-mix() derivations in
 * index.html, so every PALETTE.accent* call site repaints without a React
 * re-render.
 *
 * Scheme: sets html[data-scheme], which swaps the surface CSS vars (bg, panel,
 * text, …) also defined in index.html. Same no-re-render story.
 *
 * index.html also applies both before first paint (its own small mirror of the
 * presets) so reload doesn't flash purple-on-dark.
 */
export default function useTheme() {
  const [themeId, setThemeIdState] = useState(
    () => localStorage.getItem(THEME_KEY) || DEFAULT_THEME_ID
  );
  const [scheme, setSchemeState] = useState(
    () => localStorage.getItem(SCHEME_KEY) || DEFAULT_COLOR_SCHEME
  );

  useEffect(() => {
    const preset = ACCENT_PRESETS.find((p) => p.id === themeId) ?? ACCENT_PRESETS[0];
    document.documentElement.style.setProperty("--nocturne-accent", preset.value);
  }, [themeId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-scheme", scheme);
  }, [scheme]);

  function setThemeId(id) {
    localStorage.setItem(THEME_KEY, id);
    setThemeIdState(id);
  }

  function setScheme(next) {
    localStorage.setItem(SCHEME_KEY, next);
    setSchemeState(next);
  }

  return {
    themeId,
    setThemeId,
    presets: ACCENT_PRESETS,
    scheme,
    setScheme,
    schemes: COLOR_SCHEMES,
  };
}
