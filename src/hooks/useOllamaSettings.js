import { useState } from "react";

const HOST_KEY = "skilltape:ollama:host";
const MODEL_KEY = "skilltape:ollama:model";
const CODE_MODEL_KEY = "skilltape:ollama:codeModel";

// Mirrors server/ollama.js's DEFAULT_HOST/DEFAULT_MODEL as plain literals
// rather than importing that module — src/ only ever reaches the server
// through src/api/client.js's fetch calls, and these are just default
// strings (same reasoning as index.html's own small mirror of
// src/data/theme.js's ACCENT_PRESETS, which can't import that module either).
const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen3.5:9b";
// Same model as above, deliberately — this default used to be
// qwen2.5-coder:7b, back when the general model was qwen2.5:7b-instruct and a
// coder-tuned peer really did judge code better. Re-measured against this
// bank (docs/OLLAMA_GRADING.md §8), qwen3.5:9b beats the coder model on the
// code items too, and collapsing to one model also removes a real cost on an
// 8GB card: two ~5-6GB models alternating within a session cannot both stay
// resident, so Practice was paying an evict-and-reload on every switch
// between a code item and a prose one. Set this back to a coder model if a
// future bank makes that worth measuring again.
const DEFAULT_CODE_MODEL = "qwen3.5:9b";

/**
 * useOllamaSettings — the local Ollama host/model(s) Practice mode's grading
 * calls use, persisted across reloads. Same hand-rolled localStorage pattern
 * as useTheme.js; no generic usePersistedState hook exists in this codebase.
 *
 * Two model fields, not one: `model` grades everything, `codeModel` grades
 * WRITE/TRACE/ERROR items specifically. PracticeView picks per item.
 */
export default function useOllamaSettings() {
  const [host, setHostState] = useState(() => localStorage.getItem(HOST_KEY) || DEFAULT_HOST);
  const [model, setModelState] = useState(() => localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL);
  const [codeModel, setCodeModelState] = useState(() => localStorage.getItem(CODE_MODEL_KEY) || DEFAULT_CODE_MODEL);

  function setHost(h) {
    localStorage.setItem(HOST_KEY, h);
    setHostState(h);
  }

  function setModel(m) {
    localStorage.setItem(MODEL_KEY, m);
    setModelState(m);
  }

  function setCodeModel(m) {
    localStorage.setItem(CODE_MODEL_KEY, m);
    setCodeModelState(m);
  }

  return { host, model, codeModel, setHost, setModel, setCodeModel };
}
