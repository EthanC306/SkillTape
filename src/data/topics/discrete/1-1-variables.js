// ───────────────────────── CS3000 Discrete Structures ─────────────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e,
// §1.1 "Speaking Mathematically: Variables". showChart is false because the
// Big-O visuals don't apply to this material.
export default {
  id: "discrete-1-1-variables",
  title: "1.1 Speaking Mathematically: Variables",
  subtitle: "CS3000 — §1.1",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "What a variable is",
      body:
        "A **variable** is a placeholder — think of it as a mathematical “John Doe.” You reach for one in two situations. First, when a value exists but is **unknown**, so you name it and compute with it while you search for it (e.g., “Is there a number x such that 2x + 3 = x²?”). Second, when you want a statement to stay true for **every** element of a set, so you use a variable to keep the claim **general** instead of pinning it to one concrete number.",
    },
    {
      heading: "Three kinds of statements",
      body:
        "Most mathematical claims are built from three sentence types. A **universal** statement says a property holds for **every** element of a set (“for all …”). A **conditional** statement says one thing follows from another — the **if-then** form. An **existential** statement asserts that **there is** at least one element with a given property. Combining these gives the compound forms below.",
    },
    {
      heading: "Universal conditional statements",
      body:
        "A **universal conditional** statement is both universal and conditional — it pairs “for every” with “if-then.” Example: “For every animal a, if a is a dog, then a is a **mammal**.” Such statements can be reworded to hide either part: purely conditional (“If an animal is a dog, then it is a mammal”) or purely universal (“**All** dogs are mammals”). They mean the same thing.",
    },
    {
      heading: "Universal existential statements",
      body:
        "A **universal existential** statement is **universal** in its first part and **existential** in its second: a property holds for every object, and that property asserts something **exists**. Example: “Every real number has an **additive inverse**” — for every real number r, there is a real number s such that r + s = 0. Notice the existing thing (the inverse s) **depends on** the universally chosen r; different numbers have different inverses.",
    },
    {
      heading: "Existential universal statements",
      body:
        "An **existential universal** statement flips the order: it is **existential** first and **universal** second. One object is claimed to exist, and it satisfies a property for **all** things of some kind. Example: “There is a positive integer that is less than or equal to **every** positive integer.” This is true because the number **1** exists and 1 ≤ n for every positive integer n. Here the special object is fixed first, then compared against everything.",
    },
    {
      heading: "Why variables matter",
      body:
        "Variables let you refer to a quantity **unambiguously** throughout a long argument without locking it to one value. Some of the deepest ideas need all three phrases at once. The **limit** of a sequence is the classic case: “the limit of aₙ is L” means **for every** positive real ε, **there is** an integer N such that **if** n > N then aₙ is within ε of L — universal, existential, and conditional all in one sentence.",
    },
  ],
  questions: [
    {
      prompt:
        "“For every real number x, if x is nonzero then x² is positive.” What kind of statement is this?",
      choices: [
        "Universal conditional",
        "Universal existential",
        "Existential universal",
        "Purely existential",
      ],
      answer: 0,
      explanation:
        "It is universal (“for every real number x”) and conditional (“if x is nonzero then …”), so it is a universal conditional statement.",
    },
    {
      prompt: "“Every real number has an additive inverse.” This is an example of a…",
      choices: [
        "universal conditional statement",
        "universal existential statement",
        "existential universal statement",
        "conditional statement only",
      ],
      answer: 1,
      explanation:
        "It is universal in its first part (every real number) and existential in its second (there exists an additive inverse for each one) → universal existential.",
    },
    {
      prompt:
        "“There is a positive integer that is less than or equal to every positive integer.” What type is this, and why is it true?",
      choices: [
        "Universal existential; every integer has a smaller one",
        "Existential universal; the number 1 satisfies it for all positive integers",
        "Universal conditional; it uses an if-then",
        "It is false",
      ],
      answer: 1,
      explanation:
        "It asserts something exists (existential) that then holds for all positive integers (universal). It is true because 1 exists and 1 ≤ n for every positive integer n.",
    },
    {
      prompt:
        "Rewrite “For every real number x, if x is nonzero then x² is positive” as: “The square of any nonzero real number is ____.” Which word fills the blank?",
      choices: ["nonzero", "positive", "negative", "an integer"],
      answer: 1,
      explanation:
        "The conclusion of the original statement is that the square is positive, so the rewrite ends with “positive.” (Example 1.1.2.)",
    },
    {
      prompt:
        "Rewrite “Every pot has a lid” as: “For every pot P, there is ____.” Which completion is correct?",
      choices: [
        "a lid for P",
        "every lid",
        "no lid",
        "a pot for P",
      ],
      answer: 0,
      explanation:
        "The universal existential form names the pot P universally, then asserts the existence of a lid for that P. (Example 1.1.3.)",
    },
    {
      prompt:
        "Which trio of phrases is needed to state the definition of the limit of a sequence?",
      choices: [
        "“for every,” “there is,” and “if-then”",
        "“for every” and “there is” only",
        "“if-then” only",
        "“there is” and “or” only",
      ],
      answer: 0,
      explanation:
        "The limit definition is universal, existential, and conditional at once, so it requires “for every,” “there is,” and “if-then.”",
    },
    {
      prompt:
        "What is the main advantage of introducing a variable to replace an ambiguous word like “it”?",
      choices: [
        "It makes the statement shorter",
        "It gives a temporary, unambiguous name you can compute with",
        "It proves the statement is true",
        "It removes the need for numbers",
      ],
      answer: 1,
      explanation:
        "A variable is a placeholder that removes ambiguity and lets you perform concrete computations while keeping the statement general.",
    },
    {
      prompt:
        "In a universal existential statement, how does the object that “exists” relate to the universally chosen object?",
      choices: [
        "It is always the same fixed object",
        "It can depend on the universally chosen object",
        "It must be larger",
        "It cannot exist",
      ],
      answer: 1,
      explanation:
        "The existing object generally depends on the universally chosen one — e.g., each real number has its own additive inverse.",
    },
  ],
};
