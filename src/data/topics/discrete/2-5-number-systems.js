// ────────── CS3000 · §2.5 Application: Number Systems and Circuits for Addition ──────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.5.
// Text is original; the figures are the section's tables and adder circuits, reused for study.
export default {
  id: "discrete-2-5-number-systems",
  title: "2.5 Number Systems & Circuits for Addition",
  subtitle: "CS3000 — §2.5",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "Binary (base 2)",
      body:
        "Any integer greater than 1 can be a **base** for a number system. **Binary** (**base 2**) matters in computing because electronic signals sit in one of **two** states (the root *bi-* means “two”). A binary number uses only the digits **0 and 1**, and each position is a **power of 2**: reading right to left, the places are 2⁰ = 1, 2¹ = 2, 2² = 4, 2³ = 8, …. Keeping a short table of powers of 2 handy makes conversions quick.",
      figure: {
        src: "/figures/discrete/powers-of-2.png",
        alt: "Table 2.5.1: powers of 2 from 2^0 = 1 up to 2^10 = 1024 with their decimal forms.",
        caption: "Table 2.5.1 — powers of 2",
      },
    },
    {
      heading: "Converting between binary and decimal",
      body:
        "**Binary → decimal:** add up the place-values wherever there's a 1. E.g. 1101₂ = 8 + 4 + 0 + 1 = **13**. **Decimal → binary:** subtract the **largest power of 2** that fits, then repeat on what's left. For 209: 128 fits (leaves 81), 64 fits (leaves 17), 16 fits (leaves 1), 1 fits — so 209 = 128 + 64 + 16 + 1 = **11010001₂**. Put a 1 in each place-value you used and a 0 in the rest.",
    },
    {
      heading: "Binary addition",
      body:
        "Binary arithmetic mirrors decimal, but you **carry at 2** instead of at 10 (since 2 = 10₂). The single-digit sums are: 0+0 = 0, 0+1 = 1, and **1+1 = 10₂** (write 0, **carry 1**). Adding three 1's gives **11₂** (write 1, carry 1). Just like grade-school addition, you work right to left, writing the low bit and carrying the high bit into the next column.",
    },
    {
      heading: "The half-adder",
      body:
        "To add two single bits **P** and **Q**, a circuit needs **two outputs**: the **sum** bit and the **carry** bit. The **carry** is 1 only when both are 1 — that's **P ∧ Q** (an AND-gate). The **sum** is 1 when exactly one is 1 — that's **exclusive or**, P ⊕ Q. A circuit combining these to add two bits is a **half-adder**. It handles a single column but can't accept a carry coming *in* from the column before it.",
      figure: {
        src: "/figures/discrete/half-adder.png",
        alt: "Half-adder circuit and its input/output table, producing a Carry (P AND Q) and a Sum (exclusive or) from inputs P and Q.",
        caption: "Figure 2.5.1 — a half-adder adds two bits P and Q",
      },
    },
    {
      heading: "The full-adder",
      body:
        "Adding multi-digit numbers means a column can receive a **carry-in** from the right, so you must add **three** bits: P, Q, and a carry R. A circuit that adds three bits — producing a **sum** S and a **carry** C — is a **full-adder**, and it's built from **two half-adders plus an OR-gate**. The full-adder is the workhorse: chain enough of them and you can add binary numbers of any length.",
      figure: {
        src: "/figures/discrete/full-adder.png",
        alt: "Full-adder circuit built from two half-adders and an OR gate, with its input/output table for inputs P, Q, R.",
        caption: "Figure 2.5.2 — a full-adder adds three bits P, Q, R",
      },
    },
    {
      heading: "The parallel adder",
      body:
        "To add two multi-bit numbers, wire the columns together: one **half-adder** for the rightmost column (no carry-in) and a **full-adder** for each column after it, passing each **carry** leftward into the next. This assembly is a **parallel adder**. Two full-adders and one half-adder, for instance, add two three-bit numbers; the pattern scales to **any finite length**. This is essentially how a computer's arithmetic unit adds.",
      figure: {
        src: "/figures/discrete/parallel-adder.png",
        alt: "A parallel adder built from one half-adder and two full-adders, adding two three-digit binary numbers to produce a four-digit result.",
        caption: "Figure 2.5.3 — a parallel adder chains half- and full-adders",
      },
    },
    {
      heading: "Two's complement for signed integers",
      body:
        "Computers store **signed** integers (usually in a fixed **8, 32, or 64** bits) using **two's complement**, which gives a **unique** representation of 0 and lets one adder handle both **addition and subtraction**. For a negative number in 8 bits: write the positive value in binary, **flip every bit**, then **add 1**. E.g. −46: 46 = 00101110 → flip → 11010001 → +1 → **11010010**. The **leading bit** is 1 for negatives, 0 for nonnegatives.",
    },
    {
      heading: "Subtraction via two's complement",
      body:
        "The payoff: **a − b = a + (−b)**, so subtraction becomes **addition** of a two's complement — the same adder circuit does both. To compute 78 − 46, add the 8-bit forms of 78 (01001110) and −46 (11010010). The sum overflows into a 9th bit; **discard that carry** and the remaining 8 bits, 00100000, are **32** — the correct answer. No separate subtraction hardware needed.",
    },
    {
      heading: "Hexadecimal (base 16)",
      body:
        "**Hexadecimal** (**base 16**) is a compact shorthand for binary. Its 16 digits are **0–9** then **A, B, C, D, E, F** for 10–15. The magic: **each hex digit equals exactly 4 binary bits**, so converting is just **grouping bits by four**. E.g. binary 0100 1101 1010 1001 → **4DA9**. That's why memory dumps are shown in hex — far shorter than binary and trivial to convert back.",
      figure: {
        src: "/figures/discrete/hex-table.png",
        alt: "Table 2.5.3: the 16 hexadecimal digits 0-F with their decimal values 0-15 and 4-bit binary equivalents.",
        caption: "Table 2.5.3 — hex digits, decimal values, and 4-bit binary",
      },
    },
  ],
  questions: [
    {
      prompt: "Why is binary (base 2) important in computing?",
      choices: [
        "It is easier for humans to read",
        "Electronic signals have two states, matching the two binary digits",
        "It uses fewer digits than any other base",
        "It avoids carrying",
      ],
      answer: 1,
      explanation:
        "Modern electronics store signals in one of two states, which correspond naturally to the binary digits 0 and 1.",
    },
    {
      prompt: "What is the binary number 1101₂ in decimal?",
      choices: ["11", "13", "14", "26"],
      answer: 1,
      explanation:
        "1101₂ = 8 + 4 + 0 + 1 = 13 (place-values 2³, 2², 2¹, 2⁰).",
    },
    {
      prompt: "In binary addition, what is 1 + 1?",
      choices: ["1", "2", "10₂ (0 carry 1)", "11₂"],
      answer: 2,
      explanation:
        "1 + 1 = 2 = 10₂: you write 0 and carry 1, since binary carries at 2.",
    },
    {
      prompt: "In a half-adder, the CARRY output is produced by which Boolean expression?",
      choices: ["P ∨ Q", "P ∧ Q", "~P", "P ⊕ Q (exclusive or)"],
      answer: 1,
      explanation:
        "The carry is 1 only when both bits are 1, so it's P ∧ Q — an AND-gate. The sum is the exclusive or.",
    },
    {
      prompt: "Why can't a half-adder alone add the middle columns of a multi-digit binary sum?",
      choices: [
        "It only has one input",
        "It can't accept a carry coming in from the previous column",
        "It produces no carry",
        "It works only in decimal",
      ],
      answer: 1,
      explanation:
        "A half-adder adds just two bits. Middle columns may also receive a carry-in, so they need to add three bits — a full-adder.",
    },
    {
      prompt: "A full-adder adds three bits. It is typically built from…",
      choices: [
        "one half-adder",
        "two half-adders and an OR-gate",
        "three OR-gates",
        "a single AND-gate",
      ],
      answer: 1,
      explanation:
        "A full-adder combines two half-adders and an OR-gate to add P, Q, and a carry R.",
    },
    {
      prompt: "A circuit that adds two multi-digit binary numbers by chaining adders is called a…",
      choices: ["half-adder", "parallel adder", "inverter", "NAND-gate"],
      answer: 1,
      explanation:
        "A parallel adder chains a half-adder and full-adders, passing carries leftward, to add multi-bit numbers.",
    },
    {
      prompt: "To find the 8-bit two's complement of a negative number, you…",
      choices: [
        "write the positive value in binary, flip every bit, then add 1",
        "just write it in binary",
        "flip every bit only",
        "add 1 only",
      ],
      answer: 0,
      explanation:
        "Two's complement of a negative: take the positive's binary, flip all bits, add 1. (E.g. −46 → 11010010.)",
    },
    {
      prompt: "What is the main advantage of two's complement representation?",
      choices: [
        "It uses fewer bits",
        "The same adder circuit can perform both addition and subtraction, and 0 is unique",
        "It makes numbers bigger",
        "It avoids binary entirely",
      ],
      answer: 1,
      explanation:
        "Two's complement gives a unique 0 and lets a − b be computed as a + (−b), so one adder handles both operations.",
    },
    {
      prompt: "In two's complement, what does the leading (left-most) bit indicate?",
      choices: [
        "The size of the number",
        "The sign: 1 for negative, 0 for nonnegative",
        "Always 1",
        "Whether the number is even",
      ],
      answer: 1,
      explanation:
        "Because bits are flipped for negatives, the leading bit is 1 for negative integers and 0 for nonnegative ones.",
    },
    {
      prompt: "How many binary bits does a single hexadecimal digit represent?",
      choices: ["2", "3", "4", "8"],
      answer: 2,
      explanation:
        "Base 16 = 2⁴, so each hex digit corresponds to exactly 4 binary bits — conversion is just grouping bits by four.",
    },
    {
      prompt: "Convert binary 1010 1001 to hexadecimal.",
      choices: ["A9", "9A", "AB", "129"],
      answer: 0,
      explanation:
        "Group by four: 1010 = A and 1001 = 9, so the hex value is A9.",
    },
  ],
};
