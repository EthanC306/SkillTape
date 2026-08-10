// The 0-3 self-grade scale, and the one function that turns an auto-graded
// result into one.
//
// Lives in src/data/ rather than server/fsrs.js because both sides need it:
// the server maps grades onto FSRS ratings, and DrillView has to decide what a
// clicked MCQ choice is worth before it posts. server/fsrs.js re-exports all
// three so the rest of the server still only reaches for the scheduler module.

export const GRADES = [0, 1, 2, 3];

export const GRADE_LABELS = ["Again", "Hard", "Good", "Easy"];

/**
 * Auto-graded result to self-grade.
 *
 * Only three of the four grades are reachable. Nothing here produces Easy:
 * MCQ is a click and free text is graded by per-criterion booleans, so neither
 * knows how hard the recall felt. `partial` is not a guess at that, it means
 * the rubric was measurably partly met (criteriaToGrade in routes/drill.js).
 *
 * Answer latency could split `correct` further later. Every review already
 * logs `seconds` next to the stability the scheduler saw, so that can be
 * fitted against real history instead of guessed at. Not before.
 */
export function deriveGrade({ correct, partial = false }) {
  if (correct) return 2;
  if (partial) return 1;
  return 0;
}
