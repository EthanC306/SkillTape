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
 *   cards     — Learn-mode note cards: { heading, body }. In `body`, wrap key
 *               terms in **double asterisks** to bold them (and to turn them into
 *               fill-in-the-blank inputs in Fill Mode).
 *   questions — Quiz-mode questions: { prompt, code?, choices, answer, explanation, tag? }
 *               where `answer` is the 0-based index of the correct choice and the
 *               optional `tag` highlights the matching curve on the Big-O chart.
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
];

export default curriculum;
