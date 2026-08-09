import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "dynamic-alloc",
  title: "Dynamic Allocation",
  subtitle: "Pointers & the heap",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): provisional, not point-derived —
  // the graded midterm/answers weren't available, so this is ranked from a
  // 9-question diagnostic quiz + self-reported struggle instead. Confirmed
  // gaps here: mixing new int(5) [single-value init] with new int[5] [array
  // alloc], and assuming a dangling pointer still reliably reads its old
  // value instead of recognizing UB. Revisit with real numbers once graded
  // work exists (see D-none, just the A0 "Note").
  examWeight: 2.0,
  cards: [
    {
      heading: "Static vs. dynamic allocation",
      body:
        "Variables you declare normally get their memory automatically — that's **static allocation**. **Dynamic allocation** lets a program request memory while it's running, on demand. A **pointer** is a variable that holds a **memory address**, so having a pointer to a location just means holding that address, ready to use. Any variable's address can be obtained with the **address-of operator**, &, as in &x.",
    },
    {
      heading: "Declaring pointers",
      body:
        "A pointer declaration writes the pointed-to type, then an asterisk, then the name: double *dblPtr, value; — but only **dblPtr is a pointer** here; value is an ordinary double. dblPtr is a **pointer to a double**, so it's **compatible with &value** (the address of a double), not with the address of an int or a char.",
    },
    {
      heading: "Dereferencing",
      body:
        "Once dblPtr = &value; makes dblPtr point at value's memory, the same symbol used to declare a pointer also **accesses what it points to**: *dblPtr = 12.3; changes the memory value refers to, so cout << *dblPtr and cout << value now print the **same number**. Using * this way is called the **dereferencing operator**.",
    },
    {
      heading: "Allocating with new",
      body:
        "The **new operator** requests a block of memory from a place called the **heap**. intPtr = new int; allocates space for one int, leaving it holding **garbage**. new int(99) both **allocates and initializes**, so the memory already holds 99. Any type works this way — new double, new char('A'), and so on.",
    },
    {
      heading: "Freeing memory with delete",
      body:
        "Memory from new doesn't free itself — you must **explicitly deallocate** it with the **delete operator**: delete intPtr;. This returns the memory to the **heap** so it can be reused. Forgetting to delete leaves that memory unusable for the rest of the program — a **memory leak**.",
    },
    {
      heading: "Dangling references",
      body:
        "If two pointers hold the **same address** — intPtr2 = intPtr1; — and then delete intPtr1; frees that memory, intPtr2 still points at the now-freed spot. intPtr2 is called a **dangling reference**: it points to memory that is **no longer allocated**, and using it is undefined behavior.",
    },
    {
      heading: "nullptr",
      body:
        "**nullptr** is a special constant pointer value meaning it **points at nothing**. It plays the same role NULL played in older C++, and it's the standard way to **initialize a pointer** before it's given a real address. Unlike an integer literal, nullptr can be assigned to **any pointer type**.",
    },
    {
      heading: "When new fails",
      body:
        "If the **new operator** can't find enough free memory, it doesn't just return an error code — it **throws an exception**, and if nothing catches it, the program **terminates**. Handling that failure gracefully requires an **exception handler** around the allocation.",
    },
    {
      heading: "Static, dynamic, and automatic variables",
      body:
        "C++ variables fall into three groups. **Automatic variables** are the ordinary local variables you've always used — created and destroyed as their scope is entered and left. **Dynamic variables** are created explicitly with **new**, and live until you delete them. **Static variables**, made with the static keyword (static int x = 5;), are **global to the file** and keep their value for the program's whole run.",
    },
    {
      heading: "Type inference with auto",
      body:
        "Since C++11, the **auto** keyword lets the compiler figure out a variable's type from its initializer — but the variable **must be initialized at declaration**. auto value = 2.3; creates a double, and auto ptr = &value; creates a **pointer to a double**, because that's what &value produces.",
    },
  ],
  questions: [
    {
      prompt: "What is a pointer?",
      choices: [
        "A function that allocates memory",
        "A variable that holds a memory address",
        "A loop control variable",
        "A type of array",
      ],
      answer: 1,
      explanation:
        "A pointer is a variable whose value is a memory address — the address of some other variable.",
    },
    {
      prompt: "Which operator returns the memory address of a variable?",
      choices: [
        "::",
        "->",
        "&",
        "*",
      ],
      answer: 2,
      explanation:
        "The address-of operator, &, returns a variable's memory address, as in &x.",
    },
    {
      prompt: "Given this declaration, which variable is a pointer?",
      code: "double *dblPtr, value;",
      choices: [
        "Both dblPtr and value",
        "Only dblPtr",
        "Neither",
        "Only value",
      ],
      answer: 1,
      explanation:
        "The * binds to the name it precedes, so only dblPtr is a pointer; value is an ordinary double.",
    },
    {
      prompt: "What does *dblPtr do in this code?",
      code: "value = 34.5;\ndblPtr = &value;\n*dblPtr = 12.3;",
      choices: [
        "Dereferences dblPtr to access/change the memory value refers to",
        "Deletes the pointer",
        "Declares a new pointer",
        "Compares dblPtr to value",
      ],
      answer: 0,
      explanation:
        "*dblPtr dereferences the pointer, reaching into the memory it points to (the same memory as value).",
    },
    {
      prompt: "What does this statement do?",
      code: "intPtr = new int(99);",
      choices: [
        "Allocates memory for an int and initializes it to 99",
        "Declares an int variable named 99",
        "Copies 99 into an existing int",
        "Deletes intPtr",
      ],
      answer: 0,
      explanation:
        "new int(99) allocates space for one int on the heap and initializes it to 99 in one step.",
    },
    {
      prompt: "Where does memory from the new operator come from?",
      choices: [
        "The stack",
        "A static global array",
        "The operating system's registry",
        "The heap",
      ],
      answer: 3,
      explanation: "new allocates memory from the heap.",
    },
    {
      prompt: "After intPtr = new int; with no initializer, what does intPtr point to?",
      choices: [
        "Always 0",
        "Garbage (an unspecified value)",
        "A compile error occurs",
        "nullptr",
      ],
      answer: 1,
      explanation:
        "Without an initializer, the newly allocated int holds whatever garbage was already in that memory.",
    },
    {
      prompt: "What does the delete operator do?",
      choices: [
        "Declares a new pointer",
        "Sets the pointer to point at 0",
        "Copies the pointed-to value elsewhere",
        "Deallocates memory so it can be reused",
      ],
      answer: 3,
      explanation: "delete frees memory that new allocated, returning it to the heap.",
    },
    {
      prompt: "In this code, what is intPtr2 after delete intPtr1?",
      code: "int *intPtr1, *intPtr2;\nintPtr1 = new int(99);\nintPtr2 = intPtr1;\ndelete intPtr1;",
      choices: [
        "A null pointer",
        "Still safely pointing to 99",
        "A dangling reference, pointing to deallocated memory",
        "A compile error",
      ],
      answer: 2,
      explanation:
        "intPtr2 holds the same address intPtr1 had. Deleting through intPtr1 frees that memory, so intPtr2 is left dangling.",
    },
    {
      prompt: "What is nullptr?",
      choices: [
        "An integer equal to -1",
        "A reserved variable name for arrays",
        "A special constant pointer meaning 'points at nothing'",
        "A function that frees memory",
      ],
      answer: 2,
      explanation:
        "nullptr is a special constant used to initialize or reset pointers; it can be assigned to any pointer type.",
    },
    {
      prompt: "What happens if the new operator fails to find enough memory?",
      choices: [
        "It throws an exception, terminating the program unless handled",
        "It silently returns nullptr",
        "It reduces the requested size automatically",
        "It waits until memory is available",
      ],
      answer: 0,
      explanation:
        "A failed new throws an exception; without an exception handler to catch it, the program terminates.",
    },
    {
      prompt: "Which kind of variable is created with the static keyword and is global to the file?",
      code: "static int x = 5;",
      choices: [
        "A static variable",
        "A dynamic variable",
        "A pointer variable",
        "An automatic variable",
      ],
      answer: 0,
      explanation:
        "static creates a static variable, which is global to the file and keeps its value for the program's run.",
    },
    {
      prompt: "Which line correctly uses auto?",
      choices: [
        "value = auto(2.3);",
        "auto value;",
        "auto int value = 2.3;",
        "auto value = 2.3;",
      ],
      answer: 3,
      explanation:
        "auto variables must be initialized at declaration so the compiler can infer the type from the initializer.",
    },
  ],
  // items (ROADMAP.md A3 pilot migration, 2026-08-01): the new itemSchema.js
  // shape, grounded in sources/cpp/dynamic-alloc.md. `questions` above is
  // untouched and still what QuizView reads; auditBank.js prefers `items`
  // when present, so this is what the audit now validates for this topic.
  //
  // origin: GENERATED — Claude wrote these from the source excerpts below.
  // "Hand-written only" was dropped as a live constraint on this phase per
  // explicit request (see A3's [UPDATED] note) since D2 already settled the
  // broader question: generation is fine as long as it's grounded and
  // verified. verifiedByHuman starts false on every item below — flip it
  // per-item only after checking prompt/expected/criteria against the cited
  // excerpt (and against sources/cpp/dynamic-alloc.md for fuller context).
  // There is no review UI for this yet (that's A7); it's a direct edit here.
  items: [
    makeItem({
      id: "dynamic-alloc-01",
      topicId: "dynamic-alloc",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "What is the difference between what `intPtr = new int;` and `intPtr = new int(99);` leave in memory?",
      expected:
        "`new int;` allocates space for one int but leaves it holding garbage (an unspecified value) — nothing is written into it. `new int(99);` allocates the same space AND initializes it to 99 in one step.",
      criteria: [
        "States that new int; alone leaves the memory as garbage/unspecified",
        "States that new int(99); allocates and initializes in a single step",
        "Doesn't confuse the parenthesized value with an array size",
      ],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#new-operator",
        excerpt:
          "After `intPtr = new int;`, intPtr points to a location holding garbage. After `intPtr = new int(99);`, intPtr points to a location holding 99.",
        citation: "Lecture Deck 02.1",
        page: 6,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-02",
      topicId: "dynamic-alloc",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is a dangling reference, and how does one typically come to exist?",
      expected:
        "A dangling reference is a pointer that still holds the address of memory that is no longer allocated. It typically comes to exist when two pointers hold the same address and the memory is deleted through one of them — the other pointer is left pointing at deallocated memory.",
      criteria: [
        "Defines a dangling reference as pointing to memory that's no longer allocated",
        "Explains it arises from two pointers sharing an address, then deleting through only one",
        "Doesn't claim the pointer becomes nullptr automatically",
      ],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#dangling-reference",
        excerpt:
          "intPtr2 has a dangling reference. Pointing to memory that is no longer allocated.",
        citation: "Lecture Deck 02.1",
        page: 10,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-03",
      topicId: "dynamic-alloc",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace this code:\n\nint *intPtr1, *intPtr2;\nintPtr1 = new int(99);\nintPtr2 = intPtr1;\ndelete intPtr1;\n\nAfter the last line, what does intPtr2 point to, and is reading through it safe?",
      expected:
        "intPtr2 holds the same address intPtr1 held. delete intPtr1; frees that memory but does not change what intPtr1 or intPtr2 point to — both pointer variables still hold the old address. intPtr2 is now a dangling reference; reading through it is not safe.",
      criteria: [
        "States intPtr2 still holds the same address as before (unchanged by delete)",
        "States that memory is now deallocated",
        "Identifies intPtr2 as a dangling reference and reading it as unsafe",
      ],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#dangling-reference",
        excerpt:
          "After `delete intPtr1;`, that location becomes deallocated memory, and intPtr2 still points to it (the dangling reference) — the diagram explicitly shows intPtr2 pointing at the deallocated-memory box, not at nullptr and not at a valid 99.",
        citation: "Lecture Deck 02.1",
        page: 10,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-04",
      topicId: "dynamic-alloc",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace intPtr's state through each line:\n\nint *intPtr;\nintPtr = nullptr;\nintPtr = new int;\n*intPtr = 99;\ndelete intPtr;",
      expected:
        "Line 2: intPtr holds nullptr. Line 3: intPtr points to a newly allocated int holding garbage. Line 4: intPtr points to the same int, now holding 99. Line 5: the memory is deallocated; intPtr still holds that (now-invalid) address — it does not become nullptr on its own.",
      criteria: [
        "Correctly sequences nullptr -> garbage -> 99",
        "States the memory is deallocated after delete",
        "Does not claim delete resets intPtr to nullptr",
      ],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#pointer-diagrams",
        excerpt:
          "After `*intPtr = 99;`, intPtr points to a location holding 99. After `delete intPtr;`, intPtr points to deallocated memory again.",
        citation: "Lecture Deck 02.1",
        page: 9,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-05",
      topicId: "dynamic-alloc",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "What's wrong with this code, if anything?\n\nint *a = new int(5);\nint *b = a;\ndelete a;\ncout << *b;",
      expected:
        "The last line dereferences b after the memory it points to has been freed through a — b is a dangling reference at that point. This is undefined behavior, not a guaranteed print of 5: delete does not null out a or b, so both still hold the old address, but reading through it afterward is unsafe and the actual output is unpredictable.",
      criteria: [
        "Identifies b as dangling after delete a (not merely 'still 5')",
        "States the read is undefined behavior, not a guaranteed value",
        "Explains delete doesn't change what a or b point to",
      ],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#dangling-reference",
        excerpt:
          "intPtr2 has a dangling reference. Pointing to memory that is no longer allocated.",
        citation: "Lecture Deck 02.1",
        page: 10,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-06",
      topicId: "dynamic-alloc",
      format: FORMATS.CLOZE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Memory deleted with the delete operator is returned to the ___, where it becomes available to be allocated again.",
      expected: "heap",
      criteria: ["Answer is exactly 'heap'"],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#delete-operator",
        excerpt:
          "Memory deleted is now available to be allocated again. Returned to the heap.",
        citation: "Lecture Deck 02.1",
        page: 8,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-07",
      topicId: "dynamic-alloc",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "What's the difference between a dynamic variable and an automatic variable, in terms of how each is created and how long each lives?",
      expected:
        "A dynamic variable is created explicitly with the new operator and exists until it is explicitly deleted. An automatic variable is an ordinary local variable, created and destroyed automatically as its scope is entered and exited — no new or delete involved.",
      criteria: [
        "States dynamic variables require explicit new (and implicitly, delete)",
        "States automatic variables are the ordinary local variables with automatic scope-based lifetime",
        "Contrasts explicit lifetime management vs. automatic lifetime",
      ],
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#static-dynamic-automatic",
        excerpt:
          "- Dynamic Variables are created using the new operator\n- Static variables are created using the static keyword\n```\nstatic int x = 5;\n```\n- Static variables are global to the file\n- Automatic variables are the ordinary variables we've been using",
        citation: "Lecture Deck 02.1",
        page: 13,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-08",
      topicId: "dynamic-alloc",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Write the lines of code that declare an int pointer, allocate space for a single int initialized to 42 in one step, and then free it.",
      expected: "int *p;\np = new int(42);\ndelete p;",
      criteria: [
        "Declares a pointer (not a plain int)",
        "Uses new int(42) to allocate and initialize in one step (not new int[42])",
        "Calls delete (not delete[]) on that same pointer",
      ],
      timeBudgetSec: 90,
      provenance: {
        sourceId: "cpp-slides-02.1-dynamic-alloc",
        anchor: "#new-operator",
        excerpt:
          "- To allocate memory use the new operator.\n```\nint *intPtr;\nintPtr = new int;\nintPtr = new int(99); //Allocate and initialize\n```",
        citation: "Lecture Deck 02.1",
        page: 6,
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-alloc.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-mcq-01",
      topicId: "dynamic-alloc",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Which operator returns the memory address of a variable?",
      choices: [
        "::",
        "->",
        "&",
        "*",
      ],
      answerIndex: 2,
      expected: "&",
      criteria: [
        "The address-of operator, &, returns a variable's memory address, as in &x.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-mcq-02",
      topicId: "dynamic-alloc",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Given this declaration, which variable is a pointer?\n```\ndouble *dblPtr, value;\n```",
      choices: [
        "Both dblPtr and value",
        "Only dblPtr",
        "Neither",
        "Only value",
      ],
      answerIndex: 1,
      expected: "Only dblPtr",
      criteria: [
        "The * binds to the name it precedes, so only dblPtr is a pointer; value is an ordinary double.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-mcq-03",
      topicId: "dynamic-alloc",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What does *dblPtr do in this code?\n```\nvalue = 34.5;\ndblPtr = &value;\n*dblPtr = 12.3;\n```",
      choices: [
        "Dereferences dblPtr to access/change the memory value refers to",
        "Deletes the pointer",
        "Declares a new pointer",
        "Compares dblPtr to value",
      ],
      answerIndex: 0,
      expected: "Dereferences dblPtr to access/change the memory value refers to",
      criteria: [
        "*dblPtr dereferences the pointer, reaching into the memory it points to (the same memory as value).",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-mcq-04",
      topicId: "dynamic-alloc",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What does this statement do?\n```\nintPtr = new int(99);\n```",
      choices: [
        "Allocates memory for an int and initializes it to 99",
        "Declares an int variable named 99",
        "Copies 99 into an existing int",
        "Deletes intPtr",
      ],
      answerIndex: 0,
      expected: "Allocates memory for an int and initializes it to 99",
      criteria: [
        "new int(99) allocates space for one int on the heap and initializes it to 99 in one step.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-alloc-mcq-05",
      topicId: "dynamic-alloc",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Where does memory from the new operator come from?",
      choices: [
        "The stack",
        "A static global array",
        "The operating system's registry",
        "The heap",
      ],
      answerIndex: 3,
      expected: "The heap",
      criteria: [
        "new allocates memory from the heap.",
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
