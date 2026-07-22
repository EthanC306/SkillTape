// ─────────────── CS3000 · §1.3 The Language of Relations and Functions ───────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §1.3.
// Text is original; the figure images are cropped from the section slides for study.
export default {
  id: "discrete-1-3-relations-functions",
  title: "1.3 The Language of Relations and Functions",
  subtitle: "CS3000 — §1.3",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "A relation is a subset of A × B",
      body:
        "Building on Cartesian products: a **relation R from A to B** is simply a **subset of A × B**. When a pair (x, y) is in R we say “x is **related to** y” and write **x R y**; if not, x R̸ y. That's the whole idea — a relation just picks out *which* pairs count. Example: the **circle relation** on ℝ × ℝ holds when x² + y² = 1, so its pairs are exactly the points sitting on the unit circle.",
      figure: {
        src: "/figures/discrete/circle-relation.png",
        alt: "The unit circle x squared plus y squared equals 1 plotted on the Cartesian plane.",
        caption: "A relation as a subset: the pairs (x, y) with x² + y² = 1",
      },
    },
    {
      heading: "Domain and co-domain",
      body:
        "For a relation R from A to B, the set A you start from is the **domain** and the set B you land in is the **co-domain**. These are the *declared* sets — every relation from A to B has domain A and co-domain B, whether or not each element actually gets used. Example: if R goes from A = {1, 2} to B = {1, 2, 3}, its domain is {1, 2} and its co-domain is {1, 2, 3}, even if some element of B is never hit.",
    },
    {
      heading: "Arrow diagrams",
      body:
        "A relation between small finite sets is easy to *see* with an **arrow diagram**: draw the domain elements in one blob, the co-domain elements in another, and draw an **arrow from x to y exactly when x R y**. Two things to notice: an element of the domain can send out **several arrows** (or arrows crossing each other), and some domain elements may send out **no arrow at all**. Both are perfectly legal for a relation.",
      figure: {
        src: "/figures/discrete/arrow-S-T.png",
        alt: "Arrow diagrams for two relations S and T between the sets {1,2,3} and {1,3,5}.",
        caption: "Arrow diagrams for two relations, S and T",
      },
    },
    {
      heading: "When is a relation a function?",
      body:
        "A **function F from A to B** is a special relation that obeys **two rules**. (1) **Totality:** every element of A is the first coordinate of **some** pair — nothing in the domain is left out. (2) **Single-valued:** **no** element of A is paired with **two different** outputs. Put together: each input gets **exactly one** output. When F is a function and (x, y) ∈ F, we write **y = F(x)**.",
    },
    {
      heading: "Spotting non-functions",
      body:
        "The two rules give you a fast visual test on an arrow diagram. A relation **fails** to be a function if **either** some domain element has **no arrow** (breaks totality) **or** some domain element has **two or more arrows** leaving it (breaks single-valued). In the diagram, R is **not** a function: the element **4 sends arrows to both 1 and 3**, so one input would have two outputs.",
      figure: {
        src: "/figures/discrete/arrow-R.png",
        alt: "Arrow diagram for relation R where the element 4 has two arrows, one to 1 and one to 3.",
        caption: "R is not a function — 4 maps to both 1 and 3",
      },
    },
    {
      heading: "Function notation & the machine model",
      body:
        "Because a function gives one output per input, we name the whole thing with a single symbol — **f**, **g**, log, sin — and write **f(x)** for the output on input x. A handy mental picture is the **function machine**: drop an input **x** into the hopper, the machine processes it by its rule, and out comes **f(x)**. Same input, same output, every time — that determinism is exactly the single-valued rule in disguise.",
      figure: {
        src: "/figures/discrete/function-machine.png",
        alt: "A function machine taking input x in the top and producing output f(x) at the bottom.",
        caption: "Figure 1.3.1 — a function as an input/output machine",
      },
    },
    {
      heading: "Functions defined by formulas",
      body:
        "Most functions you meet are given by a **formula** — a rule for turning x into f(x). The **squaring function** f: ℝ → ℝ is f(x) = x². The **successor function** g: ℤ → ℤ is g(n) = n + 1. A **constant function** ignores its input entirely: h: ℚ → ℤ with h(r) = 2 sends **every** rational to 2. Each is a legal function because every input has **exactly one** clearly-defined output.",
      figure: {
        src: "/figures/discrete/function-machines.png",
        alt: "Three function machines: the squaring function f(x)=x^2, the successor function g(n)=n+1, and the constant function h(r)=2.",
        caption: "Figure 1.3.2 — squaring, successor, and constant functions",
      },
    },
    {
      heading: "Equality of functions",
      body:
        "When are two functions the **same**? Not when their formulas *look* alike — when they have the **same domain**, the **same co-domain**, and produce the **same output** for **every** input. So a function is really its input-output behavior, formula aside. Example: on ℝ, f(x) = |x| and g(x) = √(x²) are written differently but agree at every x, since √(x²) always equals |x| — therefore **f = g**.",
    },
  ],
  questions: [
    {
      prompt:
        "Define R from A = {1, 2} to B = {1, 2, 3} by: x R y means (x − y)/2 is an integer. Which pair is in R?",
      choices: ["(1, 2)", "(2, 3)", "(2, 2)", "(1, 2) and (2, 3)"],
      answer: 2,
      explanation:
        "(x − y)/2 must be an integer, i.e. x and y have the same parity. (2, 2): (2−2)/2 = 0, an integer → in R. (1,2) gives −1/2 and (2,3) gives −1/2, neither an integer.",
    },
    {
      prompt:
        "A relation R is defined from A = {1, 2} to B = {1, 2, 3}. What are its domain and co-domain?",
      choices: [
        "domain {1, 2, 3}, co-domain {1, 2}",
        "domain {1, 2}, co-domain {1, 2, 3}",
        "both are {1, 2, 3}",
        "you can't tell without listing R",
      ],
      answer: 1,
      explanation:
        "For a relation from A to B, the domain is the starting set A = {1, 2} and the co-domain is the target set B = {1, 2, 3} — regardless of which pairs R actually contains.",
    },
    {
      prompt: "Fundamentally, what IS a relation from A to B?",
      choices: [
        "A subset of the Cartesian product A × B",
        "A formula of the form y = f(x)",
        "A rule that pairs each element of A with exactly one of B",
        "An element of A × B",
      ],
      answer: 0,
      explanation:
        "A relation from A to B is any subset of A × B — a selection of ordered pairs. (A function is the special case obeying the two extra rules.)",
    },
    {
      prompt: "What are the two properties a relation F must satisfy to be a function from A to B?",
      choices: [
        "Every element of A is used, and no element of A maps to two different outputs",
        "It must be finite, and it must be sorted",
        "Every element of B is used, and A = B",
        "It maps numbers to numbers, and it has a formula",
      ],
      answer: 0,
      explanation:
        "(1) Totality: each element of A is the first coordinate of some pair. (2) Single-valued: no element of A is paired with two different second coordinates. Together: exactly one output per input.",
    },
    {
      prompt:
        "In the arrow diagram, the element 4 has two arrows coming out of it — one to 1 and one to 3. Is R a function?",
      figure: {
        src: "/figures/discrete/arrow-R.png",
        alt: "Arrow diagram where element 4 points to both 1 and 3.",
        caption: "Relation R",
      },
      choices: [
        "Yes — every element is used",
        "No — 4 is paired with two different outputs",
        "Yes — arrows are allowed to cross",
        "No — because 6 has no arrow",
      ],
      answer: 1,
      explanation:
        "R breaks the single-valued rule: the input 4 maps to both 1 and 3, so it would have two outputs. That alone disqualifies R from being a function.",
    },
    {
      prompt:
        "S is defined from A = {2, 4, 6} to B = {1, 3, 5} by y = x + 1. Why is S NOT a function?",
      choices: [
        "Because 6 + 1 = 7 is not in B, so 6 has no output",
        "Because it maps two inputs to the same output",
        "Because x + 1 has no formula",
        "It IS a function",
      ],
      answer: 0,
      explanation:
        "Totality fails: 6 ∈ A but 6 + 1 = 7 ∉ B, so there is no pair with first coordinate 6. Not every element of the domain is used.",
    },
    {
      prompt: "If a function T is given by T(2) = 5, T(4) = 1, T(6) = 1, is T a valid function?",
      choices: [
        "No — two inputs (4 and 6) share the output 1",
        "Yes — each input has exactly one output; shared outputs are fine",
        "No — outputs must all be different",
        "Only if the domain is sorted",
      ],
      answer: 1,
      explanation:
        "The rules constrain inputs, not outputs. Each of 2, 4, 6 has exactly one output, so T is a function — different inputs mapping to the same output (4 and 6 → 1) is allowed.",
    },
    {
      prompt:
        "Let S be all strings over {a, b} and L(s) = the length of s. What is L(abaaba)?",
      choices: ["3", "5", "6", "it is undefined"],
      answer: 2,
      explanation:
        "L returns the number of characters, and abaaba has 6 of them, so L(abaaba) = 6. (L is a function because every string has exactly one length.)",
    },
    {
      prompt:
        "Define C on strings by C(s) = the string s with an 'a' appended on the LEFT. What is C(bbb)?",
      choices: ["bbba", "abbb", "bbb", "aaa"],
      answer: 1,
      explanation:
        "Concatenating a on the left of bbb gives abbb. (Appending on the right would give bbba — order matters.)",
    },
    {
      prompt:
        "On ℝ, let f(x) = |x| and g(x) = √(x²). Does f = g?",
      choices: [
        "No — the formulas are different",
        "Yes — same domain, co-domain, and √(x²) = |x| for every x",
        "No — g is undefined for negative x",
        "Only for x ≥ 0",
      ],
      answer: 1,
      explanation:
        "Two functions are equal when they share a domain and co-domain and agree on every input. Since √(x²) = |x| for all real x, f and g produce identical outputs everywhere, so f = g.",
    },
    {
      prompt: "“A function is a special kind of relation.” Is this accurate?",
      choices: [
        "Yes — every function is a relation, but not every relation is a function",
        "No — they are completely unrelated ideas",
        "No — every relation is a function",
        "Yes — the two words mean exactly the same thing",
      ],
      answer: 0,
      explanation:
        "A function is a relation (subset of A × B) that also satisfies totality and single-valuedness. So functions ⊆ relations, but many relations fail those rules and aren't functions.",
    },
    {
      prompt:
        "On an arrow diagram, which situation is ALLOWED for a function from A to B?",
      choices: [
        "A domain element with no arrow out of it",
        "A domain element with two arrows out of it",
        "Two domain elements whose arrows point to the same element of B",
        "None of these are allowed",
      ],
      answer: 2,
      explanation:
        "Functions restrict the domain side: exactly one arrow out of each domain element. Nothing stops two different inputs from pointing at the same output, so that case is fine.",
    },
  ],
};
