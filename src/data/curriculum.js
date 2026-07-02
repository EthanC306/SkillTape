export const COMPLEXITY = {
  "O(1)": { name: "Constant", color: "#3ddc97" },
  "O(log n)": { name: "Logarithmic", color: "#7bd88f" },
  "O(n)": { name: "Linear", color: "#c6d84f" },
  "O(n log n)": { name: "Log-linear", color: "#f0a830" },
  "O(n²)": { name: "Quadratic", color: "#f07b30" },
  "O(n³)": { name: "Cubic", color: "#e8552d" },
  "O(2ⁿ)": { name: "Exponential", color: "#e23b3b" },
  "O(n!)": { name: "Factorial", color: "#c2185b" },
};

export const PALETTE = {
  bg: "#13151a",
  panel: "#1b1e26",
  panel2: "#22262f",
  line: "#2e3340",
  text: "#e8e6e1",
  muted: "#8b8f9a",
  accent: "#f0a830",
  good: "#3ddc97",
  bad: "#e23b3b",
};

export const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
export const SANS = 'Verdana, "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

/**
 * COURSES — the list of classes shown on the top-level class-picker page.
 *
 * The app groups topics by class: every topic in the `curriculum` array below
 * carries a `course` field whose value matches one of these `id`s. The picker
 * renders one card per course (in this order), and selecting a course filters
 * the topic list down to just that class's topics.
 *
 * To add a new class: add an entry here and give its topics a matching `course`.
 *
 * Shape of each entry:
 *   id       — stable key; must equal the `course` field on that class's topics.
 *   title    — display name shown on the picker card.
 *   subtitle — short context line (e.g., course code or textbook) under the title.
 */
export const COURSES = [
  { id: "cpp", title: "CS2401 C++", subtitle: "data structures & algorithms" },
  { id: "discrete", title: "CS3000 Discrete Structures", subtitle: "Epp — Discrete Mathematics 5e" },
];

/**
 * curriculum — the flat list of every topic across all classes.
 *
 * Each topic belongs to exactly one course (via its `course` field) and has the
 * following shape:
 *   id        — unique identifier; also the key used to store quiz progress.
 *   title     — display name of the topic.
 *   subtitle  — short context line shown under the title.
 *   course    — which class this topic belongs to (matches a COURSES id).
 *   showChart — when true, the Big-O ComplexityChart + ReferenceTable render in
 *               Learn and Quiz views. These visuals are C++/Big-O specific, so
 *               non-Big-O topics set this to false.
 *   cards     — Learn-mode note cards: { heading, body, figure? }. In `body`, wrap
 *               key terms in **double asterisks** to bold them (and to turn them into
 *               fill-in-the-blank inputs in Fill Mode). The optional `figure` renders
 *               a captioned diagram beneath the card text (see below).
 *   questions — Quiz-mode questions: { prompt, code?, figure?, choices, answer, explanation, tag? }
 *               where `answer` is the 0-based index of the correct choice and the
 *               optional `tag` highlights the matching curve on the Big-O chart.
 *
 * `figure` (optional, on cards or questions) — a diagram to display:
 *   { src, alt, caption }
 *   src     — absolute URL under /figures/… (files live in public/, served at root).
 *   alt     — accessibility text describing the diagram.
 *   caption — short label shown under the image (e.g. "Figure 1.2.1").
 * Rendered by src/components/Figure.jsx. Omit it and nothing extra is drawn, so the
 * existing C++ and §1.1 topics are unaffected.
 */
const curriculum = [
  {
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
  },
  {
    id: "cstrings",
    title: "C-Style Strings",
    subtitle: "CS 2401 — <cstring>",
    course: "cpp",
    showChart: false,
    cards: [
      {
        heading: "What a C-string is",
        body:
          "A C-style string is just an **array of characters** with a special ending marker: the **null terminator** '\\0' (a byte equal to 0). The '\\0' tells the computer where the text stops, so the array can be bigger than the text inside it. Example: char s[100] = \"Hi\"; uses **3 slots** — 'H', 'i', and '\\0'. String functions look for that '\\0' to find the end.",
      },
      {
        heading: "Initializing safely",
        body:
          "When you set a string from text in quotes, the '\\0' is added for you. So char name[] = \"Smith\"; has **size 6** — five letters plus the terminator. But if you list the characters yourself, no '\\0' is added: char bad[] = {'S','m','i','t','h'}; is only five bytes and is **not a valid C-string**. Rule of thumb: always leave one extra slot for the '\\0'.",
      },
      {
        heading: "Reading input",
        body:
          "cin >> name skips spaces at the start, then stops at the next space — so it reads **only one word**. To read a whole line, spaces included, use **cin.getline(name, length)**. It reads up to length − 1 characters, or until you press Enter. You can also add a stop character, like cin.getline(name, 10, '!'), which stops when it reaches '!'.",
      },
      {
        heading: "Core <cstring> functions",
        body:
          "Add #include <cstring> to unlock these helpers. **strlen(s)** counts the characters, not counting '\\0' — so strlen(\"Smith\") is 5. **strncpy(dst, src, n)** copies up to n characters, and **strncat(dst, src, n)** tacks up to n characters onto the end. **strncmp(a, b, n)** compares the first n characters: it gives 0 if they match, a negative number if a is smaller, and a positive number if a is bigger.",
      },
      {
        heading: "Building a string by hand",
        body:
          "Say you read characters one at a time into name. When you're done, you must **add the '\\0' yourself**: name[i] = '\\0';. Skip that line and the array is just loose characters with **no end marker** — strlen or cout will run right past it into other memory. Remember: reading character-by-character never adds the '\\0' for you.",
      },
      {
        heading: "Why terminators matter",
        body:
          "The '\\0' is what keeps your code safe. Without it, strlen and cout keep reading memory until they *happen* to hit a zero byte — which can leak data or crash the program. Running past the end of an array like this is called a **buffer overflow**, and it's a classic security bug. That's why modern C++ prefers **std::string**, which keeps track of its own length for you.",
      },
      {
        heading: "The strncpy pitfall",
        body:
          "Watch out: **strncpy doesn't always add the '\\0'**. If the source text is n characters or longer, strncpy(dst, src, n) copies exactly n characters and stops — leaving dst with no terminator. The fix is to **add it yourself afterward**: dst[n - 1] = '\\0';. Forgetting this is a common cause of garbled output and overflow bugs.",
      },
    ],
    questions: [
      {
        prompt: "What marks the end of a C-style string?",
        choices: ["A semicolon", "The null character '\\0'", "A newline '\\n'", "The last index of the array"],
        answer: 1,
        explanation:
          "A C-string is a char array terminated by the null character '\\0' (ASCII 0). Library functions rely on it to know where the string stops.",
      },
      {
        prompt: "What is the size of the array name3?",
        code: 'char name3[] = "Smith";',
        choices: ["5", "6", "7", "Depends on the compiler"],
        answer: 1,
        explanation:
          '"Smith" is 5 characters, plus the \'\\0\' that string-literal initialization adds automatically → size 6.',
      },
      {
        prompt: "Which of these does NOT add a null terminator?",
        choices: [
          'char a[100] = "Smith";',
          'char b[] = "Smith";',
          "char c[] = {'S','m','i','t','h'};",
          "All of them add one automatically",
        ],
        answer: 2,
        explanation:
          "Brace-initializing with individual chars stores exactly those 5 characters with no '\\0'. Only string-literal initialization adds the terminator for you.",
      },
      {
        prompt: 'With the input "  hello world", what ends up in st?',
        code: "char st[100];\ncin >> st;",
        choices: ['"  hello"', '"hello world"', '"hello"', '"world"'],
        answer: 2,
        explanation:
          "operator>> skips leading whitespace, then reads until the next whitespace — so it stops at the space and stores \"hello\".",
      },
      {
        prompt: "You need to read a full line, spaces included, into a char array. Which call do you use?",
        choices: ["cin >> name;", "cin.getline(name, length);", "strlen(name);", "name = cin;"],
        answer: 1,
        explanation:
          "cin.getline(name, length) reads characters including whitespace until the newline (or length-1 chars). operator>> would stop at the first space.",
      },
      {
        prompt: "What does the third argument do here?",
        code: "cin.getline(name, 10, '!');",
        choices: [
          "Limits the line to 10 lines",
          "Reads until the delimiter '!' is reached",
          "Skips all '!' characters",
          "Pads the string with '!'",
        ],
        answer: 1,
        explanation:
          "The optional third argument is a delimiter — getline reads until it hits that character instead of the newline.",
      },
      {
        prompt: "After reading a string one character at a time into an array, what must you do?",
        code: "for (i = 0; i < 10; i++) {\n    cin >> name[i];\n}",
        choices: [
          "Nothing — it's automatic",
          "Manually set name[i] = '\\0'",
          "Call strlen(name)",
          "Reverse the array",
        ],
        answer: 1,
        explanation:
          "Reading char-by-char never adds a terminator, so you must append '\\0' yourself or the array isn't a valid C-string.",
      },
      {
        prompt: "What does strlen return for the string \"Smith\"?",
        choices: ["4", "5", "6", "It depends on the array size"],
        answer: 1,
        explanation:
          "strlen counts characters up to but not including the '\\0' terminator → 5.",
      },
      {
        prompt: "strncmp(str1, str2, limit) returns 0 when…",
        choices: [
          "the first limit characters are equal",
          "str1 is longer than str2",
          "str1 comes before str2 alphabetically",
          "an error occurs",
        ],
        answer: 0,
        explanation:
          "strncmp returns 0 when the strings match, a negative value if str1 < str2, and a positive value if str1 > str2.",
      },
      {
        prompt: "Which function copies at most a limited number of characters from one C-string into another?",
        choices: ["strlen", "strncpy", "strncat", "strncmp"],
        answer: 1,
        explanation:
          "strncpy(target, src, limit) copies at most limit characters. strncat appends, strncmp compares, strlen measures.",
      },
      {
        prompt: "In which header are atoi, atol, and atof defined?",
        choices: ["<cstring>", "<cstdlib>", "<string>", "<iostream>"],
        answer: 1,
        explanation:
          "The string-to-number converters atoi/atol/atof live in <cstdlib>, not <cstring>.",
      },
      {
        prompt: "How do you convert a std::string `name` into the C-string array `st`?",
        choices: [
          "char st[] = name;",
          "strncpy(st, name.c_str(), 100);",
          "st = name;",
          "atoi(name);",
        ],
        answer: 1,
        explanation:
          "Use name.c_str() to get the C-string view, then strncpy it into your char array. The reverse direction — C-string to std::string — is automatic.",
      },
    ],
  },
  {
    id: "containers",
    title: "Container Classes",
    subtitle: "CS 2401 — the Bag class & STL",
    course: "cpp",
    showChart: false,
    cards: [
      {
        heading: "What a container class is",
        body:
          "A **container class** is a class whose objects hold a **collection of items** — many values bundled into one object. You've already used one: a **vector** is a container class. A **sequence class** is a container whose elements are kept in a set **order**, such as sorted. The container's whole job is to store the items and give you safe ways to add, find, and remove them.",
      },
      {
        heading: "Designing a container",
        body:
          "To design a container, you plan a few pieces. You need a **data structure** to hold the items (here, an array), a variable to **track how many** are stored, and a **constant for the capacity** — the most it can ever hold. Then you add **member functions** to do the work: a **constructor** to start it empty, **insert** to add a value, **erase** to remove one, **eraseAll** to remove every match, and **size** to report how many it holds.",
      },
      {
        heading: "The Bag class: its data",
        body:
          "Our example container is a **Bag** of integers, built on a fixed-size **static array**. The largest number of items it can hold is kept in a **static const** named **CAPACITY**. Its private data is just two fields: **int data[CAPACITY];** for the values and **size_t used;** for how many slots are currently filled. Code outside the bag never touches these fields directly — it goes through the bag's functions.",
      },
      {
        heading: "size_t, typedef, and using",
        body:
          "What is **size_t**? It's an **unsigned integer** type (it can't be negative), used for sizes and counts. It's defined with **typedef**, a keyword that gives an existing type a second name: **typedef int Integer;** lets you write Integer in place of int. Modern C++ does the same job with **using**: **using Integer = int;**. Both just create an **alias** — a nickname for a type, not a brand-new type.",
      },
      {
        heading: "The Bag's public interface",
        body:
          "The **public** interface is the list of things you can ask a bag to do. **Bag()** is the **constructor**; it starts the bag empty. **size()** returns how many values are stored and is marked **const** because it only reads. **insert(value)** adds a value and returns **false** if the bag is already full. **operator +=** pours another bag's contents into this one without going over CAPACITY.",
      },
      {
        heading: "Removing items: erase vs eraseAll",
        body:
          "Two functions take values out. **erase(target)** removes **one** copy of target and returns **true** if it actually found and removed it. **eraseAll(target)** removes **every** copy that matches. Both return a **bool** so the caller can tell whether anything was removed — useful when the value might not be in the bag at all.",
      },
      {
        heading: "Printing a bag with operator<<",
        body:
          "To print a bag as **[1, 2, 3]**, the class overloads **operator <<**. It's declared a **friend** so it can read the bag's private data while still being used as a normal out << bag call. A friend function is **not a member** of the class, but the class gives it permission to see inside. This is the standard way to make your own type printable with cout.",
      },
      {
        heading: "STL containers you get for free",
        body:
          "You rarely build containers by hand — the **Standard Template Library (STL)** ships ready-made ones. **vector** acts like a **dynamic array** that grows as needed. **set** stores **unique, sorted** elements: no duplicates, and you can't change an element in place. **multiset** also keeps elements **ordered** but **allows duplicates**. Pick the one whose rules fit the data you're storing.",
      },
    ],
    questions: [
      {
        prompt: "What is a container class?",
        choices: [
          "A class whose objects hold a collection of items",
          "A function that sorts data",
          "A special kind of loop",
          "A header file",
        ],
        answer: 0,
        explanation:
          "A container class is a class whose objects store a collection of items — a vector is a familiar example.",
      },
      {
        prompt: "Which of these is a container class you've already used?",
        choices: ["int", "vector", "if", "cout"],
        answer: 1,
        explanation:
          "A vector is a container class — it bundles a collection of elements into one object.",
      },
      {
        prompt: "What makes a sequence class different from a plain container?",
        choices: [
          "Its elements are kept in a set order",
          "It can only hold integers",
          "It has no capacity limit",
          "Its items cannot be erased",
        ],
        answer: 0,
        explanation:
          "A sequence class keeps its elements in a defined order (for example, sorted).",
      },
      {
        prompt: "In the Bag class, what does `used` track?",
        code: "int data[CAPACITY];\nsize_t used;",
        choices: [
          "The maximum capacity",
          "How many values are currently stored",
          "The largest value in the bag",
          "The array's memory address",
        ],
        answer: 1,
        explanation:
          "used counts how many slots are currently filled. CAPACITY is the fixed maximum.",
      },
      {
        prompt: "What is CAPACITY in the Bag class?",
        choices: [
          "A static constant for the most items the bag can hold",
          "The current number of items",
          "A member function",
          "A loop counter",
        ],
        answer: 0,
        explanation:
          "CAPACITY is a static const giving the largest number of items the fixed array can store.",
      },
      {
        prompt: "What kind of type is size_t?",
        choices: [
          "A signed integer",
          "An unsigned integer used for sizes and counts",
          "A floating-point type",
          "A container class",
        ],
        answer: 1,
        explanation:
          "size_t is an unsigned integer type (never negative), used for sizes and counts.",
      },
      {
        prompt: "What does this line do?",
        code: "typedef int Integer;",
        choices: [
          "Creates a new name (alias) for int",
          "Converts an Integer into an int",
          "Declares a variable named Integer",
          "Defines a new class",
        ],
        answer: 0,
        explanation:
          "typedef gives an existing type a second name. After this, Integer means int.",
      },
      {
        prompt: "Which line is the modern equivalent of `typedef int Integer;`?",
        choices: [
          "using Integer = int;",
          "int = Integer;",
          "alias Integer int;",
          "#define Integer int",
        ],
        answer: 0,
        explanation:
          "using Integer = int; creates the same alias as the typedef, in modern C++ style.",
      },
      {
        prompt: "Why is size() marked const?",
        code: "size_t size() const;",
        choices: [
          "It only reads the bag and never changes it",
          "It runs faster",
          "It always returns a constant value",
          "It can only be called once",
        ],
        answer: 0,
        explanation:
          "const promises the function won't modify the object — size() just reports how many items are stored.",
      },
      {
        prompt: "What's the difference between erase and eraseAll?",
        choices: [
          "erase removes one matching value; eraseAll removes every match",
          "erase is simply the faster version",
          "eraseAll only works on sorted bags",
          "There is no real difference",
        ],
        answer: 0,
        explanation:
          "erase deletes a single copy of the target; eraseAll deletes every copy that matches.",
      },
      {
        prompt: "Why is operator<< declared a friend of the Bag class?",
        choices: [
          "So it can read the bag's private data",
          "So it runs automatically at startup",
          "Because it is a member function",
          "To make it const",
        ],
        answer: 0,
        explanation:
          "operator<< isn't a member, so it's made a friend — that lets it read the bag's private data while still being called as out << bag.",
      },
      {
        prompt: "Which STL container stores unique, sorted elements?",
        choices: ["vector", "set", "multiset", "array"],
        answer: 1,
        explanation:
          "set holds unique, sorted elements. multiset is sorted too but allows duplicates; vector is an unordered dynamic array.",
      },
      {
        prompt: "What does insert return when the bag is already full?",
        choices: ["true", "false", "the current size", "nothing"],
        answer: 1,
        explanation:
          "insert returns false when CAPACITY is reached, so the caller knows the value wasn't added.",
      },
    ],
  },

  // ───────────────────────── CS3000 Discrete Structures ─────────────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e,
  // §1.1 "Speaking Mathematically: Variables". showChart is false because the
  // Big-O visuals don't apply to this material.
  {
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
  },

  // ───────────────────────── CS3000 · §1.2 The Language of Sets ─────────────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §1.2.
  // Text is original; the figure images are cropped from the section slides for study.
  {
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
  },

  // ─────────────── CS3000 · §1.3 The Language of Relations and Functions ───────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §1.3.
  // Text is original; the figure images are cropped from the section slides for study.
  {
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
  },

  // ─────────────────────── CS3000 · §1.4 The Language of Graphs ───────────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §1.4.
  // Text is original; the figure images are the section slides' own diagrams, reused
  // for study. showChart is false — the Big-O visuals don't apply to this material.
  {
    id: "discrete-1-4-graphs",
    title: "1.4 The Language of Graphs",
    subtitle: "CS3000 — §1.4",
    course: "discrete",
    showChart: false,
    cards: [
      {
        heading: "What a graph is",
        body:
          "A **graph** is a picture of connections: a set of **vertices** (the dots) joined by a set of **edges** (the line segments). Each edge links a vertex either to another vertex or back to itself; the lines may be straight or curved, and it's fine for two of them to **cross** at a point that is not a vertex. Careful — this is a completely different idea from the “**graph of an equation**” you plot on axes. Here a graph is just dots-and-lines, used to model *which things are connected to which*.",
        figure: {
          src: "/figures/discrete/graph-terminology.png",
          alt: "A graph whose features are labeled: parallel edges e2 and e3, a loop e5 at vertex v4, and an isolated vertex v5.",
          caption: "Vertices and edges — with a loop, parallel edges, and an isolated vertex called out",
        },
      },
      {
        heading: "How a graph is specified",
        body:
          "To pin a graph down exactly, you give three things: the **vertex set** (all the dots), the **edge set** (all the edges), and an **edge-endpoint function** that says, for each edge, **which vertex or vertices it connects**. The endpoints are written as a set: an ordinary edge joining v₁ and v₂ has endpoint set {v₁, v₂}. Because the drawing itself doesn't matter — only *what connects to what* — the **same graph can be drawn many different ways**, and two very different-looking pictures can represent the identical graph.",
        figure: {
          src: "/figures/discrete/graph-example.png",
          alt: "A graph with vertices v1 through v6 and edges e1 through e7, including parallel edges, two loops, and an isolated vertex.",
          caption: "A graph given by its vertex set, edge set, and edge-endpoint function",
        },
      },
      {
        heading: "Loops, parallel edges, isolated vertices",
        body:
          "Three special features get their own names. A **loop** is an edge that joins a vertex **to itself**. Two edges are **parallel** when they connect the **same pair** of vertices — two different roads between the same two towns. And a vertex with **no edge at all** touching it is **isolated**. A graph is allowed to have any mix of these; none of them is illegal. Spotting them quickly is the first skill in reading a graph.",
      },
      {
        heading: "Incidence and adjacency",
        body:
          "Two relationship words tie it all together. An edge is **incident on** each of its endpoints — so edge e with endpoints {v₁, v₂} is incident on v₁ and on v₂. Two **vertices** that are joined by an edge are **adjacent**. Two **edges** that share a common endpoint are adjacent to each other. And a vertex joined to itself by a loop counts as **adjacent to itself**. These terms are how you'll describe graphs precisely instead of pointing at the picture.",
      },
      {
        heading: "Directed graphs (digraphs)",
        body:
          "In a **directed graph**, or **digraph**, every edge carries a **direction**: it's associated with an **ordered pair** (v, w) rather than an unordered set, and is drawn as an **arrow** going *from* v *to* w. Order now matters — an arrow from v to w is not the same as one from w to v, exactly like the ordered pairs from §1.2. Digraphs model one-way relationships: one-way streets, “follows” on social media, or the “is-a” links below.",
      },
      {
        heading: "Graphs as models: networks",
        body:
          "Graphs shine at modeling **networks**. Telephone lines, power grids, gas pipelines, airline routes, and computer networks up to the whole **Internet** are all naturally drawn as graphs — vertices for the hubs, edges for the connections. A common design is the **hub-and-spoke** model, where many local vertices feed into a few central hubs. Framing a system as a graph turns real questions (minimize cost, keep everything connected) into graph questions you can actually solve.",
        figure: {
          src: "/figures/discrete/network-graph.png",
          alt: "An airline-style hub-and-spoke network graph connecting cities such as San Francisco, Denver, Chicago, New York, and Boston.",
          caption: "A hub-and-spoke network drawn as a graph",
        },
      },
      {
        heading: "Graphs as models: knowledge",
        body:
          "A **directed graph** can also store **knowledge**. Vertices are concepts; labeled arrows record facts like “**is-a**” and “**instance-of**.” The payoff is **inference**: a program can chase arrows to derive facts nobody typed in. If “*New York Times* → big-city daily” (instance-of), “big-city daily → newspaper” (is-a), and “newspaper → matte” (paper-finish), then following the chain lets you conclude the *New York Times* uses a **matte** finish — new knowledge built from stored links.",
        figure: {
          src: "/figures/discrete/knowledge-graph.png",
          alt: "A directed graph knowledge base about periodicals, with is-a, instance-of, contains, and paper-finish arrows linking concepts like Newspaper, Big-city daily, and Matte.",
          caption: "Figure 1.4.2 — a knowledge base as a directed graph",
        },
      },
      {
        heading: "Degree of a vertex",
        body:
          "The **degree** of a vertex is the **number of edge-ends** meeting at it — count every edge touching the vertex. An **isolated** vertex has degree **0**. The one trap: a **loop adds 2** to a vertex's degree, because *both* of its ends attach there. So a vertex with two ordinary edges plus one loop has degree 2 + 2 = **4**. (A neat consequence: adding up the degrees of all vertices always gives an even number — twice the number of edges.)",
        figure: {
          src: "/figures/discrete/graph-degree.png",
          alt: "A graph with an isolated vertex v1, a vertex v2 of degree 2, and a vertex v3 with two edges plus a loop giving degree 4.",
          caption: "Degrees: deg(v₁)=0, deg(v₂)=2, deg(v₃)=4 (the loop counts twice)",
        },
      },
      {
        heading: "Application: coloring a map",
        body:
          "Here's graph modeling in action. To color a map so **no two adjacent countries share a color**, notice that only *adjacency* matters — not sizes or shapes. So build a graph: one **vertex per country**, an **edge between vertices whose countries touch**. Coloring the map now means **coloring the vertices** so adjacent vertices differ. A good strategy is to keep coloring the **uncolored vertex of highest degree** first. This is the famous graph-coloring problem — the same idea used to schedule exams or assign radio frequencies.",
        figure: {
          src: "/figures/discrete/map-coloring.png",
          alt: "A map divided into regions labeled A through J, to be colored so no two adjacent regions share a color.",
          caption: "Figure 1.4.3 — a map A–J, modeled as a graph to color",
        },
      },
    ],
    questions: [
      {
        prompt: "In a graph, what are the dots and the line segments called?",
        choices: [
          "Nodes and links",
          "Vertices and edges",
          "Points and curves",
          "Endpoints and loops",
        ],
        answer: 1,
        explanation:
          "A graph is a set of vertices (the dots) joined by edges (the segments). “Nodes/links” is informal; the textbook terms are vertices and edges.",
      },
      {
        prompt: "What is a loop in a graph?",
        choices: [
          "An edge that connects a vertex to itself",
          "Two edges joining the same pair of vertices",
          "A vertex with no edges",
          "A path that returns to its start",
        ],
        answer: 0,
        explanation:
          "A loop is an edge whose two endpoints are the same vertex — it joins that vertex to itself.",
      },
      {
        prompt: "Two edges that connect the very same pair of vertices are called…",
        choices: ["adjacent", "incident", "parallel", "isolated"],
        answer: 2,
        explanation:
          "Edges connecting the same pair of vertices are parallel. (Adjacent edges merely share one endpoint; incident relates an edge to its endpoints.)",
      },
      {
        prompt: "A vertex that has no edge connected to it is described as…",
        choices: ["parallel", "isolated", "a loop", "adjacent"],
        answer: 1,
        explanation:
          "A vertex touched by no edge is isolated. Its degree is 0.",
      },
      {
        prompt:
          "Edge e₁ has endpoints {v₁, v₂}. Which statement uses the terminology correctly?",
        choices: [
          "v₁ and v₂ are parallel",
          "e₁ is incident on v₁ and v₂, and v₁ and v₂ are adjacent",
          "e₁ is isolated",
          "v₁ is a loop of v₂",
        ],
        answer: 1,
        explanation:
          "An edge is incident on each of its endpoints, and two vertices joined by an edge are adjacent. So e₁ is incident on v₁ and v₂, which are adjacent.",
      },
      {
        prompt: "What makes a directed graph (digraph) different from an ordinary graph?",
        choices: [
          "Its edges may be curved",
          "Each edge is an ordered pair of vertices, drawn as an arrow",
          "It cannot contain loops",
          "Its vertices must be numbered",
        ],
        answer: 1,
        explanation:
          "In a digraph each edge is associated with an ordered pair (v, w) and drawn as an arrow from v to w, so direction matters.",
      },
      {
        prompt:
          "Vertex v₃ has two ordinary edges plus one loop attached to it. What is deg(v₃)?",
        figure: {
          src: "/figures/discrete/graph-degree.png",
          alt: "A graph in which vertex v3 has two edges and one loop.",
          caption: "Find deg(v₃)",
        },
        choices: ["2", "3", "4", "6"],
        answer: 2,
        explanation:
          "Each ordinary edge contributes 1 and the loop contributes 2 (both its ends attach here): 1 + 1 + 2 = 4.",
      },
      {
        prompt: "What is the degree of an isolated vertex?",
        choices: ["0", "1", "2", "Undefined"],
        answer: 0,
        explanation:
          "An isolated vertex has no edges touching it, so its degree is 0.",
      },
      {
        prompt:
          "In the periodicals knowledge base: “New York Times → big-city daily,” “big-city daily → newspaper,” and “newspaper → matte (paper-finish).” What paper finish does the New York Times use?",
        choices: ["Glossy", "Matte", "It cannot be determined", "Both"],
        answer: 1,
        explanation:
          "Following the arrows, the New York Times is a big-city daily, which is a newspaper, whose paper-finish is matte — so the finish is matte. This is inference along a directed graph.",
      },
      {
        prompt:
          "You want to color a map so no two adjacent countries share a color. How do you model it as a graph?",
        choices: [
          "One vertex per country; an edge between countries that share a border",
          "One vertex per color; edges between colors",
          "One vertex per border; edges between borders",
          "Vertices for the largest countries only",
        ],
        answer: 0,
        explanation:
          "Make each country a vertex and join two vertices with an edge exactly when their countries are adjacent. Coloring the map becomes coloring the vertices so adjacent ones differ.",
      },
      {
        prompt:
          "Two drawings look different but have the same vertex set, edge set, and edge-endpoint function. What can you conclude?",
        choices: [
          "They are different graphs because they look different",
          "They represent the same graph",
          "One of them must contain an error",
          "Only if neither has a loop",
        ],
        answer: 1,
        explanation:
          "A graph is determined by its vertices, edges, and endpoints — not by how it's drawn. Same three pieces ⇒ same graph, regardless of the picture.",
      },
      {
        prompt:
          "When coloring a graph's vertices, a good strategy at each step is to color…",
        choices: [
          "the uncolored vertex of highest degree",
          "the vertex with the fewest edges",
          "any isolated vertex first",
          "vertices in alphabetical order",
        ],
        answer: 0,
        explanation:
          "Focusing on the uncolored vertex of maximum degree — the one connected to the most others — is an efficient heuristic for graph coloring.",
      },
    ],
  },

  // ───────────────── CS3000 · §2.1 Logical Form and Logical Equivalence ─────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.1.
  // Text is original; the figure images are the section slides' truth tables and the
  // Theorem 2.1.1 summary, reused for study. showChart is false.
  {
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
  },

  // ───────────────────────── CS3000 · §2.2 Conditional Statements ─────────────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.2.
  // Text is original; the figure images are the section slides' truth table and
  // operator-precedence chart, reused for study. showChart is false.
  {
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
  },

  // ─────────────────────── CS3000 · §2.3 Valid and Invalid Arguments ───────────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.3.
  // Text is original; the figure is the section's Table 2.3.1 summary, reused for study.
  {
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
  },

  // ─────────────────── CS3000 · §2.4 Application: Digital Logic Circuits ───────────────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.4.
  // Text is original; the figures are the section's gate charts, reused for study.
  {
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
  },

  // ────────── CS3000 · §2.5 Application: Number Systems and Circuits for Addition ──────────
  // Content authored from Epp, "Discrete Mathematics with Applications" 5e, §2.5.
  // Text is original; the figures are the section's tables and adder circuits, reused for study.
  {
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
  },
];

export default curriculum;
