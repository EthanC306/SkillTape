/**
 * tools/verify/flag.js
 *
 * The scoped `verifiedByHuman` edit, shared by the review server and the
 * one-time backfill. Kept out of both so neither reimplements the anchoring
 * and they cannot disagree about where the key belongs.
 *
 * Nothing here reserializes a module. It finds the block for one id and
 * rewrites or inserts a single line, so authored formatting survives.
 */

import fs from "node:fs";

const KEY = "verifiedByHuman";

// Every reviewable block in a seed file opens with its id as the first key,
// whether it is a makeItem({...}) call or a legacy questions[] object literal.
// Anchored to the line start so `sourceId:` and `topicId:` cannot match.
const ID_LINE = /^([ \t]*)id: "([^"]+)",/gm;

/**
 * Character range of one block, found by its id line and bounded by the next.
 * `indent` is carried so an inserted key lines up with its siblings.
 */
export function blockRange(src, id) {
  ID_LINE.lastIndex = 0;
  let block = null;
  let match = ID_LINE.exec(src);

  while (match !== null) {
    if (block) {
      block.end = match.index;
      return block;
    }
    if (match[2] === id) {
      block = {
        start: match.index,
        end: src.length,
        indent: match[1],
        afterIdLine: match.index + match[0].length,
      };
    }
    match = ID_LINE.exec(src);
  }

  return block;
}

/**
 * Sets one block's flag, whichever of the three states it is in: already
 * holding the opposite value (rewrite it), already holding this one (refuse),
 * or missing the key entirely (add it under the id).
 *
 * @returns {{ ok: true, src: string } | { ok: false, status: number, reason: string }}
 */
export function setFlag(src, id, value) {
  const block = blockRange(src, id);
  if (!block) {
    return { ok: false, status: 404, reason: `no block for id "${id}"` };
  }

  const region = src.slice(block.start, block.end);
  const wanted = `${KEY}: ${value}`;
  const opposite = `${KEY}: ${!value}`;

  const oppositeAt = region.indexOf(opposite);
  if (oppositeAt !== -1) {
    const at = block.start + oppositeAt;
    return {
      ok: true,
      src: src.slice(0, at) + wanted + src.slice(at + opposite.length),
    };
  }

  if (region.includes(wanted)) {
    return { ok: false, status: 409, reason: `already ${value} on disk` };
  }

  const at = block.afterIdLine;
  return {
    ok: true,
    src: `${src.slice(0, at)}\n${block.indent}${wanted},${src.slice(at)}`,
  };
}

/** Rename over the target so a crash mid-write cannot truncate a seed file. */
export function writeAtomic(target, contents) {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, target);
}
