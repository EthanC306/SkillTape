import { useEffect, useState } from "react";
import { ACCENT_PRESETS, DEFAULT_THEME_ID } from "../data/theme";

const STORAGE_KEY = "skilltape:theme";

/**
 * useTheme — the selected accent preset id, persisted across reloads.
 *
 * Applying a preset means setting the single --nocturne-accent CSS var
 * (index.html); PALETTE.accent/accentSoft/accentSoftStrong all read from it
 * or a color-mix() of it, so every styled element repaints without a React
 * re-render. index.html also applies the saved preset before first paint
 * (its own small mirror of ACCENT_PRESETS) so reload doesn't flash purple.
 */
export default function useTheme() {
  const [themeId, setThemeIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID
  );

  useEffect(() => {
    const preset = ACCENT_PRESETS.find((p) => p.id === themeId) ?? ACCENT_PRESETS[0];
    document.documentElement.style.setProperty("--nocturne-accent", preset.value);
  }, [themeId]);

  function setThemeId(id) {
    localStorage.setItem(STORAGE_KEY, id);
    setThemeIdState(id);
  }

  return { themeId, setThemeId, presets: ACCENT_PRESETS };
}
