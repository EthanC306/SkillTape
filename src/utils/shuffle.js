/**
 * shuffle — return a NEW array with the same items in random order.
 *
 * Two callers: the "Master Set" feature flattens questions from every selected
 * topic into one pool and shuffles it, so questions arrive interleaved instead
 * of grouped by module; and `shuffleChoices` below reorders a single question's
 * answer options.
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

/**
 * shuffleChoices — a copy of `question` with its `choices` in random order and
 * `answer` remapped to wherever the correct choice ended up.
 *
 * Position is not content: a learner who notices the answer is usually "A" is
 * being trained on layout rather than material, which inflates scores without
 * improving recall. Reshuffling per run also means a repeated quiz can't be
 * passed from memory of the option order.
 *
 * The topic file's own array is never mutated — the curriculum is shared,
 * module-level data, so a mutation would leak into every later run.
 */
export function shuffleChoices(question) {
  if (!Array.isArray(question?.choices)) return question;

  // Shuffle the *indices*, so `order[p]` is the original index now sitting at
  // position p. The correct answer's new home is therefore order.indexOf(answer).
  const order = shuffle(question.choices.map((_, i) => i));
  return {
    ...question,
    choices: order.map((i) => question.choices[i]),
    answer: order.indexOf(question.answer),
  };
}
