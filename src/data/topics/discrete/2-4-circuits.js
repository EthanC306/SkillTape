// ─────────────────── CS3000 · §2.4 Application: Digital Logic Circuits ───────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.4.
// Text is original; the figures are the section's gate charts, reused for study.
export default {
  id: "discrete-2-4-circuits",
  title: "2.4 Application: Digital Logic Circuits",
  subtitle: "CS3000 — §2.4",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "Black boxes and signals",
      body:
        "Digital circuits transform combinations of **signal bits** (1's and 0's) into other bits. Engineers often treat a circuit as a **black box**: ignore the internal wiring and focus only on the relationship between **input** and **output** signals. A black box is completely specified by its **input/output table**, which lists **every** possible input combination and the output it produces. A box with **n** inputs has **2ⁿ** rows — three inputs give **8** possible input combinations.",
    },
    {
      heading: "The three basic gates",
      body:
        "The building blocks are **gates**. A **NOT-gate** (inverter) has one input and **flips** it: 1 → 0, 0 → 1. An **AND-gate** has two inputs and outputs **1 only when both** inputs are 1. An **OR-gate** has two inputs and outputs **1 unless both** inputs are 0. Notice these mirror the logical connectives exactly: NOT ↔ **~**, AND ↔ **∧**, OR ↔ **∨**. That correspondence is the whole point of the section.",
      figure: {
        src: "/figures/discrete/logic-gates.png",
        alt: "Figure 2.4.3: symbolic representations and input/output tables for NOT, AND, and OR gates.",
        caption: "Figure 2.4.3 — the NOT, AND, and OR gates",
      },
    },
    {
      heading: "Tracing a circuit's output",
      body:
        "To find a circuit's output for given inputs, **trace left to right**, applying each gate to its incoming signals in turn. Doing this for **every** input combination fills in the circuit's **input/output table**. A **black dot** where wires meet means they are **soldered** (connected); wires that merely **cross without a dot** are **not** connected. Reading those dots correctly is essential to tracing a circuit properly.",
    },
    {
      heading: "Boolean expressions ↔ circuits",
      body:
        "Any quantity with only two values (a signal, or a statement) is a **Boolean variable**; an expression built from them with **~, ∧, ∨** is a **Boolean expression**. Every circuit corresponds to a Boolean expression and vice versa. **Circuit → expression:** trace through, writing each gate's output symbolically. **Expression → circuit:** build from the **outermost** operation inward, placing a gate for each connective. This two-way translation lets you design and analyze hardware using **logic**.",
    },
    {
      heading: "Simplifying with logic laws",
      body:
        "Two circuits are **equivalent** if they have the **same input/output table** — they do the same job. To prove it, write each circuit's **Boolean expression** and use the equivalence laws of **Theorem 2.1.1** (distributive, negation, identity, De Morgan's, …) to show the expressions are logically equivalent. This matters practically: a simpler equivalent circuit uses **fewer gates**, so it takes **less space and less power** on a chip. Logic simplification = cheaper hardware.",
    },
    {
      heading: "From a table to a circuit (DNF)",
      body:
        "You can build a circuit for **any** desired input/output table. For each row whose **output is 1**, write an **AND** term that is true for exactly that input pattern (using ~ on the 0-inputs), then **OR** all those terms together. The result is in **disjunctive normal form** (DNF), also called **sum-of-products** form — a disjunction of conjunctions. It's guaranteed to reproduce the table, and can then be simplified and turned into a circuit.",
    },
    {
      heading: "NAND and NOR gates",
      body:
        "Two combined gates are especially handy. A **NAND-gate** is an AND followed by a NOT — its output is **0 only when both inputs are 1** (symbol **|**, the **Sheffer stroke**). A **NOR-gate** is an OR followed by a NOT — its output is **1 only when both inputs are 0** (symbol **↓**, the **Peirce arrow**). Remarkably, **either one alone** can build *any* circuit, which is why real chips lean on them so heavily.",
      figure: {
        src: "/figures/discrete/nand-nor-gates.png",
        alt: "NAND gate (Sheffer stroke) and NOR gate (Peirce arrow) with their symbols and input/output tables.",
        caption: "NAND (Sheffer stroke |) and NOR (Peirce arrow ↓) gates",
      },
    },
  ],
  questions: [
    {
      prompt: "Why do engineers model a circuit as a “black box”?",
      choices: [
        "To hide the answer from users",
        "To focus on the input/output relationship and ignore internal wiring",
        "Because the circuit is broken",
        "To make it run faster",
      ],
      answer: 1,
      explanation:
        "The black-box view ignores implementation details and specifies the circuit purely by its input/output table.",
    },
    {
      prompt: "A black box has 3 input signals. How many rows does its input/output table have?",
      choices: ["3", "6", "8", "9"],
      answer: 2,
      explanation:
        "Each input is 0 or 1, so n inputs give 2ⁿ combinations: 2³ = 8 rows.",
    },
    {
      prompt: "An AND-gate outputs 1 when…",
      choices: [
        "at least one input is 1",
        "both inputs are 1",
        "both inputs are 0",
        "the inputs differ",
      ],
      answer: 1,
      explanation:
        "An AND-gate (like ∧) outputs 1 only when both inputs are 1; otherwise 0.",
    },
    {
      prompt: "A NOT-gate receives input 0. What is its output?",
      choices: ["0", "1", "unchanged", "undefined"],
      answer: 1,
      explanation:
        "A NOT-gate (inverter) flips the signal: 0 becomes 1, and 1 becomes 0.",
    },
    {
      prompt: "Which logical connectives correspond to the NOT, AND, and OR gates?",
      choices: ["→, ↔, ~", "~, ∧, ∨", "∧, ∨, →", "∨, ∧, ~"],
      answer: 1,
      explanation:
        "NOT ↔ ~, AND ↔ ∧, OR ↔ ∨. Gates are the hardware form of the logical connectives.",
    },
    {
      prompt: "In a circuit diagram, a black dot where two wires meet indicates…",
      choices: [
        "the wires are soldered together (connected)",
        "the wires cross without touching",
        "a NOT-gate",
        "an error",
      ],
      answer: 0,
      explanation:
        "A black dot means the wires are connected; wires crossing without a dot are not connected.",
    },
    {
      prompt: "Two circuits are considered equivalent when they…",
      choices: [
        "look identical",
        "have the same input/output table",
        "use the same number of gates",
        "were designed by the same person",
      ],
      answer: 1,
      explanation:
        "Equivalent circuits produce the same outputs for all inputs — identical input/output tables — even if they use different gates.",
    },
    {
      prompt: "Why is a simpler equivalent circuit preferable in an integrated circuit?",
      choices: [
        "It looks nicer",
        "It uses fewer gates, so less space and power",
        "It is always faster",
        "It has more outputs",
      ],
      answer: 1,
      explanation:
        "Fewer logic gates means the circuit takes less chip space and requires less power.",
    },
    {
      prompt: "To build a circuit from an input/output table, you write an AND term for each row where the output is ___ and OR them together.",
      choices: ["0", "1", "either", "the last"],
      answer: 1,
      explanation:
        "For each output-1 row you build an AND term true only for that pattern, then OR them — giving disjunctive normal form (sum-of-products).",
    },
    {
      prompt: "A disjunction of conjunctions (an OR of ANDs) built from a truth table is said to be in…",
      choices: [
        "conjunctive normal form",
        "disjunctive normal form (sum-of-products)",
        "contrapositive form",
        "binary form",
      ],
      answer: 1,
      explanation:
        "An OR of AND-terms is disjunctive normal form, also called sum-of-products form.",
    },
    {
      prompt: "A NAND-gate outputs 0…",
      choices: [
        "only when both inputs are 1",
        "only when both inputs are 0",
        "whenever the inputs differ",
        "always",
      ],
      answer: 0,
      explanation:
        "A NAND is an AND followed by NOT: it outputs 0 only when both inputs are 1 (the negation of AND).",
    },
    {
      prompt: "The symbols | and ↓ stand for which gates?",
      choices: [
        "| is NOR, ↓ is NAND",
        "| is NAND (Sheffer stroke), ↓ is NOR (Peirce arrow)",
        "| is AND, ↓ is OR",
        "both mean NOT",
      ],
      answer: 1,
      explanation:
        "The Sheffer stroke | denotes NAND; the Peirce arrow ↓ denotes NOR.",
    },
  ],
};
