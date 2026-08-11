---
description: Extract itemSchema.js items from a sources/ file into a topic module (ROADMAP.md A7)
argument-hint: <sources/course/file.md> <src/data/topics/course/topic.js>
---

Read `$1` (a `sources/` file, per `sources/README.md`'s format) and append new
`items` to `$2` (a topic module under `src/data/topics/`), grounded in that
source. This is `/extract` from ROADMAP.md A7 — read A3's write-up there and
`src/data/topics/cpp/dynamic-alloc.js` first if you haven't; that topic's
`items` array is the worked example this command should match in shape and
rigor.

**The contract (ROADMAP.md D2, non-negotiable):**

1. Read only `$1`'s text. Never state a fact that isn't in it — no filling
   gaps from general C++/CS knowledge, even correct general knowledge. If the
   source is ambiguous about something, flag the ambiguity in the item
   instead of silently resolving it your own way.
2. Every item's `provenance` must have a real `sourceId` (from `$1`'s
   frontmatter), a real `anchor` that resolves to a `{#...}` heading actually
   in `$1`, and a verbatim `excerpt` — copy-pasted from `$1`, not
   reworded — long enough to actually verify the answer against (one full
   sentence minimum).
3. `origin: GENERATED` if you phrased the question yourself from the
   excerpt, `origin: EXTRACTED` if it's closer to a mechanical transform.
   Be honest about which — don't default to EXTRACTED to sound more
   rigorous than the item actually is.
4. Attach `generationMeta: { model: "claude-<version>", generatedAt:
   "<today>", promptedFrom: "$1" }` on every generated item.
5. `verifiedByHuman: false` on every item, always. This command never sets
   it true — that's a human reading the item against the excerpt
   afterward (see A3's status block for how), not something you can
   determine here.
6. For code snippets in `prompt`/`expected`, follow
   `references/cpp-conventions.md`.

**Shape:** import `FORMATS`, `ITEM_ORIGIN`, `makeItem` from `itemSchema.js`
(already imported at the top of most topic files). Aim for a mixed spread of
formats per `itemSchema.js`'s `QUOTAS` — mostly RECALL/WRITE/TRACE, some
ERROR/CLOZE/COMPARE, MCQ up to `QUOTAS[mcq]` (0.4) — not one format repeated.
Each
item needs `id` (`<topic-id>-NN`, continuing whatever numbering already
exists in `$2`), `topicId`, `format`, `origin`, `prompt`, `expected`,
`criteria` (>= 2 checklist points for self-graded formats), `provenance`,
`generationMeta`, `difficulty` (1-3).

**After writing:** run `npm run audit:bank` and fix anything it flags as an
error (not a warning — the "unverified" and "novel tokens" warnings are
expected at this stage) before reporting back. Report which anchors in `$1`
you drew from and which (if any) you deliberately left unused, so a human
reviewer knows what's covered.
