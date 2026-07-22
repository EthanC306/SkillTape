/**
 * COURSES — the list of classes shown on the top-level class-picker page.
 *
 * The app groups topics by class: every topic in `curriculum` (see
 * curriculum.js) carries a `course` field whose value matches one of these
 * `id`s. The picker renders one card per course (in this order), and
 * selecting a course filters the topic list down to just that class's topics.
 *
 * To add a new class: add an entry here and give its topics a matching
 * `course` field.
 *
 * Shape of each entry:
 *   id       — stable key; must equal the `course` field on that class's topics.
 *   title    — display name shown on the picker card.
 *   subtitle — short context line (e.g., course code or textbook) under the title.
 */
export const COURSES = [
  { id: "cpp", title: "CS2401 C++", subtitle: "data structures & algorithms" },
  { id: "discrete", title: "CS3000 Discrete Structures", subtitle: "Epp — Discrete Mathematics 5e" },
];
