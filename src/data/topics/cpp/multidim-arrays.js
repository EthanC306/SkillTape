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
        "C++ allows arrays with **multiple index values**. **char page[30][100];** declares an array of characters named page with **two index values**: the first ranges from 0 to 29, and the second ranges from 0 to 99. Each index is enclosed in its **own brackets**, and page can be visualized as an array of **30 rows and 100 columns**.",
    },
    {
      heading: "How page is actually stored",
      body:
        "The indexed variables for page run page[0][0] through page[0][99], then page[1][0] through page[1][99], and so on. page is actually an array of size **30** — page's **base type** is itself an array of **100 characters**, so indexing page once gives a 100-character row, and indexing again gives one character in that row.",
    },
    {
      heading: "Multi-dimensional array parameters",
      body:
        "For an ordinary one-dimensional array parameter, the size isn't needed: void displayLine(const char a[], int size);. For a multi-dimensional array parameter, the size of the **first dimension** is still left out, but every **remaining dimension's size must be given**: void displayPage(const char page[]**[100]**, int sizeDimension1);.",
      code: "void displayLine(const char a[], int size);\n\nvoid displayPage(\n    const char page[][100],\n    int sizeDimension1);",
    },
    {
      heading: "Two-dimensional arrays",
      body:
        "**int a[4][5];** declares a two-dimensional array where **4** is the number of **rows** and **5** is the number of **columns**. A single element is accessed with two indices in their own brackets, e.g. a[0][2] = 12; or, with variables, **a[i][j] = 5;**.",
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
        "Given **int a[10][10];** with numRows and numCols smaller than that, calling **sort(a[i], numCols)** for each row sorts that row in place. **a[i]** — one row of a two-dimensional array — is itself a valid **one-dimensional array**, exactly the type sort's first parameter expects.",
      code:
        "int a[10][10];\nint numRows= 5, numCols = 8;\ninputArray(a, numRows, numCols);\nfor (i = 0; i < numRows; i++)\nsort(a[i], numCols); //any sort functions ...",
    },
    {
      heading: "Three-dimensional arrays",
      body:
        "**int a[3][4][5];** adds a **third index**. Filling it needs **three nested loops** — i, then j, then k — one per dimension, each cin >> writing into a[i][j][k]. **a[i]** is a **two-dimensional array**, **a[i][j]** is a one-dimensional array, and a[i][j][k] is a single element — each extra index peels off one more dimension.",
      code:
        "int a[3][4][5];\nfor(i = 0; i < 3; i++){\nfor(j = 0; j < 4; j++){\nfor(k = 0; k < 5; k++){\ncin >> a[i][j][k];\n}\n}\n}",
    },
  ],
  questions: [
    {
      prompt: "What does char page[30][100]; declare?",
      choices: [
        "A single array of 30 characters",
        "A char array indexed 0–29 by 0–99",
        "A pointer to 100 characters",
        "A 30-character string that is then repeated 100 times over",
      ],
      answer: 1,
      explanation:
        "Each bracket pair is its own index value, so page has two: rows 0–29 and columns 0–99.",
    },
    {
      prompt: "What is page's base type, given char page[30][100];?",
      choices: [
        "A single char",
        "An array of 30 characters",
        "A pointer to an array of 30 arrays",
        "An array of 100 characters",
      ],
      answer: 3,
      explanation:
        "page is actually an array of size 30 whose base type — what each of those 30 elements is — is an array of 100 characters.",
    },
    {
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
        "Only the first dimension is omitted from the parameter type; page[][100] still states the second dimension explicitly.",
    },
    {
      prompt: "In int a[4][5];, what do 4 and 5 represent?",
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
      prompt: "How do you access a single element of a[4][5] at row i, column j?",
      choices: ["a[i, j]", "a[i+j]", "a[i][j]", "a.at(i, j)"],
      answer: 2,
      explanation:
        "Each index gets its own bracket pair, so a two-dimensional access is a[i][j], not a comma-separated index.",
    },
    {
      prompt:
        "In the loop that prints a 2D array row by row, why does cout << endl; sit after the inner loop finishes, not inside it?",
      code: "for (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncout << a[i][j];\n}\ncout << endl;\n}",
      choices: [
        "So a newline prints once per row",
        "So a newline prints after every single element",
        "Because endl can't be used inside the body of a nested loop",
        "It has no effect on the output either way",
      ],
      answer: 0,
      explanation:
        "endl outside the inner loop but inside the outer loop fires exactly once per completed row, which is what produces one line per row of output.",
    },
    {
      prompt:
        "Given int a[10][10]; int numRows=5, numCols=8; and the loop for (i=0;i<numRows;i++) sort(a[i], numCols);, what is a[i]?",
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
        "Indexing a two-dimensional array once peels off one dimension, leaving a[i] as a plain one-dimensional array — a valid argument for a sort function expecting an array and a size.",
    },
    {
      prompt: "For int a[3][4][5];, what is the type of a[i]?",
      code:
        "int a[3][4][5];\nfor(i = 0; i < 3; i++){\nfor(j = 0; j < 4; j++){\nfor(k = 0; k < 5; k++){\ncin >> a[i][j][k];\n}\n}\n}",
      choices: ["A single int", "A one-dimensional array", "A two-dimensional array", "Undefined — a[i] alone isn't valid"],
      answer: 2,
      explanation:
        "One index applied to a three-dimensional array leaves two dimensions remaining, so a[i] is itself a two-dimensional array.",
    },
    {
      prompt: "For int a[3][4][5];, what is the type of a[i][j][k]?",
      choices: [
        "A two-dimensional array",
        "A one-dimensional array",
        "A pointer to int",
        "A single int — one element",
      ],
      answer: 3,
      explanation:
        "Applying all three indices peels off all three dimensions, leaving exactly one int element.",
    },
    {
      prompt: "How many nested loops are needed to fill int a[3][4][5]; element by element with cin?",
      choices: ["One", "Two", "Three", "Four, one per dimension plus one"],
      answer: 2,
      explanation:
        "Each dimension needs its own loop variable to reach every combination of indices, so a 3D array needs 3 nested loops.",
    },
    {
      prompt:
        "Why does declaring a formal parameter as const char page[][100] still require the 100, when a plain 1D array parameter like const char a[] needs no size at all?",
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
      prompt: "What does char page[30][100]; declare, and what are its two index ranges?",
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
      prompt: "What is page's actual size, and what is its base type, given char page[30][100];?",
      expected:
        "page is actually an array of size 30. page's base type is an array of 100 characters — so indexing page once gives a 100-character row, and indexing again gives one character within that row.",
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
        "Declaring the array itself (char page[30][100];) requires every dimension's size. Declaring it as a formal parameter (void displayPage(const char page[][100], int sizeDimension1);) is looser: the first dimension's size is left out, but the remaining dimension sizes — 100 here — must still be given, same as an ordinary one-dimensional array parameter (void displayLine(const char a[], int size);) needs no size at all.",
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
      prompt: "Write the nested loop that reads every element of int a[4][5]; from cin, using loop variables i and j.",
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
        "Trace this code:\n```\nint a[10][10];\nint numRows= 5, numCols = 8;\ninputArray(a, numRows, numCols);\nfor (i = 0; i < numRows; i++)\nsort(a[i], numCols); //any sort functions ...\n```\nWhat is a[i], and why is it a valid first argument to sort?",
      expected:
        "a[i] is row i of the two-dimensional array a — indexing a two-dimensional array once peels off one dimension, leaving a plain one-dimensional array of numCols elements. That's exactly the type sort's first parameter expects, so passing a[i] sorts just that row in place.",
      criteria: [
        "States a[i] is one row of the array — a one-dimensional array",
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
      prompt: "For int a[3][4][5];, what are the types of a[i], a[i][j], and a[i][j][k]?",
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
      prompt: "In int a[4][5];, what do 4 and 5 represent?\n```\nint a[4][5];\n//4 is the number of rows\n//5 is the number of columns\n```",
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
      prompt: "In the loop that prints a 2D array row by row, why does cout << endl; sit after the inner loop finishes, not inside it?\n```\nfor (i = 0; i < 4; i++){\nfor (j = 0; j < 5; j++){\ncout << a[i][j];\n}\ncout << endl;\n}\n```",
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
  ],
};
