// ───────────────── CS3000 · §2.1 Logical Form and Logical Equivalence ─────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.1.
// Text is original; the figure images are the section slides' truth tables and the
// Theorem 2.1.1 summary, reused for study. showChart is false.
export default {
  id: "discrete-2-1-logical-form",
  title: "2.1 Logical Form and Logical Equivalence",
  subtitle: "CS3000 — §2.1",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "Arguments, premises, conclusion",
      body:
        "An **argument** is a sequence of statements meant to establish the truth of a final claim. That final claim is the **conclusion**; the statements leading up to it are the **premises**. Logic studies the **form** of an argument, not its **content** — it can't judge whether the ideas are worthwhile, only whether the conclusion **follows necessarily** from the premises. That focus on form is why logic is called the science of *necessary inference*. We write **∴** for the word “therefore,” just before the conclusion.",
    },
    {
      heading: "Logical form",
      body:
        "Two arguments about totally different topics can share the exact same **logical form**. To expose it, we replace whole component sentences with letters — **p**, **q**, **r** — and combine them with logic words. For example, both “If Jane is a math or CS major, then she takes Math 150” and a sentence about studying share the skeleton “**If p or q, then r**.” Once you see the form, you can judge the reasoning without being distracted by the subject matter.",
    },
    {
      heading: "What counts as a statement",
      body:
        "A **statement** (or proposition) is a sentence that is **definitely true or definitely false** — one or the other, not both. “Two plus two equals four” is a true statement; “two plus two equals five” is a false one. But “**x > 0**” is **not** a statement on its own: its truth depends on the value of x (true for x = 3, false for x = −3). A sentence with a free variable only becomes a statement once the variable is given a value.",
    },
    {
      heading: "Compound statements: ~, ∧, ∨",
      body:
        "Three symbols build bigger statements from simpler ones. **~** means **not** (negation): **~p** is “it is not the case that p.” **∧** means **and** (conjunction): **p ∧ q** claims both hold. **∨** means **or** (disjunction): **p ∨ q** claims at least one holds — this is the *inclusive* or (p, or q, or both). Two English cues to remember: “**but**” translates to **∧** (“not hot but sunny” = ~h ∧ s), and “**neither p nor q**” means **~p ∧ ~q**.",
    },
    {
      heading: "Order of operations",
      body:
        "Just like arithmetic, logic has precedence rules. **~ is performed first**, so **~p ∧ q** means **(~p) ∧ q**, not ~(p ∧ q). By contrast, **∧ and ∨ are coequal** — neither outranks the other — so an expression like **p ∧ q ∨ r** is **ambiguous** and considered meaningless until you add **parentheses**: it must be written as either **(p ∧ q) ∨ r** or **p ∧ (q ∨ r)**. When in doubt, parenthesize.",
    },
    {
      heading: "Truth tables",
      body:
        "A **truth table** lists every possible combination of truth values for the variables and gives the result in the last column. For one variable there are 2 rows; for two variables, **4 rows**; for three, 8. **Negation:** ~p is just the opposite of p. **Conjunction:** p ∧ q is **T only when both** p and q are true. **Disjunction:** p ∨ q is **F only when both** are false. Those two “only when” rules are worth memorizing.",
      figure: {
        src: "/figures/discrete/truth-table-and.png",
        alt: "Truth table for p and q: T only in the row where both p and q are true.",
        caption: "p ∧ q is true only when both p and q are true",
      },
    },
    {
      heading: "Statement forms and exclusive or",
      body:
        "An expression built from variables and ~, ∧, ∨ is a **statement form** (or propositional form). To find its truth values, work like algebra: for each row, evaluate the **innermost parentheses first**, then work outward. A classic example is the **exclusive or** — “p or q **but not both**” — which is *not* a single symbol but the form **(p ∨ q) ∧ ~(p ∧ q)**. Building its truth table shows it is true in exactly the two rows where p and q **differ**.",
      figure: {
        src: "/figures/discrete/truth-table-or.png",
        alt: "Truth table for p or q: false only in the row where both p and q are false.",
        caption: "p ∨ q (inclusive or) is false only when both are false",
      },
    },
    {
      heading: "Logical equivalence",
      body:
        "Two statement forms are **logically equivalent** — written **P ≡ Q** — when they have the **same truth value in every row** of their truth table. Then you can swap one for the other freely. The simplest example is the **double negative law**: **~(~p) ≡ p**. To *prove* an equivalence, build both truth tables and check every row matches. To *disprove* one, you only need **a single row** (or one concrete example) where they differ — one mismatch is enough.",
    },
    {
      heading: "De Morgan's laws",
      body:
        "**De Morgan's laws** tell you how to negate an “and” or an “or”: **~(p ∧ q) ≡ ~p ∨ ~q** and **~(p ∨ q) ≡ ~p ∧ ~q**. In words: negate each part **and flip ∧ ↔ ∨**. So the negation of “John is 6 ft tall **and** weighs ≥ 200 lb” is “John is **not** 6 ft tall **or** weighs **< 200** lb.” They apply to inequalities too: the negation of “−1 < x **and** x ≤ 4” is “x ≤ −1 **or** x > 4.”",
    },
    {
      heading: "Tautologies, contradictions & the laws",
      body:
        "A **tautology** (**t**) is a statement form that is **always true**, no matter the inputs — like **p ∨ ~p**. A **contradiction** (**c**) is **always false** — like **p ∧ ~p**. Combined with the variables, these anchor a whole toolkit of named equivalences (**commutative, associative, distributive, identity, De Morgan's, absorption, …**) collected in **Theorem 2.1.1**. You use them like algebra rules — replacing pieces with equivalent pieces — to **simplify** statement forms without ever building a truth table.",
      figure: {
        src: "/figures/discrete/logical-equivalences.png",
        alt: "Theorem 2.1.1: a summary table of logical equivalences including commutative, associative, distributive, identity, negation, double negative, idempotent, universal bound, De Morgan's, and absorption laws.",
        caption: "Theorem 2.1.1 — the summary of logical equivalences",
      },
    },
  ],
  questions: [
    {
      prompt:
        "In an argument, what is the final claim it is trying to establish called?",
      choices: ["A premise", "The conclusion", "A statement form", "A tautology"],
      answer: 1,
      explanation:
        "The conclusion is the final assertion; the statements supporting it are the premises.",
    },
    {
      prompt: "Logic analyzes an argument's ____, not its ____.",
      choices: [
        "content; form",
        "form; content",
        "length; topic",
        "premises; conclusion",
      ],
      answer: 1,
      explanation:
        "Logic studies form — whether the conclusion follows necessarily — not the intrinsic merit of the content.",
    },
    {
      prompt: "Which of the following is a statement?",
      choices: [
        "x + y > 0",
        "Two plus two equals five",
        "Please close the door",
        "x < 3",
      ],
      answer: 1,
      explanation:
        "A statement is definitely true or false. “Two plus two equals five” is (false, but) a statement. The two inequalities depend on variable values, and a command is neither true nor false.",
    },
    {
      prompt: "Let h = “It is hot” and s = “It is sunny.” Write “It is not hot but it is sunny.”",
      choices: ["~h ∨ s", "~h ∧ s", "~(h ∧ s)", "h ∧ ~s"],
      answer: 1,
      explanation:
        "“But” means “and,” so the sentence is “not hot and sunny” → ~h ∧ s.",
    },
    {
      prompt: "“It is neither hot nor sunny” translates to…",
      choices: ["~h ∨ ~s", "~(h ∧ s)", "~h ∧ ~s", "h ∨ s"],
      answer: 2,
      explanation:
        "“Neither h nor s” means “not h and not s” → ~h ∧ ~s.",
    },
    {
      prompt: "In ~p ∧ q, which operation is performed first?",
      choices: [
        "the ∧, because it's leftmost",
        "the ~, because negation binds tightest",
        "they are equal, so it's ambiguous",
        "neither — parentheses are required",
      ],
      answer: 1,
      explanation:
        "~ is evaluated first, so ~p ∧ q means (~p) ∧ q, not ~(p ∧ q).",
    },
    {
      prompt: "Why is the expression p ∧ q ∨ r considered ambiguous?",
      choices: [
        "∧ and ∨ are coequal in precedence, so parentheses are needed",
        "It contains three variables",
        "~ is missing",
        "∨ always comes before ∧",
      ],
      answer: 0,
      explanation:
        "∧ and ∨ have equal precedence, so the expression must be written (p ∧ q) ∨ r or p ∧ (q ∨ r) to have a definite meaning.",
    },
    {
      prompt: "For statement variables p and q, when is p ∧ q true?",
      choices: [
        "When at least one of p, q is true",
        "Only when both p and q are true",
        "Only when both p and q are false",
        "Always",
      ],
      answer: 1,
      explanation:
        "A conjunction p ∧ q is true only in the single row where both components are true.",
    },
    {
      prompt: "For statement variables p and q, when is p ∨ q false?",
      choices: [
        "Only when both p and q are false",
        "Only when both are true",
        "Whenever exactly one is true",
        "Never",
      ],
      answer: 0,
      explanation:
        "An inclusive disjunction p ∨ q is false only in the single row where both components are false.",
    },
    {
      prompt: "What does it mean for two statement forms to be logically equivalent (P ≡ Q)?",
      choices: [
        "They contain the same variables",
        "They have the same truth value in every row of the truth table",
        "They look similar",
        "They are both tautologies",
      ],
      answer: 1,
      explanation:
        "Logical equivalence means identical truth values for every combination of inputs — matching in all rows.",
    },
    {
      prompt: "To show that two statement forms are NOT logically equivalent, it is enough to…",
      choices: [
        "check that every row matches",
        "find one row (or example) where their truth values differ",
        "show they use different symbols",
        "prove both are contradictions",
      ],
      answer: 1,
      explanation:
        "A single row where the two forms disagree is enough to prove non-equivalence.",
    },
    {
      prompt: "Using De Morgan's laws, the negation of “p ∧ q” is…",
      choices: ["~p ∧ ~q", "~p ∨ ~q", "p ∨ q", "~(p ∨ q)"],
      answer: 1,
      explanation:
        "~(p ∧ q) ≡ ~p ∨ ~q — negate each part and switch ∧ to ∨.",
    },
    {
      prompt: "Use De Morgan's laws to negate “−1 < x ≤ 4” (i.e. −1 < x and x ≤ 4).",
      choices: [
        "−1 < x or x ≤ 4",
        "x ≤ −1 or x > 4",
        "x ≤ −1 and x > 4",
        "−1 ≤ x < 4",
      ],
      answer: 1,
      explanation:
        "The statement is “−1 < x and x ≤ 4.” Negating each part and flipping “and” to “or” gives “x ≤ −1 or x > 4.”",
    },
    {
      prompt: "Which statement form is a tautology (always true)?",
      choices: ["p ∧ ~p", "p ∨ ~p", "p ∧ q", "~(p ∨ p)"],
      answer: 1,
      explanation:
        "p ∨ ~p is always true (a tautology). p ∧ ~p is always false (a contradiction).",
    },
  ],
};
