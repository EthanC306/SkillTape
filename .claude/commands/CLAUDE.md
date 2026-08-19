# Development Guidelines

Write code that looks like it was written by a competent human developer who values clarity, simplicity, and maintainability.

The goal is not to maximize abstraction, comments, defensive programming, or architectural complexity. The goal is to solve the actual problem with the smallest clear solution that fits the existing codebase.

## Core Principles

- Prefer simple code over clever code.
- Match the existing project's patterns before introducing new ones.
- Do not add abstractions unless they solve a real problem.
- Do not create code merely to make the architecture look more sophisticated.
- Keep functions focused and reasonably small, but do not split code into tiny functions just because it can be split.
- Prefer readable control flow over compressed expressions.
- Preserve useful existing code instead of rewriting it unnecessarily.
- Make the smallest change that properly solves the task.
- Code should feel natural for a human developer to read and modify later.

## Write Human Code

Do not write code that feels generated for the sake of being generated.

Avoid:

- Excessive helper functions
- Wrapper components that only forward props
- One-use abstractions
- Deeply nested object structures
- Generic utility functions that are only used once
- Excessive type indirection
- Rigid naming schemes
- Artificially symmetrical file structures
- Enterprise-style architecture for simple features
- Excessive configuration
- Defensive checks for impossible states
- Comments explaining obvious code
- Formal documentation for private implementation details
- Large amounts of boilerplate
- Rewriting working code simply to make it "cleaner"

Use the simplest structure that makes the intent obvious.

Bad:

```js
function getCardLabel(card, now) {
  return card.state === "new"
    ? formatNewCardLabel(card)
    : formatDueCardLabel(card, now);
}
```

Better:

```js
let label;

if (card.state === "new") {
  label = formatNewCardLabel(card);
} else {
  label = formatDueCardLabel(card, now);
}
```

Do not turn the second example into three additional abstractions unless the surrounding application actually benefits from them.

## Naming

Use names that naturally describe the thing being represented.

Good:

```js
const cards = getCards();
const selectedCard = cards[index];
const isComplete = completedCount === cards.length;
```

Avoid forced naming systems such as:

```js
const cardCollectionData = getCardCollectionData();
const selectedCardEntity = cardCollectionData[index];
const completionStateBoolean = completedCount === cardCollectionData.length;
```

Do not invent prefixes, suffixes, or naming patterns just to make names conform to a rigid system.

Follow the conventions already established by the project and language.

Use `is`, `has`, `can`, and similar prefixes for booleans when they genuinely improve readability.

## Control Flow

Prefer explicit branching when the branches perform meaningful work.

Bad:

```js
const result = condition
  ? doSomethingComplicated()
  : doSomethingElseComplicated();
```

Better:

```js
let result;

if (condition) {
  result = doSomethingComplicated();
} else {
  result = doSomethingElseComplicated();
}
```

Short value selections are fine:

```js
const className = active ? "active" : "inactive";
```

Do not avoid ternaries completely. Avoid using them when they make real control flow harder to read.

Prefer early returns when they simplify a function:

```js
function saveCard(card) {
  if (!card) {
    return;
  }

  save(card);
}
```

Do not add multiple layers of validation when the caller already guarantees the input.

## Error Handling

Handle errors where they can actually be handled.

Do not add redundant error handling such as:

```js
try {
  return await loadCards();
} catch (error) {
  console.error("Failed to load cards", error);
  throw error;
}
```

If the function cannot recover from the error, let it propagate.

Handle errors when there is a meaningful response:

```js
try {
  return await loadCards();
} catch (error) {
  setError("Could not load your cards.");
  return [];
}
```

Do not add checks for impossible states merely to make the code appear defensive.

Bad:

```js
if (!Array.isArray(cards)) {
  throw new Error("cards must be an array");
}

if (cards.length === 0) {
  return [];
}

if (cards == null) {
  return [];
}
```

If the application's data contract guarantees that `cards` is an array, trust that contract.

## React

Write React components like normal application code.

Do not create unnecessary components just to make a file appear modular.

Bad:

```jsx
function CardTitle({ title }) {
  return <h2>{title}</h2>;
}

function CardBody({ children }) {
  return <div>{children}</div>;
}

function CardContainer({ children }) {
  return <section>{children}</section>;
}

function Card({ title, children }) {
  return (
    <CardContainer>
      <CardTitle title={title} />
      <CardBody>{children}</CardBody>
    </CardContainer>
  );
}
```

Better:

```jsx
function Card({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
```

Create a component when it has its own meaningful behavior, state, reusable UI, or enough complexity to deserve a name.

Do not extract JSX solely because a block is several lines long.

Keep related logic together when separating it would make the component harder to understand.

Good:

```jsx
function StudyCard({ card, onAnswer }) {
  const [showAnswer, setShowAnswer] = useState(false);

  function handleAnswer() {
    setShowAnswer(true);
    onAnswer(card.id);
  }

  return (
    <article>
      <h2>{card.question}</h2>

      {showAnswer && <p>{card.answer}</p>}

      <button onClick={handleAnswer}>
        Show answer
      </button>
    </article>
  );
}
```

Do not extract `handleAnswer`, the button, and the answer display into separate files unless the application actually benefits from doing so.

## State and Hooks

Use the smallest amount of state necessary.

Do not store values that can be calculated from existing state.

Bad:

```js
const [cards, setCards] = useState([]);
const [cardCount, setCardCount] = useState(0);
```

Better:

```js
const [cards, setCards] = useState([]);

const cardCount = cards.length;
```

Do not introduce a custom hook for a small piece of logic that is only used once.

Create a custom hook when the behavior is genuinely reusable or when extracting it makes a complicated component substantially easier to understand.

## Comments

Comments explain decisions, constraints, or non-obvious behavior.

They do not narrate the code.

Bad:

```js
// Increment the counter
count++;

// Set the loading state to true
setLoading(true);

// Find the selected card
const selectedCard = cards[index];
```

Good:

```js
// Keep the previous answer visible while the next card loads.
setLoading(true);
```

If the code is already obvious, do not comment it.

Prefer improving confusing code over explaining it with a large comment.

Do not write long comments that describe every step of an implementation.

Do not use em dashes in comments or code.

## Documentation

Do not write formal docstrings for private helper functions unless the function has genuinely non-obvious behavior.

Bad:

```js
/**
 * Formats the card title.
 *
 * This function accepts a card object and returns the formatted
 * title that should be displayed to the user.
 *
 * @param {Object} card The card to format.
 * @returns {string} The formatted card title.
 */
function formatCardTitle(card) {
  return card.title.trim();
}
```

Better:

```js
function formatCardTitle(card) {
  return card.title.trim();
}
```

Use documentation when it provides information that cannot reasonably be understood from the code itself.

Public APIs, exported libraries, complex algorithms, configuration formats, and important architectural decisions may warrant documentation.

## File Structure

Do not create files just to satisfy an arbitrary structure.

Prefer:

```text
components/
  StudyCard.jsx
  StudyList.jsx
```

over:

```text
components/
  study/
    cards/
      display/
        StudyCard/
          StudyCard.jsx
          StudyCard.types.js
          StudyCard.helpers.js
          StudyCard.constants.js
```

unless the project genuinely needs that level of organization.

Keep related files close together.

Follow the structure already established by the repository.

## Functions

Functions should have a clear purpose.

Good:

```js
function getDueCards(cards, now) {
  return cards.filter(card => card.dueAt <= now);
}
```

Avoid splitting straightforward operations into unnecessary layers:

```js
function filterCards(cards, predicate) {
  return applyFilter(cards, predicate);
}

function applyFilter(cards, predicate) {
  return executeFilter(cards, predicate);
}

function executeFilter(cards, predicate) {
  return cards.filter(predicate);
}
```

Do not create a function solely because a line of code exists.

Create one when it gives a useful name to meaningful behavior or provides real reuse.

## Abstractions

Before creating an abstraction, ask:

1. Is this used more than once?
2. Does the abstraction make the code easier to understand?
3. Does it isolate meaningful behavior?
4. Would another developer understand why it exists?

If the answer is mostly no, keep the code local.

Do not build generic systems for hypothetical future requirements.

Solve the problem that exists now.

## Reuse

Reuse existing utilities, components, hooks, and patterns when they already fit the problem.

Do not force unrelated code through an existing abstraction merely to avoid writing a few lines.

Duplication is sometimes clearer than a bad abstraction.

A small amount of duplicated code is preferable to a generic abstraction that is difficult to understand.

## Formatting and Syntax

Use normal formatting for the project's language and existing tooling.

Do not compress code to reduce line count.

Do not expand code purely to make it look more formal.

Avoid unnecessary object wrapping:

Bad:

```js
return {
  data: {
    cards: cards
  }
};
```

Better:

```js
return { cards };
```

Avoid unnecessary destructuring when it makes the code less readable:

```js
const { id, title, description, createdAt } = card;
```

If only one value is needed:

```js
const title = card.title;
```

Use modern language features when they make the code clearer, not simply because they are available.

## Changes and Refactoring

When implementing a task:

1. Understand the existing code first.
2. Make the smallest reasonable change.
3. Preserve existing behavior unless the task requires changing it.
4. Follow the project's existing conventions.
5. Remove code made unnecessary by the change.
6. Check for dead imports, unused variables, abandoned helpers, and obsolete comments.
7. Run the relevant checks.

Do not perform unrelated refactoring while implementing a feature.

Do not rename unrelated variables or reorganize unrelated files just because you prefer another style.

## Cleanup

After every implementation, remove:

- Unused imports
- Unused variables
- Dead functions
- Dead components
- Obsolete state
- Duplicate logic introduced by the change
- Long comments that are no longer necessary
- Comments that merely describe the code
- Unnecessary error handling
- Unnecessary abstractions
- Unused dependencies
- Ternaries that make the resulting code harder to read
- Em dashes in comments or code

The final implementation should be simpler than the intermediate implementation, not larger just because more code was added.

## Code Examples

These examples represent the desired level of simplicity.

### Simple React component

```jsx
import { useState } from "react";

function Flashcard({ card, onAnswer }) {
  const [showAnswer, setShowAnswer] = useState(false);

  function handleAnswer() {
    setShowAnswer(true);
    onAnswer(card.id);
  }

  return (
    <article className="flashcard">
      <h2>{card.question}</h2>

      {showAnswer && <p>{card.answer}</p>}

      <button onClick={handleAnswer}>
        Show answer
      </button>
    </article>
  );
}

export default Flashcard;
```

### Simple data transformation

```js
function getStudyStats(cards) {
  const completed = cards.filter(card => card.completed).length;

  return {
    total: cards.length,
    completed,
    remaining: cards.length - completed
  };
}
```

### Simple asynchronous code

```js
async function loadCards() {
  const response = await fetch("/api/cards");

  if (!response.ok) {
    throw new Error("Failed to load cards");
  }

  return response.json();
}
```

Do not wrap this in another error handler unless the caller has something useful to do with the error.

### Simple conditional logic

```js
function getCardStatus(card) {
  if (card.completed) {
    return "completed";
  }

  if (card.dueAt <= Date.now()) {
    return "due";
  }

  return "upcoming";
}
```

This is preferable to compressing the same logic into nested ternaries.

## Development Commands

Run:

```bash
npm run dev
```

to start the development server.

Use the project's existing scripts for testing, linting, formatting, building, and versioning.

Do not manually bump the version in `package.json`. The project has a script for version management.

## Final Standard

Before considering an implementation complete, ask:

- Does this solve the actual problem?
- Is the code easy to understand?
- Did I add anything that was not necessary?
- Did I create an abstraction that is not earning its existence?
- Are the React components appropriately sized?
- Are the names natural?
- Are the comments actually useful?
- Did I add error handling that cannot meaningfully recover?
- Did I introduce unnecessary state?
- Did I leave dead code behind?
- Does this look like code a normal developer would actually maintain?

When in doubt, prefer the simpler implementation.