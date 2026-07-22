// ───────────────────────── CS3000 · §1.2 The Language of Sets ─────────────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §1.2.
// Text is original; the figure images are cropped from the section slides for study.
export default {
  id: "discrete-1-2-sets",
  title: "1.2 The Language of Sets",
  subtitle: "CS3000 — §1.2",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "What a set is",
      body:
        "A **set** is just a collection of objects, called its **elements**. The simplest way to describe one is **roster notation**: list the elements inside curly braces, like {1, 2, 3}. To say 3 is an element you write **3 ∈ {1, 2, 3}**, and to say 5 is not you write **5 ∉ {1, 2, 3}**. A set can even be empty — the **empty set**, written ∅ or { }, has no elements at all.",
    },
    {
      heading: "Order and repeats don't matter",
      body:
        "A set is defined **only by what its elements are** — not their order and not how many times you happen to list them. This rule is called the **axiom of extension**. So {1, 2, 3}, {3, 1, 2}, and {1, 1, 2, 3, 3} are all the **same set**: three elements, namely 1, 2, and 3. If you need order or repetition to matter, a set is the wrong tool — that's what ordered pairs and tuples (below) are for.",
    },
    {
      heading: "Set-builder notation",
      body:
        "When a set is too big to list, describe it by a **property** instead. **Set-builder notation** writes { x ∈ S **|** P(x) }, read “the set of all x in S **such that** P(x) is true.” The vertical bar means **“such that.”** Example: { x ∈ ℝ | 0 < x < 1 } is every real number strictly between 0 and 1 — infinitely many, impossible to roster, but pinned down exactly by the condition.",
      figure: {
        src: "/figures/discrete/set-builder.png",
        alt: "Set-builder notation: the set of all x in S such that P(x) is true, written { x in S | P(x) }.",
        caption: "Set-builder notation: “the set of all x such that …”",
      },
    },
    {
      heading: "Special sets of numbers",
      body:
        "A few number sets appear so often they get reserved symbols: **ℝ** (all real numbers), **ℤ** (all integers), **ℚ** (all rationals — quotients of integers), and **ℕ** (natural numbers). A superscript narrows the set: **ℝ⁺** is the positive reals, **ℤ⁻** the negative integers, and **ℤⁿᵒⁿⁿᵉᵍ** the nonnegative integers 0, 1, 2, 3, …. Knowing these symbols lets you read conditions like “x ∈ ℤ” at a glance.",
      figure: {
        src: "/figures/discrete/number-sets.png",
        alt: "Table of symbols: R the set of all real numbers, Z the set of all integers, Q the set of all rational numbers.",
        caption: "The reserved names for common number sets",
      },
    },
    {
      heading: "The real number line",
      body:
        "The reals **ℝ** are pictured as an infinite **line**. A middle point is the **origin**, standing for **0**; a unit length is marked off, points to the **right** are the positive reals, and points to the **left** are the negatives. Every real number matches exactly one point on the line. One fact students trip on: **0 is neither positive nor negative** — it sits alone at the origin, splitting the line into the positives and the negatives.",
    },
    {
      heading: "Subsets",
      body:
        "A is a **subset** of B, written **A ⊆ B**, when **every** element of A is also an element of B. To show A is *not* a subset (**A ⊈ B**) you only need **one** element of A that is missing from B. If A ⊆ B but A ≠ B — B has something A lacks — then A is a **proper subset** of B. And every set is a subset of itself: **A ⊆ A** is always true, because every element of A is trivially in A.",
    },
    {
      heading: "∈ vs ⊆ — the classic trap",
      body:
        "Keep these straight: **∈** relates an **element** to a set, while **⊆** relates a **set** to a set. For {1, 2, 3}: “2 ∈ {1, 2, 3}” is true, but “2 ⊆ {1, 2, 3}” is nonsense unless 2 is itself a set. Meanwhile “**{2} ⊆ {1, 2, 3}**” is true — the one-element set {2} sits inside. Two more gotchas: **{0} ≠ 0** (a box holding 0 is not the number 0), and **{1, {1}} has two elements** — the number 1 and the *set* {1}.",
    },
    {
      heading: "Ordered pairs and n-tuples",
      body:
        "When order *does* matter, use an **ordered pair** (a, b). Here **both order and repetition count**: (a, b) = (c, d) only if **a = c and b = d**. So **(1, 2) ≠ (2, 1)**, even though the sets {1, 2} and {2, 1} are equal. The idea extends to an **ordered n-tuple** (a₁, a₂, …, aₙ), equal to another only when **every** matching position agrees. This is exactly why (1, 1) is a valid pair but {1, 1} collapses to {1}.",
    },
    {
      heading: "Cartesian products",
      body:
        "The **Cartesian product A × B** is the set of **all** ordered pairs (a, b) with a ∈ A and b ∈ B. Its size is just the product of the sizes: **|A × B| = |A| · |B|**. Order matters here too — **A × B ≠ B × A** in general, since (a, b) and (b, a) differ. The most famous case is **ℝ × ℝ** (the plane): every point corresponds to a pair (x, y) giving its horizontal and vertical position.",
      figure: {
        src: "/figures/discrete/cartesian-plane.png",
        alt: "A Cartesian plane with points (-3,2), (2,1), (-2,-2), and (1,-2) plotted.",
        caption: "Figure 1.2.1 — ℝ × ℝ as the Cartesian plane",
      },
    },
  ],
  questions: [
    {
      prompt:
        "Let A = {1, 2, 3}, B = {3, 1, 2}, and C = {1, 1, 2, 3, 3}. How are A, B, and C related?",
      choices: [
        "They are three different sets",
        "They are all the same set",
        "Only A and B are equal",
        "Only B and C are equal",
      ],
      answer: 1,
      explanation:
        "By the axiom of extension a set is determined only by its elements, not their order or repetition. All three name exactly the elements 1, 2, 3, so A = B = C.",
    },
    {
      prompt: "Is {0} = 0?",
      choices: [
        "Yes — they both represent zero",
        "No — {0} is a set containing 0, while 0 is a number",
        "Yes — braces are optional",
        "Only when 0 is an integer",
      ],
      answer: 1,
      explanation:
        "{0} is a set with one element (the number 0); 0 is that number itself. A set and its lone element are not the same object, so {0} ≠ 0.",
    },
    {
      prompt: "How many elements are in the set {1, {1}}?",
      choices: ["1", "2", "3", "Infinitely many"],
      answer: 1,
      explanation:
        "The two elements are the number 1 and the set {1}. They are different objects, so the set has exactly 2 elements.",
    },
    {
      prompt: "Which statement is TRUE?",
      choices: [
        "2 ⊆ {1, 2, 3}",
        "{2} ∈ {1, 2, 3}",
        "{2} ⊆ {1, 2, 3}",
        "{1, 2} ∈ {1, 2, 3}",
      ],
      answer: 2,
      explanation:
        "{2} ⊆ {1, 2, 3} because the only element of {2}, namely 2, is in {1, 2, 3}. “2 ⊆ …” is ill-formed (2 isn't a set), and neither {2} nor {1,2} is itself an element of {1, 2, 3}.",
    },
    {
      prompt: "What is the difference between ∈ and ⊆?",
      choices: [
        "∈ relates an element to a set; ⊆ relates a set to a set",
        "They mean the same thing",
        "∈ is for numbers only; ⊆ is for letters",
        "⊆ relates an element to a set; ∈ relates a set to a set",
      ],
      answer: 0,
      explanation:
        "∈ says an object is a member of a set. ⊆ says every element of one set is also in another. Mixing them up is the most common set-notation error.",
    },
    {
      prompt:
        "Let B = ℤ⁺ (positive integers) and C = {100, 200, 300}. Is C a proper subset of B?",
      choices: [
        "No — C has elements not in B",
        "Yes — every element of C is a positive integer, and B has elements not in C",
        "No — a finite set can't be a proper subset",
        "Yes — because C and B are equal",
      ],
      answer: 1,
      explanation:
        "Each element of C is a positive integer, so C ⊆ B. Since B also contains values not in C (e.g. 1), C ≠ B, making C a proper subset.",
    },
    {
      prompt: "Is (1, 2) = (2, 1)?",
      choices: [
        "Yes — they contain the same numbers",
        "No — ordered pairs are equal only when both positions match",
        "Yes — order never matters",
        "Only if 1 = 2",
      ],
      answer: 1,
      explanation:
        "Ordered pairs respect position: (a, b) = (c, d) iff a = c and b = d. Here 1 ≠ 2, so (1, 2) ≠ (2, 1) — unlike the sets {1, 2} and {2, 1}, which are equal.",
    },
    {
      prompt: "If A = {x, y} and B = {1, 2, 3}, how many elements are in A × B?",
      choices: ["5", "6", "2", "9"],
      answer: 1,
      explanation:
        "|A × B| = |A| · |B| = 2 · 3 = 6. The pairs are (x,1), (x,2), (x,3), (y,1), (y,2), (y,3).",
    },
    {
      prompt: "In general, is A × B the same set as B × A?",
      choices: [
        "Yes — Cartesian product is symmetric",
        "No — their ordered pairs have the coordinates swapped",
        "Yes — as long as A and B are finite",
        "Only when A = ∅",
      ],
      answer: 1,
      explanation:
        "A × B holds pairs (a, b) with a ∈ A; B × A holds pairs (b, a). Since (a, b) ≠ (b, a) in general, the two products differ (they match only in special cases such as A = B).",
    },
    {
      prompt: "Which set does the builder notation { x ∈ ℤ | −2 < x < 3 } describe?",
      choices: [
        "{−2, −1, 0, 1, 2, 3}",
        "{−1, 0, 1, 2}",
        "all real numbers between −2 and 3",
        "{−2, 3}",
      ],
      answer: 1,
      explanation:
        "It reads “all integers x such that −2 < x < 3.” The strictly-between integers are −1, 0, 1, 2.",
    },
    {
      prompt: "Which reserved symbol denotes the set of all integers?",
      choices: ["ℝ", "ℚ", "ℤ", "ℕ"],
      answer: 2,
      explanation:
        "ℤ is the integers. ℝ is the reals, ℚ the rationals, and ℕ the natural numbers.",
    },
    {
      prompt: "Is the statement C ⊆ C true for every set C?",
      choices: [
        "No — a set can't be a subset of itself",
        "Yes — every element of C is trivially in C",
        "Only if C is nonempty",
        "Only if C is finite",
      ],
      answer: 1,
      explanation:
        "Every element of C is (obviously) an element of C, so the definition of subset is satisfied and C ⊆ C always holds.",
    },
  ],
};
