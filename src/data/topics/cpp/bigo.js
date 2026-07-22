export default {
  id: "bigo",
  title: "Big-O Notation & Running Time",
  subtitle: "CS 2401 — algorithm efficiency",
  course: "cpp",
  showChart: true,
  cards: [
    {
      heading: "What Big-O measures",
      body:
        "Big-O tells you how much **slower** an algorithm gets as the input grows. We call the input size **n**. Big-O ignores your computer's speed and exact numbers — it only cares about the *shape* of the growth. Example: checking every one of n items is **O(n)**, so doubling n roughly doubles the work. Think of it as a worst-case ceiling, not an exact step count.",
    },
    {
      heading: "Count the loops",
      body:
        "A quick trick: count the loops that run over your data. One loop that runs n times is **O(n)**. A loop inside another loop does n × n work, which is **O(n²)**. Code that keeps cutting the data in half each step — like binary search — is **O(log n)**, because halving gets you to the answer in very few steps.",
    },
    {
      heading: "Drop constants and terms",
      body:
        "To find the Big-O, keep only the **biggest, fastest-growing part** and throw the rest away. Example: 3n² + 2n + 50 becomes **O(n²)**. Why? Once n is large, n² is so huge the other parts barely count. We also drop plain numbers like the 3, because Big-O is about growth, not exact totals. So O(2n) and O(n + 5) are both just **O(n)**.",
    },
    {
      heading: "Common growth classes",
      body:
        "Learn this order, fastest to slowest: **O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ) < O(n!)**. O(1) ('constant time') never slows down, no matter how big n gets — like grabbing array[0]. O(n log n) is the speed of good sorting, such as merge sort. Anything O(2ⁿ) or worse gets too slow to use, even for small n.",
    },
    {
      heading: "Worked example: search",
      body:
        "Say you're searching an **unsorted** list of n numbers for one value. You check the items one by one until you find a match. Worst case, your value is the last one — or isn't there at all — so you check all n items. That's **O(n)**. If the list is **sorted**, binary search can cut it in half each step instead, dropping the cost to **O(log n)**.",
    },
    {
      heading: "Why it matters",
      body:
        "Picking the right Big-O matters way more than tiny code tweaks. With n = 1,000,000, an **O(n)** algorithm does about a million steps — but an **O(n²)** one does **a trillion**. That's the gap between instant and unusable. It's why programmers reach for hash maps (**O(1)** lookups) instead of scanning everything. Big-O sets the limit on how big an input you can handle.",
    },
    {
      heading: "Worst vs average case",
      body:
        "Big-O usually means the **worst case** — the slowest it can ever get. But the same algorithm can behave differently depending on the input. Quicksort is **O(n log n)** most of the time, yet **O(n²)** in its worst case (when it picks bad pivots). So always say *which* case you mean: 'fast on average' and 'safe even in the worst case' are two different promises.",
    },

  ],
  // Flip-card deck: front shows the notation, back reveals the name and the
  // classic example algorithms. Opened via the "Flashcards" mode button.
  flashcards: [
    {
      front: "O(1)",
      back: "Constant time — random access of an element in an array; inserting at the beginning of a linked list.",
    },
    {
      front: "O(log n)",
      back: "Logarithmic time — binary search (each step cuts the remaining data in half).",
    },
    {
      front: "O(n)",
      back: "Linear time — looping through the elements of an array; searching through a linked list.",
    },
    {
      front: "O(n log n)",
      back: "Quasilinear time (log-linear) — quicksort, mergesort, heapsort.",
    },
    {
      front: "O(n²)",
      back: "Quadratic time — insertion sort, selection sort, bubble sort.",
    },
  ],
  questions: [
    {
      prompt: "What is the running time of this algorithm?",
      code: "for (int i = 0; i < n; i++) {\n    // some calculation\n}",
      choices: ["O(1)", "O(n)", "O(n²)", "O(log n)"],
      answer: 1,
      explanation:
        "The loop runs n times doing constant work each pass, so total work scales linearly with n → O(n).",
      tag: "O(n)",
    },
    {
      prompt: "What is the running time of this algorithm?",
      code:
        "for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        // some calculation\n    }\n}",
      choices: ["O(n)", "O(2n)", "O(n²)", "O(n log n)"],
      answer: 2,
      explanation:
        "The inner loop runs n times for each of the n outer iterations → n × n = n² operations → O(n²).",
      tag: "O(n²)",
    },
    {
      prompt:
        "An algorithm always finishes in the same fixed number of steps k, no matter how large n gets. What is its running time?",
      choices: ["O(k)", "O(1)", "O(n)", "O(log n)"],
      answer: 1,
      explanation:
        "Constant work that doesn't depend on n is O(1) — the fastest possible class. We drop the constant k; what matters is that it never grows.",
      tag: "O(1)",
    },
    {
      prompt: "Worst-case running time of this sequential search?",
      code:
        "int search(const int data[], int count, int target) {\n    for (size_t i = 0; i < count; i++) {\n        if (target == data[i])\n            return i;\n    }\n    return -1;\n}",
      choices: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      answer: 2,
      explanation:
        "In the worst case the target is the last element or absent, so the loop checks all n elements → O(n).",
      tag: "O(n)",
    },
    {
      prompt: "Running time of this binary search?",
      code:
        "int binSearch(const int data[], int count, int target) {\n    int first = 0, mid, last = count - 1;\n    while (first <= last) {\n        mid = (first + last) / 2;\n        if (target == data[mid]) return mid;\n        else if (target < data[mid]) last = mid - 1;\n        else first = mid + 1;\n    }\n    return -1;\n}",
      choices: ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
      answer: 1,
      explanation:
        "Each comparison halves the remaining range, so it takes about log₂(n) steps → O(log n). The catch: the data must already be sorted.",
      tag: "O(log n)",
    },
    {
      prompt: "An algorithm's running time is n² + 2n. What is its Big-O?",
      choices: ["O(n² + 2n)", "O(2n)", "O(n²)", "O(3n²)"],
      answer: 2,
      explanation:
        "Keep only the dominant term and drop coefficients and lower-order terms. n² grows far faster than 2n, so it's O(n²).",
      tag: "O(n²)",
    },
    {
      prompt:
        "When we state an algorithm's Big-O running time, which case are we describing?",
      choices: ["Best case", "Average case", "Worst case", "Typical case"],
      answer: 2,
      explanation:
        "Big-O describes the worst case — the upper bound on how slow the algorithm can get.",
    },
    {
      prompt:
        "Sequential search [O(n)] and binary search [O(log n)] both find a target. For a large sorted array, which should you choose, and why?",
      choices: [
        "Sequential — it's simpler",
        "Binary — O(log n) grows far slower than O(n)",
        "Either — they're the same speed",
        "Sequential — binary needs more memory",
      ],
      answer: 1,
      explanation:
        "O(log n) grows much more slowly than O(n), so binary search is dramatically faster on large inputs. The trade-off: the array must already be sorted.",
      tag: "O(log n)",
    },
    {
      prompt: "What is the common name for an O(n log n) running time?",
      choices: ["Quadratic", "Log-linear", "Logarithmic", "Exponential"],
      answer: 1,
      explanation:
        "O(n log n) is called log-linear (sometimes 'linearithmic'). It's the complexity of efficient sorts like merge sort.",
      tag: "O(n log n)",
    },
    {
      prompt: "What is the name for an O(2ⁿ) running time?",
      choices: ["Cubic", "Factorial", "Exponential", "Quadratic"],
      answer: 2,
      explanation:
        "O(2ⁿ) is exponential — the work roughly doubles every time n increases by one. It becomes impractical very quickly.",
      tag: "O(2ⁿ)",
    },
    {
      prompt:
        "Which of these grows the SLOWEST as n increases (the most efficient)?",
      choices: ["O(n²)", "O(n log n)", "O(log n)", "O(n)"],
      answer: 2,
      explanation:
        "Order of growth, slowest → fastest: O(1) < O(log n) < O(n) < O(n log n) < O(n²). O(log n) is the most efficient of the four.",
      tag: "O(log n)",
    },
    {
      prompt: "Match the running time to its name: O(n³)",
      choices: ["Cubic", "Quadratic", "Factorial", "Log-linear"],
      answer: 0,
      explanation:
        "O(n³) is cubic — think three loops nested over n.",
      tag: "O(n³)",
    },
  ],
};
