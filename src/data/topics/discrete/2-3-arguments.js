// ─────────────────────── CS3000 · §2.3 Valid and Invalid Arguments ───────────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.3.
// Text is original; the figure is the section's Table 2.3.1 summary, reused for study.
export default {
  id: "discrete-2-3-arguments",
  title: "2.3 Valid and Invalid Arguments",
  subtitle: "CS3000 — §2.3",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "What makes an argument valid",
      body:
        "An **argument form** is **valid** when, in **every** situation where **all the premises are true**, the **conclusion is also true** — the conclusion follows *necessarily* from the premises. Validity is about **form, not content**: it doesn't care whether the premises are actually true, only whether *true premises would force* a true conclusion. To test validity with a truth table, you only check the **critical rows** — the rows where **every premise is true** — and see whether the conclusion holds in all of them.",
    },
    {
      heading: "Valid vs. actually true",
      body:
        "Keep two ideas separate. **Validity** is about the *form*; **truth** is about the *content*. A valid argument can have a **false** premise and a **false** conclusion (still valid — the form is fine). And an **invalid** argument can happen to have a **true** conclusion (still invalid — the conclusion didn't *follow*). The only thing validity promises: if the premises **were** all true, the conclusion **could not** be false. Never confuse “well-formed reasoning” with “true facts.”",
    },
    {
      heading: "Modus ponens & modus tollens",
      body:
        "A **syllogism** is an argument with two premises and a conclusion. The two most famous valid forms: **Modus ponens** — “p → q; p; **∴ q**” (affirm the hypothesis, get the conclusion). **Modus tollens** — “p → q; **~q**; **∴ ~p**” (deny the conclusion, deny the hypothesis). Modus tollens is really modus ponens applied to the contrapositive. Both are the bedrock rules you'll use constantly in proofs.",
    },
    {
      heading: "Rules of inference",
      body:
        "A **rule of inference** is just a valid argument form you can reuse as a building block. Besides modus ponens/tollens: **generalization** (p ∴ p ∨ q — weaken to an “or”), **specialization** (p ∧ q ∴ p — pull out one part), **elimination** (p ∨ q; ~q ∴ p — rule one out), **transitivity** (p → q; q → r ∴ p → r — chain implications), **conjunction** (p; q ∴ p ∧ q), and **proof by division into cases** (p ∨ q; p → r; q → r ∴ r). Long proofs are these small steps chained together.",
      figure: {
        src: "/figures/discrete/rules-of-inference.png",
        alt: "Table 2.3.1 summarizing valid argument forms: modus ponens, modus tollens, generalization, specialization, conjunction, elimination, transitivity, proof by division into cases, and the contradiction rule.",
        caption: "Table 2.3.1 — a summary of valid argument forms (rules of inference)",
      },
    },
    {
      heading: "Converse & inverse errors (fallacies)",
      body:
        "A **fallacy** is an error in reasoning that makes an argument **invalid**. Two fallacies mimic the valid rules. **Converse error**: “p → q; **q**; ∴ p” — affirming the conclusion. (“If Zeke cheats he sits in back; Zeke sits in back; ∴ Zeke cheats” — wrong, plenty of non-cheaters sit in back.) **Inverse error**: “p → q; **~p**; ∴ ~q” — denying the hypothesis. To show *invalidity*, find **one** critical row (or one real example) with **true premises but a false conclusion**.",
    },
    {
      heading: "Contradiction rule & problem-solving",
      body:
        "The **contradiction rule** is powerful: if assuming **~p** leads to a **contradiction c** (~p → c), then **p** must be true (∴ p). This is the engine behind **proof by contradiction**. In practice you chain rules of inference to deduce new facts — “Where are my glasses?” puzzles and Smullyan's **knights-and-knaves** riddles are solved by applying modus ponens, modus tollens, elimination, and the contradiction rule step by step until the answer drops out.",
    },
  ],
  questions: [
    {
      prompt: "An argument form is valid when…",
      choices: [
        "its premises are all actually true",
        "in every row where all premises are true, the conclusion is also true",
        "its conclusion is true",
        "it has exactly two premises",
      ],
      answer: 1,
      explanation:
        "Validity means: whenever all the premises are true (the critical rows), the conclusion is forced to be true too. It's about form, not the actual truth of the parts.",
    },
    {
      prompt: "When checking validity with a truth table, which rows matter?",
      choices: [
        "Every row",
        "Only the rows where all premises are true (critical rows)",
        "Only the first row",
        "Only rows where the conclusion is true",
      ],
      answer: 1,
      explanation:
        "You only inspect the critical rows — those in which all premises are true — because that's where an invalid argument would reveal a false conclusion.",
    },
    {
      prompt: "Identify the form: “If p then q. p. ∴ q.”",
      choices: ["Modus tollens", "Modus ponens", "Converse error", "Elimination"],
      answer: 1,
      explanation:
        "Affirming the hypothesis to conclude the conclusion is modus ponens — a valid form.",
    },
    {
      prompt: "“If 870,232 is divisible by 6, then it is divisible by 3. 870,232 is not divisible by 3. ∴ ?”",
      choices: [
        "870,232 is divisible by 6 (modus ponens)",
        "870,232 is not divisible by 6 (modus tollens)",
        "Nothing follows",
        "870,232 is divisible by 3",
      ],
      answer: 1,
      explanation:
        "Denying the conclusion (~q) lets you deny the hypothesis (~p) by modus tollens: it is not divisible by 6.",
    },
    {
      prompt: "The argument “p → q; q; ∴ p” is an example of…",
      choices: [
        "modus ponens (valid)",
        "the converse error (invalid)",
        "the inverse error (invalid)",
        "transitivity (valid)",
      ],
      answer: 1,
      explanation:
        "Affirming the conclusion q to infer p is the converse error — invalid. A true q can occur without p.",
    },
    {
      prompt: "Which argument form is the inverse error (invalid)?",
      choices: [
        "p → q; ~p; ∴ ~q",
        "p → q; ~q; ∴ ~p",
        "p → q; p; ∴ q",
        "p ∨ q; ~q; ∴ p",
      ],
      answer: 0,
      explanation:
        "Denying the hypothesis (~p) to conclude ~q is the inverse error. (~q → ~p would be valid, but ~p → ~q is not.)",
    },
    {
      prompt: "Name the valid form: “p → q; q → r; ∴ p → r.”",
      choices: ["Elimination", "Transitivity", "Generalization", "Specialization"],
      answer: 1,
      explanation:
        "Chaining implications — if p implies q and q implies r, then p implies r — is transitivity.",
    },
    {
      prompt: "“Ana knows numerical analysis AND Ana knows graph algorithms. ∴ Ana knows graph algorithms.” This uses…",
      choices: ["Generalization", "Specialization", "Elimination", "Conjunction"],
      answer: 1,
      explanation:
        "Pulling one conjunct out of p ∧ q (∴ q) is specialization.",
    },
    {
      prompt: "“x − 3 = 0 or x + 2 = 0. x is not negative, so x + 2 ≠ 0. ∴ x − 3 = 0.” This uses…",
      choices: ["Elimination", "Transitivity", "Modus ponens", "Generalization"],
      answer: 0,
      explanation:
        "Given p ∨ q and ~q, concluding p is elimination — rule one alternative out and the other must hold.",
    },
    {
      prompt: "A valid argument has a false premise and a false conclusion. Is the argument still valid?",
      choices: [
        "No — false parts make it invalid",
        "Yes — validity is about form, not the truth of the statements",
        "Only if the conclusion is true",
        "Only if it uses modus ponens",
      ],
      answer: 1,
      explanation:
        "Validity concerns the form. A valid form can carry false premises to a false conclusion; that doesn't affect validity.",
    },
    {
      prompt: "How can you prove an argument form is INVALID?",
      choices: [
        "Show every row has a true conclusion",
        "Find one critical row (or real example) with true premises and a false conclusion",
        "Show the premises are false",
        "You can't — all forms are valid",
      ],
      answer: 1,
      explanation:
        "A single critical row (all premises true) in which the conclusion is false proves invalidity.",
    },
    {
      prompt: "The contradiction rule says: if ~p leads to a contradiction (~p → c), then…",
      choices: ["~p is true", "p is true", "the argument is invalid", "nothing follows"],
      answer: 1,
      explanation:
        "If assuming ~p forces a contradiction, then p must be true (∴ p). This underlies proof by contradiction.",
    },
  ],
};
