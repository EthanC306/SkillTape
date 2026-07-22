// ───────────────────────── CS3000 · §2.2 Conditional Statements ─────────────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.2.
// Text is original; the figure images are the section slides' truth table and
// operator-precedence chart, reused for study. showChart is false.
export default {
  id: "discrete-2-2-conditional",
  title: "2.2 Conditional Statements",
  subtitle: "CS3000 — §2.2",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "If-then and vacuous truth",
      body:
        "A **conditional statement** “**if p then q**” (written **p → q**) has a **hypothesis** p and a **conclusion** q. Its truth table has one surprising rule: p → q is **false in only one case** — when p is **true** but q is **false**. In every other row it is **true**. That means whenever the hypothesis p is **false**, the whole statement is **true** automatically, no matter what q says. Such a statement is called **vacuously true** or **true by default** — e.g. “If 0 = 1, then 1 = 2” is *true* simply because 0 = 1 is false.",
    },
    {
      heading: "If-then as an OR",
      body:
        "A conditional can always be rewritten with **∨** and **~**. The key equivalence is **p → q ≡ ~p ∨ q**. In words: “if p then q” is the same as “**not p, or q**.” This is why “**Either you get to work on time or you are fired**” means the same as “**If** you do *not* get to work on time, **then** you are fired.” In order of operations, **→ is performed last** — after ~, ∧, and ∨ — so ~p ∨ q needs no parentheses to equal p → q.",
    },
    {
      heading: "Negating a conditional",
      body:
        "Because p → q is false **only when p is true and q is false**, its negation is exactly that one case: **~(p → q) ≡ p ∧ ~q**. So the negation of an if-then is **not** another if-then — it's an **and**. Example: the negation of “If my car is in the shop, then I can't get to class” is “My car **is** in the shop **and** I **can** get to class.” Drop the “if-then,” assert the hypothesis, and negate the conclusion.",
    },
    {
      heading: "The contrapositive",
      body:
        "The **contrapositive** of p → q is **~q → ~p** — flip the two parts *and* negate both. The fundamental fact: a conditional and its contrapositive are **logically equivalent**, **p → q ≡ ~q → ~p**. They're always true or false together, so proving one proves the other. Example: “If Howard can swim across the lake, then he can swim to the island” has contrapositive “If Howard **cannot** swim to the island, then he **cannot** swim across the lake.” This equivalence is one of the most useful tools in all of logic.",
    },
    {
      heading: "Converse and inverse (the traps)",
      body:
        "Two other rearrangements look similar but are **not** equivalent to p → q. The **converse** is **q → p** (swap only). The **inverse** is **~p → ~q** (negate only). Neither follows from the original — believing they do are the classic **converse error** and **inverse error**. Handy pairing: the converse and inverse are contrapositives *of each other*, so they're equivalent to **each other**, just not to the original. Only the **contrapositive** (~q → ~p) is equivalent to p → q.",
    },
    {
      heading: "Only if, necessary & sufficient",
      body:
        "“**p only if q**” does **not** mean “if p then q” in the casual sense — it means **~q → ~p**, equivalently **p → q** (q is required for p). Example: “John breaks the record only if he runs it in under four minutes” = “If John does *not* run under four minutes, he does *not* break the record.” Related language: “q is a **necessary** condition for p” means **p → q**; “q is a **sufficient** condition for p” means **q → p**.",
    },
    {
      heading: "The biconditional",
      body:
        "“**p if and only if q**” — the **biconditional**, written **p ↔ q** — asserts p and q have the **same truth value**: it's **true** exactly when p and q are **both true or both false**. It unpacks into a conjunction of two conditionals: **(p → q) ∧ (q → p)**. Example: “This program is correct **iff** it gives correct answers for all inputs” splits into “if correct then always-right, **and** if always-right then correct.”",
      figure: {
        src: "/figures/discrete/biconditional-truth-table.png",
        alt: "Truth table for p if and only if q: true only when p and q have the same truth value.",
        caption: "p ↔ q is true exactly when p and q match",
      },
    },
    {
      heading: "Full order of operations",
      body:
        "With all five connectives in play, the precedence is: **~ first**, then **∧ and ∨** (coequal), then **→ and ↔** (coequal). When two coequal operators appear together, **parentheses** are the only way to fix the meaning. Memorize this hierarchy and you can read any logical expression without ambiguity.",
      figure: {
        src: "/figures/discrete/operator-precedence.png",
        alt: "Order of operations for logical operators: negation first, then and/or, then conditional/biconditional.",
        caption: "The precedence of ~, ∧, ∨, →, and ↔",
      },
    },
  ],
  questions: [
    {
      prompt: "In what single case is the conditional p → q false?",
      choices: [
        "When p is false and q is true",
        "When p is true and q is false",
        "When both are false",
        "When both are true",
      ],
      answer: 1,
      explanation:
        "p → q is false only when the hypothesis p is true but the conclusion q is false. Every other combination makes it true.",
    },
    {
      prompt: "“If 0 = 1, then 1 = 2” is… ",
      choices: [
        "false, because 1 ≠ 2",
        "true (vacuously), because the hypothesis 0 = 1 is false",
        "meaningless",
        "sometimes true",
      ],
      answer: 1,
      explanation:
        "A conditional with a false hypothesis is vacuously true (true by default), regardless of the conclusion.",
    },
    {
      prompt: "Which is logically equivalent to p → q?",
      choices: ["p ∧ q", "~p ∨ q", "p ∨ ~q", "q → p"],
      answer: 1,
      explanation:
        "p → q ≡ ~p ∨ q — “if p then q” means “not p, or q.”",
    },
    {
      prompt: "What is the negation of “If my car is in the shop, then I can't get to class”?",
      choices: [
        "If my car is not in the shop, then I can get to class",
        "My car is in the shop and I can get to class",
        "If I can get to class, then my car is not in the shop",
        "My car is not in the shop or I can't get to class",
      ],
      answer: 1,
      explanation:
        "~(p → q) ≡ p ∧ ~q: assert the hypothesis and negate the conclusion — “car is in the shop AND I can get to class.”",
    },
    {
      prompt: "The contrapositive of “If p then q” is…",
      choices: ["q → p", "~p → ~q", "~q → ~p", "p ∧ ~q"],
      answer: 2,
      explanation:
        "The contrapositive is ~q → ~p — swap and negate both parts. It is logically equivalent to the original.",
    },
    {
      prompt: "Which statement is logically EQUIVALENT to “If today is Easter, then tomorrow is Monday”?",
      choices: [
        "If tomorrow is Monday, then today is Easter (converse)",
        "If today is not Easter, then tomorrow is not Monday (inverse)",
        "If tomorrow is not Monday, then today is not Easter (contrapositive)",
        "Today is Easter and tomorrow is not Monday",
      ],
      answer: 2,
      explanation:
        "Only the contrapositive is equivalent to a conditional. The converse and inverse are not.",
    },
    {
      prompt: "The converse of p → q is q → p, and the inverse is ~p → ~q. How are the converse and inverse related?",
      choices: [
        "They are equivalent to the original p → q",
        "They are contrapositives of each other, so equivalent to each other",
        "They are always false",
        "They are unrelated",
      ],
      answer: 1,
      explanation:
        "The converse and inverse are contrapositives of one another, so they are logically equivalent to each other — but not to the original conditional.",
    },
    {
      prompt: "“John breaks the record only if he runs under four minutes.” This means:",
      choices: [
        "If John runs under four minutes, then he breaks the record",
        "If John breaks the record, then he ran under four minutes",
        "John breaks the record and runs under four minutes",
        "John never breaks the record",
      ],
      answer: 1,
      explanation:
        "“p only if q” means p → q. So breaking the record implies he ran under four minutes (equivalently: if not under four minutes, then no record).",
    },
    {
      prompt: "“q is a necessary condition for p” translates to…",
      choices: ["p → q", "q → p", "p ∧ q", "p ↔ q"],
      answer: 0,
      explanation:
        "If q is necessary for p, then p can't happen without q: p → q. (A sufficient condition q would be q → p.)",
    },
    {
      prompt: "The biconditional p ↔ q is true exactly when…",
      choices: [
        "at least one of p, q is true",
        "p and q have the same truth value",
        "p is true and q is false",
        "both are false",
      ],
      answer: 1,
      explanation:
        "p ↔ q is true when p and q are both true or both false — i.e., they match.",
    },
    {
      prompt: "“p if and only if q” is equivalent to which conjunction?",
      choices: [
        "(p → q) ∧ (q → p)",
        "(p → q) ∧ (p → q)",
        "p ∧ q",
        "(p → q) ∧ (~p → ~q)",
      ],
      answer: 0,
      explanation:
        "p ↔ q ≡ (p → q) ∧ (q → p) — the conditional and its converse together.",
    },
    {
      prompt: "In the full order of operations, which connective is evaluated FIRST?",
      choices: ["→", "∧", "∨", "~"],
      answer: 3,
      explanation:
        "Negation (~) binds tightest and is evaluated first; then ∧ and ∨ (coequal); then → and ↔ (coequal).",
    },
  ],
};
