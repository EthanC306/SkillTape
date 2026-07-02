# cs.tutor

A lightweight, self-hosted study app for reviewing computer-science coursework
and quizzing yourself on it. Built with **React** and **Vite**, it presents each
class's material as a set of note cards you can read, blank out and fill from
memory, or drill through as multiple-choice quizzes — all in a single-page app
with your progress saved locally in the browser.

> The project is nicknamed **Cpp Tracker** but now covers multiple courses.

## Courses

The home screen has a bottom tab bar, one tab per class:

| Tab      | Course                              | Focus                              |
| -------- | ----------------------------------- | ---------------------------------- |
| `CS2401` | C++ Data Structures & Algorithms    | Big-O, C-strings, containers, …    |
| `CS3000` | Discrete Structures (Epp, 5e)       | logic, sets, relations, graphs, …  |

Selecting a tab opens the tutor filtered to that course's topics.

## Features

- **Learn mode** — topic notes as clean cards. Key terms are emphasized and,
  in **Fill Mode**, hidden so you can type them from memory and check yourself.
- **Quiz mode** — multiple-choice questions with immediate feedback and a
  per-question explanation. A results screen shows your score and best run.
- **Diagrams** — optional captioned figures on cards and questions (truth
  tables, arrow diagrams, graphs, etc.).
- **Big-O visuals** — C++ topics can render a complexity-growth chart and a
  reference table, with the relevant curve highlighted when you answer.
- **Progress tracking** — best score and attempt count per topic, persisted
  locally in the browser between sessions.

## Getting started

Requires [Node.js](https://nodejs.org/) (18+ recommended).

```bash
# Install dependencies
npm install

# Start the dev server (Vite)
npm run dev

# Build for production (outputs to dist/)
npm run build
```

Then open the URL Vite prints (typically `http://localhost:5173`).

## Project structure

```
├── index.html                # HTML entry point
├── main.jsx                  # React root; renders <Shell />
├── src/
│   ├── Shell.jsx             # Home page + bottom course tab bar
│   ├── App.jsx               # Per-course tutor: topic list, Learn & Quiz views
│   ├── data/
│   │   └── curriculum.js     # All course content: topics, cards, questions, theme
│   ├── components/
│   │   ├── Inline.jsx        # Inline text with **bold** term markup
│   │   ├── FillBody.jsx      # Fill-in-the-blank rendering for Fill Mode
│   │   ├── Figure.jsx        # Captioned diagram/image
│   │   ├── ComplexityChart.jsx  # Big-O growth-rate chart
│   │   └── ReferenceTable.jsx   # Big-O reference table
│   └── utils/
│       └── fill.js           # Helpers for the fill-in-the-blank logic
└── public/
    └── figures/              # Diagram images served at the site root
```

## Adding content

All course material lives in [src/data/curriculum.js](src/data/curriculum.js),
which is documented inline:

- Add a class by adding an entry to `COURSES` and giving its topics a matching
  `course` id (then add a tab in [src/Shell.jsx](src/Shell.jsx)).
- Add a topic by appending to the `curriculum` array. Each topic has `cards`
  (Learn notes) and `questions` (quiz items).
- In card text, wrap key terms in `**double asterisks**` to bold them and turn
  them into blanks in Fill Mode.
- Attach an optional `figure` (`{ src, alt, caption }`) to a card or question,
  with the image file placed under `public/figures/`.

## Notes

- Original lecture slides and PDFs (the `pages/` folder) are **not** included in
  this repository — they are copyrighted course materials and are gitignored.
- Quiz progress is stored per-browser via a local storage bridge; there is no
  backend or account system.
