// ─────────────────── c++ · 06.1 Multi-Dimensional Arrays ───────────────────
// Text is original; the code snippets are the deck's own.
import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "multidim-arrays",
  title: "Multi-Dimensional Arrays",
  subtitle: "2D/3D arrays, array parameters",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): default — not covered by the
  // diagnostic quiz or self-reported struggle list, not "known easy."
  examWeight: 1.0,
  cards: [
    {
      heading: "Declaring a multi-dimensional array",
      body:
        "C++ allows arrays with **multiple index values**. **char page[30][100];** declares an array of characters named `page` with **two index values**: the first ranges from 0 to 29, and the second ranges from 0 to 99. Each index is enclosed in its **own brackets**, and `page` can be visualized as an array of **30 rows and 100 columns**.",
    },
    {
      heading: "How `page` is actually stored",
      body:
        "The indexed variables for `page` run `page[0][0]` through `page[0][99]`, then `page[1][0]` through `page[1][99]`, and so on. `page` is actually an array of size **30**, and `page`'s **base type** is itself an array of **100 characters**, so indexing `page` once gives a 100-character row, and indexing again gives one character in that row.",
    },
    {
      heading: "Multi-dimensional array parameters",
      body:
        "For an ordinary one-dimensional array parameter, the size isn't needed: `void displayLine(const char a[], int size);`. For a multi-dimensional array parameter, the size of the **first dimension** is still left out, but every **remaining dimension's size must be given**: void displayPage(const char `page`[]**[100]**, int sizeDimension1);.",
      code: "void displayLine(const char a[], int size);\n\nvoid displayPage(\n    const char page[][100],\n    int sizeDimension1);",
    },
    {
      heading: "Two-dimensional arrays",
      body:
        "**int a[4][5];** declares a two-dimensional array where **4** is the number of **rows** and **5** is the number of **columns**. A single element is accessed with two indices in their own brackets, e.g. `a[0][2] = 12;` or, with variables, **a[i][j] = 5;**.",
      code: "int a[4][5];\n//4 is the number of rows\n//5 is the number of columns\na[0][2] = 12;\na[i][j] = 5;",
    },
    {
      heading: "Visiting every element",
      body:
        "Reading and printing every element both use a **nested loop**: the outer loop walks the **rows** (i), the inner loop walks the **columns** (j) for that row. To print row by row instead of one long stream, an **endl** goes **after the inner loop** finishes, not inside it.",
      code:
        "for (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncin >> a[i][j];\n}\n}\n\nfor (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncout << a[i][j];\n}\ncout << endl;\n}",
    },
    {
      heading: "A single row is itself an array",
      body:
        "Given **int a[10][10];** with `numRows` and `numCols` smaller than that, calling **sort(a[i], numCols)** for each row sorts that row in place. **a[i]**, one row of a two-dimensional array, is itself a valid **one-dimensional array**, exactly the type `sort`'s first parameter expects.",
      code:
        "int a[10][10];\nint numRows= 5, numCols = 8;\ninputArray(a, numRows, numCols);\nfor (i = 0; i < numRows; i++)\nsort(a[i], numCols); //any sort functions ...",
    },
    {
      heading: "Three-dimensional arrays",
      body:
        "**int a[3][4][5];** adds a **third index**. Filling it needs **three nested loops** (i, then j, then k), one per dimension, each `cin >>` writing into `a[i][j][k]`. **a[i]** is a **two-dimensional array**, **a[i][j]** is a one-dimensional array, and `a[i][j][k]` is a single element, so each extra index peels off one more dimension.",
      code:
        "int a[3][4][5];\nfor(i = 0; i < 3; i++){\nfor(j = 0; j < 4; j++){\nfor(k = 0; k < 5; k++){\ncin >> a[i][j][k];\n}\n}\n}",
    },
  ],
  questions: [
    {
      id: "multidim-arrays-q01",
      verifiedByHuman: false,
      prompt: "What does `char page[30][100];` declare?",
      choices: [
        "A single array of 30 characters",
        "A char array indexed 0–29 by 0–99",
        "A pointer to 100 characters",
        "A 30-character string that is then repeated 100 times over",
      ],
      answer: 1,
      explanation:
        "Each bracket pair is its own index value, so `page` has two: rows 0–29 and columns 0–99.",
    },
    {
      id: "multidim-arrays-q02",
      verifiedByHuman: false,
      prompt: "What is `page`'s base type, given `char page[30][100];`?",
      choices: [
        "A single char",
        "An array of 30 characters",
        "A pointer to an array of 30 arrays",
        "An array of 100 characters",
      ],
      answer: 3,
      explanation:
        "`page` is actually an array of size 30 whose base type, meaning what each of those 30 elements is, is an array of 100 characters.",
    },
    {
      id: "multidim-arrays-q03",
      verifiedByHuman: false,
      prompt: "In a multi-dimensional array parameter, which dimension's size can be left out?",
      code: "void displayPage(const char page[][100], int sizeDimension1);",
      choices: [
        "The first dimension's size only",
        "Every dimension's size can be left out",
        "Only the last dimension's size may be left out of the parameter",
        "No dimension's size can ever be left out",
      ],
      answer: 0,
      explanation:
        "Only the first dimension is omitted from the parameter type; `page[][100]` still states the second dimension explicitly.",
    },
    {
      id: "multidim-arrays-q04",
      verifiedByHuman: false,
      prompt: "In `int a[4][5];`, what do 4 and 5 represent?",
      code: "int a[4][5];\n//4 is the number of rows\n//5 is the number of columns",
      choices: [
        "4 columns and 5 rows",
        "4 rows and 5 columns",
        "The array's total capacity, 4 times 5",
        "Two separate one-dimensional arrays",
      ],
      answer: 1,
      explanation:
        "The deck's own comment states it directly: the first bracket is rows, the second is columns.",
    },
    {
      id: "multidim-arrays-q05",
      verifiedByHuman: false,
      prompt: "How do you access a single element of a[4][5] at row i, column j?",
      choices: ["a[i, j]", "a[i+j]", "a[i][j]", "a.at(i, j)"],
      answer: 2,
      explanation:
        "Each index gets its own bracket pair, so a two-dimensional access is `a[i][j]`, not a comma-separated index.",
    },
    {
      id: "multidim-arrays-q06",
      verifiedByHuman: false,
      prompt:
        "In the loop that prints a 2D array row by row, why does `cout << endl;` sit after the inner loop finishes, not inside it?",
      code: "for (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncout << a[i][j];\n}\ncout << endl;\n}",
      choices: [
        "So a newline prints once per row",
        "So a newline prints after every single element",
        "Because endl can't be used inside the body of a nested loop",
        "It has no effect on the output either way",
      ],
      answer: 0,
      explanation:
        "`endl` outside the inner loop but inside the outer loop fires exactly once per completed row, which is what produces one line per row of output.",
    },
    {
      id: "multidim-arrays-q07",
      verifiedByHuman: false,
      prompt:
        "Given `int a[10][10];` int `numRows`=5, `numCols`=8; and the loop for (i=0;i<`numRows`;i++) `sort(a[i], numCols)`;, what is `a[i]`?",
      code:
        "int a[10][10];\nint numRows= 5, numCols = 8;\ninputArray(a, numRows, numCols);\nfor (i = 0; i < numRows; i++)\nsort(a[i], numCols); //any sort functions ...",
      choices: [
        "A single int",
        "Row i, a one-dimensional array",
        "A pointer to the whole array a",
        "An error, because a[i] is not valid syntax on a 2D array",
      ],
      answer: 1,
      explanation:
        "Indexing a two-dimensional array once peels off one dimension, leaving `a[i]` as a plain one-dimensional array, a valid argument for a `sort` function expecting an array and a size.",
    },
    {
      id: "multidim-arrays-q08",
      verifiedByHuman: false,
      prompt: "For `int a[3][4][5];`, what is the type of `a[i]`?",
      code:
        "int a[3][4][5];\nfor(i = 0; i < 3; i++){\nfor(j = 0; j < 4; j++){\nfor(k = 0; k < 5; k++){\ncin >> a[i][j][k];\n}\n}\n}",
      choices: ["A single int", "A one-dimensional array", "A two-dimensional array", "Undefined; a[i] alone isn't valid"],
      answer: 2,
      explanation:
        "One index applied to a three-dimensional array leaves two dimensions remaining, so `a[i]` is itself a two-dimensional array.",
    },
    {
      id: "multidim-arrays-q09",
      verifiedByHuman: false,
      prompt: "For `int a[3][4][5];`, what is the type of `a[i][j][k]`?",
      choices: [
        "A two-dimensional array",
        "A one-dimensional array",
        "A pointer to int",
        "A single int, one element",
      ],
      answer: 3,
      explanation:
        "Applying all three indices peels off all three dimensions, leaving exactly one int element.",
    },
    {
      id: "multidim-arrays-q10",
      verifiedByHuman: false,
      prompt: "How many nested loops are needed to fill `int a[3][4][5];` element by element with `cin`?",
      choices: ["One", "Two", "Three", "Four, one per dimension plus one"],
      answer: 2,
      explanation:
        "Each dimension needs its own loop variable to reach every combination of indices, so a 3D array needs 3 nested loops.",
    },
    {
      id: "multidim-arrays-q11",
      verifiedByHuman: false,
      prompt:
        "Why does declaring a formal parameter as `const char page[][100]` still require the 100, when a plain 1D array parameter like `const char a[]` needs no size at all?",
      choices: [
        "The compiler needs the column count to find where each row starts",
        "Because it's a stylistic convention with no real effect",
        "Because 2D array parameters are not actually allowed in C++ at all",
        "Because char arrays are handled differently from int arrays",
      ],
      answer: 0,
      explanation:
        "Only the first dimension's size is ever optional; every dimension after it must be given so indexing math can locate each row correctly.",
    },
  ],
  items: [
    makeItem({
      id: "multidim-arrays-01",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What does `char page[30][100];` declare, and what are its two index ranges?",
      expected:
        "It declares an array of characters named page with two index values: the first ranges from 0 to 29, and the second ranges from 0 to 99. Each index is enclosed in its own brackets, and page can be visualized as an array of 30 rows and 100 columns.",
      criteria: [
        "States page has two index values with ranges 0-29 and 0-99",
        "States page can be visualized as 30 rows by 100 columns",
      ],
      provenance: {
        sourceId: "cpp-slides-06.1-multidim-arrays",
        anchor: "#declaring-2d-array-concept",
        excerpt:
          "- C++ allows arrays with multiple index values\n- char page[30][100]; declares an array of characters named page\n- page has two index values: the first ranges from 0 to 29, the second ranges from 0 to 99\n- Each index is enclosed in its own brackets\n- page can be visualized as an array of 30 rows and 100 columns",
        citation: "Lecture Deck 06.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/multidim-arrays.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-02",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is `page`'s actual size, and what is its base type, given `char page[30][100];`?",
      expected:
        "page is actually an array of size 30. page's base type is an array of 100 characters, so indexing page once gives a 100-character row, and indexing again gives one character within that row.",
      criteria: [
        "States page is an array of size 30",
        "States page's base type is an array of 100 characters",
      ],
      provenance: {
        sourceId: "cpp-slides-06.1-multidim-arrays",
        anchor: "#index-values-of-page",
        excerpt:
          "- The indexed variables for array page are page[0][0], page[0][1], …, page[0][99], page[1][0], page[1][1], …, page[1][99], …, page[29][0], page[29][1], … , page[29][99]\n- page is actually an array of size 30\n- page's base type is an array of 100 characters",
        citation: "Lecture Deck 06.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/multidim-arrays.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-03",
      topicId: "multidim-arrays",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "How does declaring a multi-dimensional array differ from declaring a multi-dimensional array parameter, in terms of which dimension sizes must be given?",
      expected:
        "Declaring the array itself (char page[30][100];) requires every dimension's size. Declaring it as a formal parameter (void displayPage(const char page[][100], int sizeDimension1);) is looser: the first dimension's size is left out, but the remaining dimension sizes (100 here) must still be given, same as an ordinary one-dimensional array parameter (void displayLine(const char a[], int size);) needs no size at all.",
      criteria: [
        "States the array declaration itself needs all dimension sizes",
        "States the parameter form omits only the first dimension's size, keeping the rest",
      ],
      provenance: {
        sourceId: "cpp-slides-06.1-multidim-arrays",
        anchor: "#multidim-array-parameters",
        excerpt:
          "- Recall that the size of an array is not needed when declaring a formal parameter\n- void displayLine(const char a[], int size);\n- In a multi-dimensional array parameter, the size of the first dimension in not given, the remaining dimension sizes must be given\n- void displayPage(const char page[][100], int sizeDimension1);",
        citation: "Lecture Deck 06.1",
      },
      extraAtoms: ["#declaring-2d-array-concept"],
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/multidim-arrays.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-04",
      topicId: "multidim-arrays",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write the nested loop that reads every element of `int a[4][5];` from `cin`, using loop variables i and j.",
      expected: "for (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncin >> a[i][j];\n}\n}",
      criteria: [
        "Outer loop runs i from 0 to 3 (4 rows)",
        "Inner loop runs j from 0 to 4 (5 columns), reading into a[i][j] each time",
      ],
      timeBudgetSec: 90,
      provenance: {
        sourceId: "cpp-slides-06.1-multidim-arrays",
        anchor: "#accessing-every-element",
        excerpt: "for (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncin >> a[i][j];\n}\n}",
        citation: "Lecture Deck 06.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/multidim-arrays.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-05",
      topicId: "multidim-arrays",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace this code:\n```\nint a[10][10];\nint numRows= 5, numCols = 8;\ninputArray(a, numRows, numCols);\nfor (i = 0; i < numRows; i++)\nsort(a[i], numCols); //any sort functions ...\n```\nWhat is `a[i]`, and why is it a valid first argument to `sort`?",
      expected:
        "a[i] is row i of the two-dimensional array a. Indexing a two-dimensional array once peels off one dimension, leaving a plain one-dimensional array of numCols elements. That's exactly the type sort's first parameter expects, so passing a[i] sorts just that row in place.",
      criteria: [
        "States a[i] is one row of the array, a one-dimensional array",
        "Explains this is why it's a valid argument to a function expecting a one-dimensional array",
      ],
      provenance: {
        sourceId: "cpp-slides-06.1-multidim-arrays",
        anchor: "#sorting-each-row",
        excerpt:
          "int a[10][10];\nint numRows= 5, numCols = 8;\ninputArray(a, numRows, numCols);\nfor (i = 0; i < numRows; i++)\nsort(a[i], numCols); //any sort functions ...",
        citation: "Lecture Deck 06.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/multidim-arrays.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-06",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "For `int a[3][4][5];`, what are the types of `a[i]`, `a[i][j]`, and `a[i][j][k]`?",
      expected:
        "a[i] is a two-dimensional array (int[4][5]). a[i][j] is a one-dimensional array (int[5]). a[i][j][k] is a single int element. Each additional index applied peels off one more dimension, matching the three nested loops (i, then j, then k) needed to visit every element with cin.",
      criteria: [
        "States a[i] is two-dimensional and a[i][j] is one-dimensional",
        "States a[i][j][k] is a single element",
      ],
      provenance: {
        sourceId: "cpp-slides-06.1-multidim-arrays",
        anchor: "#three-dimensional-arrays",
        excerpt:
          "int a[3][4][5];\nfor(i = 0; i < 3; i++){\nfor(j = 0; j < 4; j++){\nfor(k = 0; k < 5; k++){\ncin >> a[i][j][k];\n}\n}\n}",
        citation: "Lecture Deck 06.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/multidim-arrays.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-mcq-01",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In a multi-dimensional array parameter, which dimension's size can be left out?\n```\nvoid displayPage(const char page[][100], int sizeDimension1);\n```",
      choices: [
        "The first dimension's size only",
        "Every dimension's size can be left out",
        "Only the last dimension's size may be left out of the parameter",
        "No dimension's size can ever be left out",
      ],
      answerIndex: 0,
      expected: "The first dimension's size only",
      criteria: [
        "Only the first dimension is omitted from the parameter type; page[][100] still states the second dimension explicitly.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-mcq-02",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In `int a[4][5];`, what do 4 and 5 represent?\n```\nint a[4][5];\n//4 is the number of rows\n//5 is the number of columns\n```",
      choices: [
        "4 columns and 5 rows",
        "4 rows and 5 columns",
        "The array's total capacity, 4 times 5",
        "Two separate one-dimensional arrays",
      ],
      answerIndex: 1,
      expected: "4 rows and 5 columns",
      criteria: [
        "The deck's own comment states it directly: the first bracket is rows, the second is columns.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-mcq-03",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "How do you access a single element of a[4][5] at row i, column j?",
      choices: [
        "a[i, j]",
        "a[i+j]",
        "a[i][j]",
        "a.at(i, j)",
      ],
      answerIndex: 2,
      expected: "a[i][j]",
      criteria: [
        "Each index gets its own bracket pair, so a two-dimensional access is a[i][j], not a comma-separated index.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-mcq-04",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In the loop that prints a 2D array row by row, why does `cout << endl;` sit after the inner loop finishes, not inside it?\n```\nfor (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncout << a[i][j];\n}\ncout << endl;\n}\n```",
      choices: [
        "So a newline prints once per row",
        "So a newline prints after every single element",
        "Because endl can't be used inside the body of a nested loop",
        "It has no effect on the output either way",
      ],
      answerIndex: 0,
      expected: "So a newline prints once per row",
      criteria: [
        "endl outside the inner loop but inside the outer loop fires exactly once per completed row, which is what produces one line per row of output.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),

    // ── Course quiz: "Arrays & Recursion" ──────────────────────────────────
    // Transcribed verbatim from the graded quiz's answer key — prompt text,
    // choice wording, and choice order are the quiz's own and must not be
    // rewritten. The recursion half of the same quiz lives in recursion.js.
    // provenance is null for the same reason as the -mcq- items above: a quiz
    // paper is not one of the sources/ files an anchor can resolve into.
    makeItem({
      id: "multidim-arrays-quiz-01",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "What is the output?\n```\nint numarray[2][2] = {{8, 7}, {6, 5}};\ncout << numarray[0];\n```",
      choices: ["8", "8,7", "87", "none of the above"],
      answerIndex: 3,
      expected: "none of the above",
      criteria: [
        "numarray[0] decays to int*, so this prints an address, not a value.",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-quiz-02",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "`int val = arr[0][2];` — which value is stored in `val`?",
      choices: [
        "first row, second column",
        "first row, first column",
        "first row, third column",
        "third row, second column",
      ],
      answerIndex: 2,
      expected: "first row, third column",
      criteria: [
        "Both subscripts are zero-based: [0] is the first row and [2] is the third column.",
      ],
      provenance: null,
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-quiz-03",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Value of `numarray[1][2]`?\n```\nint cnt = 0;\nint numarray[2][3];\nfor (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 2; j++) {\n        numarray[j][i] = cnt;\n        cnt++;\n    }\n}\n```",
      choices: ["2", "5", "3", "4"],
      answerIndex: 1,
      expected: "5",
      criteria: [
        "The subscripts are swapped, so the array fills column by column: i=2 writes [0][2]=4 then [1][2]=5.",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-quiz-04",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Value of `myarray[1][2]`?\n```\nint cnt = 0;\nint myarray[4][5];\nfor (int i = 0; i < 5; i++) {\n    for (int j = 0; j < 4; j++) {\n        myarray[j][i] = cnt;\n        cnt++;\n    }\n}\n```",
      choices: ["8", "19", "9", "30"],
      answerIndex: 2,
      expected: "9",
      criteria: [
        "Column-by-column fill: each i writes 4 values, so i=2 starts at cnt=8 and j=1 gets 9.",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),

    // Typed counterparts of the four quiz MCQs above. Same prompts, no choices,
    // so Drill and Practice hand over a textarea instead of a choice list —
    // producing the answer cold is the skill the MCQ can't test. Both versions
    // ship on purpose; they schedule independently.
    makeItem({
      id: "multidim-arrays-quiz-written-01",
      topicId: "multidim-arrays",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "What is the output?\n```\nint numarray[2][2] = {{8, 7}, {6, 5}};\ncout << numarray[0];\n```",
      expected:
        "An address. numarray[0] is the first row, which decays to an int* pointing at numarray[0][0], so operator<< prints a pointer value (something like 0x7ffd...), not 8, not 8,7, and not 87.",
      criteria: [
        "Says the output is an address / pointer value, not an element",
        "Explains that numarray[0] decays to int* rather than naming a stored number",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-quiz-written-02",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "`int val = arr[0][2];` — which value is stored in `val`?",
      expected: "The value in the first row, third column of arr.",
      criteria: [
        "Identifies the first row (subscript 0 is row 1)",
        "Identifies the third column (subscript 2 is column 3)",
      ],
      provenance: null,
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-quiz-written-03",
      topicId: "multidim-arrays",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "What is the value of `numarray[1][2]`?\n```\nint cnt = 0;\nint numarray[2][3];\nfor (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 2; j++) {\n        numarray[j][i] = cnt;\n        cnt++;\n    }\n}\n```",
      expected:
        "5. The subscripts are swapped (numarray[j][i]), so the array fills column by column: i=0 writes [0][0]=0 and [1][0]=1, i=1 writes [0][1]=2 and [1][1]=3, i=2 writes [0][2]=4 and [1][2]=5.",
      criteria: [
        "Answers 5",
        "Traces the column-by-column fill order caused by numarray[j][i]",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-quiz-written-04",
      topicId: "multidim-arrays",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "What is the value of `myarray[1][2]`?\n```\nint cnt = 0;\nint myarray[4][5];\nfor (int i = 0; i < 5; i++) {\n    for (int j = 0; j < 4; j++) {\n        myarray[j][i] = cnt;\n        cnt++;\n    }\n}\n```",
      expected:
        "9. Each pass of i writes a whole column of 4 values, so i=0 uses cnt 0-3, i=1 uses 4-7, and i=2 starts at 8: [0][2]=8, then [1][2]=9.",
      criteria: [
        "Answers 9",
        "Shows that each i writes 4 values, so column i=2 starts at cnt=8",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),

    // ── Practice bank: array mechanics ─────────────────────────────────────
    // Same style as the graded quiz, different numbers. Each question ships as
    // an MCQ and a typed counterpart.
    makeItem({
      id: "multidim-arrays-practice-a6",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Given `int a[10][10];` with `numRows = 5, numCols = 8`, what is the type of `a[i]`?",
      choices: ["`int`", "`int*` of length 8", "`int[10]`", "`int[8]`"],
      answerIndex: 2,
      expected: "`int[10]`",
      criteria: [
        "The type comes from the declaration, not from runtime variables — numRows and numCols are distractors.",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-a6-written",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Given `int a[10][10];` with `numRows = 5, numCols = 8`, what is the type of `a[i]`?",
      expected:
        "int[10] — a row of the declared array. The type is fixed by the declaration `int a[10][10]`, so numRows and numCols have no effect on it; they only control how much of the array a loop happens to visit.",
      criteria: [
        "Answers int[10] (an array of 10 ints)",
        "States that the type comes from the declaration, not from numRows/numCols",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-b1",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "With `int a[3][4][5];`, what is the type of `a[i][j]`?",
      choices: ["`int`", "an array of 5 ints", "an array of 4 ints", "`int**`"],
      answerIndex: 1,
      expected: "an array of 5 ints",
      criteria: [
        "Each subscript peels one dimension: a[i] is int[4][5], a[i][j] is int[5], and only a[i][j][k] is an int.",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-b1-written",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "With `int a[3][4][5];`, what is the type of `a[i][j]`, and why?",
      expected:
        "An array of 5 ints (int[5]). Each subscript peels off one dimension: a is int[3][4][5], a[i] is int[4][5], a[i][j] is int[5]. Only a[i][j][k] is an int.",
      criteria: [
        "Answers an array of 5 ints / int[5]",
        "Explains that each subscript removes one dimension, so only the third gives an int",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-b2",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Value of `arr[2][1]`?\n```\nint cnt = 1;\nint arr[3][4];\nfor (int i = 0; i < 4; i++) {\n    for (int j = 0; j < 3; j++) {\n        arr[j][i] = cnt;\n        cnt += 2;\n    }\n}\n```",
      choices: ["9", "11", "12", "13"],
      answerIndex: 1,
      expected: "11",
      criteria: [
        "Column-by-column fill with a step of 2 from 1: column 0 gets 1, 3, 5; column 1 gets 7, 9, 11, so [2][1] is 11.",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-b2-written",
      topicId: "multidim-arrays",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "What is the value of `arr[2][1]`?\n```\nint cnt = 1;\nint arr[3][4];\nfor (int i = 0; i < 4; i++) {\n    for (int j = 0; j < 3; j++) {\n        arr[j][i] = cnt;\n        cnt += 2;\n    }\n}\n```",
      expected:
        "11. The subscripts are swapped, so it fills column by column, 3 cells per column, stepping by 2 from 1: column 0 gets [0][0]=1, [1][0]=3, [2][0]=5; column 1 gets [0][1]=7, [1][1]=9, [2][1]=11.",
      criteria: [
        "Answers 11",
        "Traces the column-by-column order with the step of 2 starting from 1",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-b3",
      topicId: "multidim-arrays",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "In `void displayPage(const char page[][100], int size);` why must the 100 be written?",
      choices: [
        "so the compiler knows how many rows exist",
        "so the compiler can compute the offset for each row",
        "so the array is passed by value instead of by reference",
        "it doesn't have to be; it's optional style",
      ],
      answerIndex: 1,
      expected: "so the compiler can compute the offset for each row",
      criteria: [
        "page[i][j] is address arithmetic — base + i * 100 + j — so the row width is the stride; the first dimension is omittable because it never enters that formula.",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "multidim-arrays-practice-b3-written",
      topicId: "multidim-arrays",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "In `void displayPage(const char page[][100], int size);` why must the 100 be written, while the first dimension can be left empty?",
      expected:
        "Because indexing is address arithmetic: page[i][j] is base + i * 100 + j, so the compiler needs the row width to know the stride from one row to the next. The first dimension never appears in that formula, which is exactly why it can be omitted.",
      criteria: [
        "States the row width is needed to compute the per-row offset / stride",
        "States the first dimension is omittable because it doesn't enter the address calculation",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
  ],
};
