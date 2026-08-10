/**
 * curriculum — the flat list of every topic across all classes.
 *
 * Each topic's actual content lives in its own file under `src/data/topics/`,
 * grouped by course (e.g. `topics/cpp/bigo.js`). This file just imports each
 * topic and lists them in display order. To add a new topic: create a file
 * next to its siblings under `topics/<course>/`, then import and add it below.
 *
 * Each topic has the following shape:
 *   id        — unique identifier; also the key used to store quiz progress.
 *   title     — display name of the topic.
 *   subtitle  — short context line shown under the title.
 *   course    — which class this topic belongs to (matches a COURSES id in courses.js).
 *   showChart — when true, the Big-O ComplexityChart + ReferenceTable render in
 *               Learn and Quiz views. These visuals are C++/Big-O specific, so
 *               non-Big-O topics set this to false.
 *   cards     — Learn-mode note cards: { heading, body, accept?, figure? }. In `body`,
 *               wrap key terms in **double asterisks** to bold them (and to turn them
 *               into fill-in-the-blank inputs in Fill Mode). The optional `figure`
 *               renders a captioned diagram beneath the card text (see below).
 *               Fill Mode already grades leniently on its own — case, spacing,
 *               hyphens, exponents, plurals, and number words ("two" = "2") are all
 *               folded away by src/utils/fill.js. `accept` is the escape hatch for
 *               synonyms no rule can derive: a map from the bold text to the other
 *               answers that should also count, e.g.
 *                   body: "...shifting every element is **O(n)**...",
 *                   accept: { "O(n)": ["linear", "linear time"] },
 *   questions — Quiz-mode questions: { prompt, code?, figure?, choices, answer, explanation, tag? }
 *               where `answer` is the 0-based index of the correct choice and the
 *               optional `tag` highlights the matching curve on the Big-O chart.
 *   flashcards — optional flip-card deck: [{ front, back }]. When present, a
 *               "Flashcards" mode button appears next to Learn/Quiz and opens the
 *               deck (front → flip → back → next). `front` is the prompt side
 *               (e.g. "O(1)"); `back` is the reveal (name + classic examples).
 *               Both are plain strings — no **bold** markup here.
 *
 * `figure` (optional, on cards or questions) — a diagram to display:
 *   { src, alt, caption }
 *   src     — absolute URL under /figures/… (files live in public/, served at root).
 *   alt     — accessibility text describing the diagram.
 *   caption — short label shown under the image (e.g. "Figure 1.2.1").
 * Rendered by src/components/Figure.jsx.
 */

// C++
import bigo from "./topics/cpp/bigo.js";
import cstrings from "./topics/cpp/cstrings.js";
import containers from "./topics/cpp/containers.js";
import dynamicAlloc from "./topics/cpp/dynamic-alloc.js";
import dynamicArrays from "./topics/cpp/dynamic-arrays.js";
import dynamicClasses from "./topics/cpp/dynamic-classes.js";
import linkedLists from "./topics/cpp/linked-lists.js";
import linkedListsAlgorithms from "./topics/cpp/linked-lists-algorithms.js";
import doublyLinkedLists from "./topics/cpp/doubly-linked-lists.js";
import templates from "./topics/cpp/templates.js";
import iterators from "./topics/cpp/iterators.js";
import stacks from "./topics/cpp/stacks.js";
import queues from "./topics/cpp/queues.js";
import derivedClasses from "./topics/cpp/derived-classes.js";
import multidimArrays from "./topics/cpp/multidim-arrays.js";
import recursion from "./topics/cpp/recursion.js";
import trees from "./topics/cpp/trees.js";

// CS 3000 — Discrete Structures (Epp, 5e)
import discrete11Variables from "./topics/discrete/1-1-variables.js";
import discrete12Sets from "./topics/discrete/1-2-sets.js";
import discrete13RelationsFunctions from "./topics/discrete/1-3-relations-functions.js";
import discrete14Graphs from "./topics/discrete/1-4-graphs.js";
import discrete21LogicalForm from "./topics/discrete/2-1-logical-form.js";
import discrete22Conditional from "./topics/discrete/2-2-conditional.js";
import discrete23Arguments from "./topics/discrete/2-3-arguments.js";
import discrete24Circuits from "./topics/discrete/2-4-circuits.js";
import discrete25NumberSystems from "./topics/discrete/2-5-number-systems.js";
import discreteVocabulary from "./topics/discrete/vocabulary.js";

const curriculum = [
  bigo,
  cstrings,
  containers,
  dynamicAlloc,
  dynamicArrays,
  dynamicClasses,
  linkedLists,
  linkedListsAlgorithms,
  doublyLinkedLists,
  templates,
  iterators,
  stacks,
  queues,
  derivedClasses,
  multidimArrays,
  recursion,
  trees,

  discrete11Variables,
  discrete12Sets,
  discrete13RelationsFunctions,
  discrete14Graphs,
  discrete21LogicalForm,
  discrete22Conditional,
  discrete23Arguments,
  discrete24Circuits,
  discrete25NumberSystems,
  discreteVocabulary,
];

export default curriculum;
