/**
 * shuffle — return a NEW array with the same items in random order.
 *
 * Used by the "Master Set" feature: questions from every selected topic are
 * flattened into one pool and shuffled once, so questions from different
 * topics arrive interleaved instead of grouped by module.
 *
 * Implementation: the Fisher–Yates shuffle. Walk the array from the end;
 * at each position i, swap the item there with one chosen uniformly at
 * random from the positions 0..i. This gives every permutation an equal
 * chance (a naive `.sort(() => Math.random() - 0.5)` does not) and runs
 * in O(n).
 *
 * The input array is not modified — callers keep their original ordering
 * (the curriculum's question arrays must never be mutated).
 */
export default function shuffle(items) {
  const result = [...items]; // copy so the caller's array stays untouched
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // random index in 0..i
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
