// ─────────────────── c++ · 06.2 Recursion ───────────────────
// Text is original; the code snippets are the deck's own.
import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "recursion",
  title: "Recursion",
  subtitle: "c++ — base cases, activation records, factorial & Fibonacci",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0): default — not covered by the diagnostic quiz
  // or the self-reported struggle list, and not "known easy."
  examWeight: 1.0,
  cards: [
    {
      heading: "Thinking recursively",
      body:
        "Recursion is a technique that lets you break a **complex problem into simpler ones**. To use it you sometimes have to think recursively, which the deck introduces with a question: can you define an **ancestor**? The answer the deck gives is that an ancestor is a **parent** or one of their (parent's) **ancestors** — a definition that uses the very word it is defining.",
    },
    {
      heading: "Recursive definition",
      body:
        "A recursive definition is one that defines something **in terms of itself**. It has a requirement: there must be a **base case** — the part of the definition that is **not recursive** and can be determined outright. In the ancestor definition, **parent** is the base case, and \"their ancestors\" is the **recursive part** of the definition.",
    },
    {
      heading: "Recursive functions",
      body:
        "A recursive function is a function that **calls itself**. In the deck's sketch, void abc(int x) does some work and then calls **abc(y)** from inside its own body. Before going further into recursive functions the deck stops to cover **activation records**, because they are what makes a self-call work at all.",
      code: "void abc(int x){\n    ….\n    ….\n    abc(y);\n}",
    },
    {
      heading: "Activation records and the run-time stack",
      body:
        "Every time a function is called, an **Activation Record** (AR) is placed on top of the **run-time stack**. Recall that a stack is **LIFO** — Last In First Out. The AR is **popped off** the stack when the function is done, meaning fully executed. If main calls function1, function1 calls function2, and function2 calls function3, there will be **3** AR's stacked above main's.",
    },
    {
      heading: "Factorial, spelled out",
      body:
        "The factorial definition the deck starts from is 0! = 1, 1! = 1, 2! = 2 * 1, 3! = 3 * 2 * 1, 4! = 4 * 3 * 2 * 1, and in general n! = n * (n-1) * (n-2) ….. * 1. Rewriting those lines shows the **self-similarity**: 4! = 4 * 3!, 3! = 3 * 2!, 2! = 2 * 1!, and 1! = 1 * 0!, with **0! = 1** as the **special case**.",
    },
    {
      heading: "Base case and recursive rule",
      body:
        "Those two lines are the whole recursive definition of factorial. The line 0! = 1 is called the **Base Case**. The line n! = n * (n-1)! is called the **Recursive Rule**. Every recursive function needs both: the rule shrinks the problem, and the base case is what finally **stops** it.",
    },
    {
      heading: "Factorial, iterative and recursive",
      body:
        "The iterative version carries a running **multiplier** initialized to 1 and a loop that counts i down from n while i is greater than 0. The recursive version has no loop at all: it tests **n == 0** and returns **1** for the base case, and otherwise returns n * factorial(n - 1) — the recursive rule transcribed almost character for character.",
      code:
        "double factorial(int n){ //Iterative\n    double muliplier = 1;\n    for (size_t i = n; i > 0; i--)\n    {\n        multiplier *= i;\n    }\n    return multiplier;\n}\n\ndouble factorial(int n){ //Recursive\n    if (n == 0) //Base case\n    {\n        return 1;\n    }\n    return  n * factorial(n - 1);\n}",
    },
    {
      heading: "Designing recursive functions",
      body:
        "The deck gives a two-step recipe. First, determine the **base case(s)** — the cases where you know the answer **without recursion**. Second, determine the **rule**, where the problem is **reduced repeatedly** by recursively calling the function until the base cases are encountered. In factorial, n is reduced until it reaches **0**, and then you **backtrack** and substitute the answers back up.",
    },
    {
      heading: "Printing an array backward",
      body:
        "Iteratively you walk i down from numItems - 1 while i is at least 0. Recursively the **base case is to do nothing** when numItems is less than or equal to 0, so the whole body sits inside if (**numItems > 0**). It prints **numbers[numItems-1]**, the last item, then calls itself with **numItems - 1** to handle the rest.",
      code:
        "void revPrint(int numbers[], size_t numItems){ //Iterative\n    for (int i = numItems - 1; i >= 0; i--)\n    {\n        cout << setw(4) << numbers[i];\n    }\n}\n\nvoid revPrintRec(int numbers[], size_t numItems){ //Recursive\n    //base case do nothing when numItems is <= 0\n    if (numItems > 0)\n    {\n        cout << setw(4) << numbers[numItems-1];\n        revPrintRec(numbers, numItems - 1);\n    }\n}",
    },
    {
      heading: "Printing a linked list forward",
      body:
        "The same pattern moves to a linked list, where the base case is to do nothing when **head == nullptr**. The iterative version loops while head is not nullptr, printing head->num and advancing head to **head->next**. The recursive version prints **head->num** first and then calls printListRec(**head->next**) to print the rest of the list.",
      code:
        "void printList(Node* head){ //Iterative\n    //base case: do nothing when head == nullptr\n    while (head != nullptr)\n    {   //print the first node data\n        cout << setw(4) << head->num;\n\n        //print the rest of the list\n        head = head->next;\n    }\n}\n\nvoid printListRec(Node* head){ //Recursive\n    if (head != nullptr)\n    {\n        cout << setw(4) << head->num;\n        printListRec(head->next);\n    }\n}",
    },
    {
      heading: "Printing the list backward",
      body:
        "Printing the list in reverse needs no second pointer, no extra pass, and no reversal of the list — only a **swap of the two statements**. Put the **recursive call first** and the cout **after** it, and every node's own value prints on the way **back up** the stack, so the **deepest** node prints first. That is the one line of difference between forward and backward.",
      code:
        "void printListRec(Node* head){\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}",
    },
    {
      heading: "What recursion costs",
      body:
        "Recursion leads to a **simpler solution** and **fewer lines of code**, but recursive functions **may perform poorly**. They use **more memory** than iterative functions, because each call requires a **separate AR** on the run-time stack. Some of that cost can be reclaimed by **tail recursion optimization**.",
    },
    {
      heading: "Fibonacci",
      body:
        "The Fibonacci sequence is 1, 1, 2, 3, 5, 8, 13, 21, …: the first two numbers are **1 and 1**, and every number after that is the **sum of the previous two**. The recursive version encodes that directly — its base cases are **n == 1 || n == 2** returning 1, and otherwise it returns fibRec(n - 1) + fibRec(n - 2). Note it has **two** base cases and **two** recursive calls.",
      code:
        "double fibRec(int n){\n    if (n == 1 || n == 2) //base cases\n    {\n        return 1;\n    }\n    return fibRec(n - 1) + fibRec(n - 2);\n}",
    },
    {
      heading: "Why naive Fibonacci is slow",
      body:
        "Draw the call tree for fib(6) and the problem shows up immediately: the **same values**, fib(2) for example, are computed **over and over**. That happens because each recursive call generates **2 more calls**, so the number of calls grows with the **depth** of the tree rather than with n. This is the deck's example of a recursive function that is simple to write and expensive to run.",
    },
  ],
  questions: [
    {
      prompt: "What makes a definition a recursive definition?",
      choices: [
        "It defines something in terms of itself, plus a non-recursive base case",
        "It defines something using only loops",
        "It defines something in terms of a different and strictly simpler concept entirely",
        "It defines something without any special cases",
      ],
      answer: 0,
      explanation:
        "A recursive definition names itself in its own body, and it needs a non-recursive base case that can be determined or the definition never bottoms out.",
    },
    {
      prompt: "In the definition \"an ancestor is a parent or one of their (parent's) ancestors,\" which part is the base case?",
      choices: [
        "\"one of their ancestors\"",
        "The whole definition is the base case",
        "\"a parent\"",
        "There is no base case in this definition",
      ],
      answer: 2,
      explanation:
        "\"A parent\" is the part you can determine without applying the definition again, which is exactly what a base case is.",
    },
    {
      prompt: "What happens on the run-time stack every time a function is called?",
      choices: [
        "The stack is cleared and rebuilt",
        "An Activation Record is pushed, then popped when the call finishes",
        "The function's code is copied onto the stack",
        "An Activation Record is placed at the bottom of the stack, under the earlier calls",
      ],
      answer: 1,
      explanation:
        "The run-time stack is LIFO, so each call pushes an Activation Record on top and that record is popped when the call finishes.",
    },
    {
      prompt: "main calls function1, function1 calls function2, and function2 calls function3. How many activation records sit above main's on the run-time stack?",
      choices: ["1", "4", "0", "3"],
      answer: 3,
      explanation:
        "Each of the three nested calls pushed its own AR, so function1's, function2's, and function3's records are stacked above main's.",
    },
    {
      prompt: "Which pair is the base case and the recursive rule for factorial?",
      choices: [
        "Base case 1! = 1; recursive rule n! = (n-1)! * (n-2)!",
        "Base case n! = n * (n-1)!; recursive rule 0! = 1",
        "Base case 0! = 1; recursive rule n! = n * (n-1)!",
        "Base case n = 1; recursive rule n! = n * n!",
      ],
      answer: 2,
      explanation:
        "0! = 1 is the value you know outright, and n! = n * (n-1)! is the rule that reduces the problem toward it.",
    },
    {
      prompt: "In this recursive factorial, what stops the recursion?",
      code:
        "double factorial(int n){\n    if (n == 0) //Base case\n    {\n        return 1;\n    }\n    return  n * factorial(n - 1);\n}",
      choices: [
        "The n == 0 test",
        "The return statement at the end of the function",
        "The runtime notices the repeated call and stops it before the stack fills",
        "The multiplication by n eventually reaches zero",
      ],
      answer: 0,
      explanation:
        "The base case is the only path out of the function that does not make another call, so it is what ends the chain.",
    },
    {
      prompt: "What are the two steps in the deck's recipe for designing a recursive function?",
      choices: [
        "Write the loop version first, then convert it mechanically into a recursive one",
        "Find the base case(s), then the rule that reduces toward one",
        "Determine the running time, then determine the memory used",
        "Determine the recursive call, then add a loop as a safety net",
      ],
      answer: 1,
      explanation:
        "Base cases are the cases whose answer is known without recursion; the rule is what repeatedly reduces the problem toward them.",
    },
    {
      prompt: "What is the base case of this function, and how is it expressed?",
      code:
        "void revPrintRec(int numbers[], size_t numItems){\n    //base case do nothing when numItems is <= 0\n    if (numItems > 0)\n    {\n        cout << setw(4) << numbers[numItems-1];\n        revPrintRec(numbers, numItems - 1);\n    }\n}",
      choices: [
        "numItems == 1, handled by printing numbers[0]",
        "There is no base case — the function simply relies on reaching the array's end",
        "numItems <= 0, handled by doing nothing",
        "numItems > 0, handled by the body of the if",
      ],
      answer: 2,
      explanation:
        "Guarding the whole body with if (numItems > 0) means the numItems <= 0 case falls straight through and returns, which is the \"do nothing\" base case.",
    },
    {
      prompt: "Given numbers = {10, 20, 30} and numItems = 3, what does revPrintRec print?",
      code:
        "void revPrintRec(int numbers[], size_t numItems){\n    if (numItems > 0)\n    {\n        cout << setw(4) << numbers[numItems-1];\n        revPrintRec(numbers, numItems - 1);\n    }\n}",
      choices: [
        "30 20 10",
        "10 20 30",
        "30 only",
        "10 only",
      ],
      answer: 0,
      explanation:
        "Each call prints the last remaining element before recursing on a shorter prefix, so the array comes out back to front.",
    },
    {
      prompt: "These two functions differ only in the order of two statements. What does the second one print?",
      code:
        "void printListRec(Node* head){        // A\n    if (head != nullptr)\n    {\n        cout << setw(4) << head->num;\n        printListRec(head->next);\n    }\n}\n\nvoid printListRec(Node* head){        // B\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}",
      choices: [
        "The same order as A, because statement order inside the if makes no difference",
        "Nothing; B never reaches its cout",
        "Only the last node's value",
        "The list backward",
      ],
      answer: 3,
      explanation:
        "Putting the recursive call first drives all the way to the end of the list before any printing happens, so values print as the calls unwind.",
    },
    {
      prompt: "Why do recursive functions use more memory than their iterative equivalents?",
      choices: [
        "They copy the entire data structure again on every single call",
        "Each call needs its own activation record",
        "They allocate their local variables on the heap",
        "The compiler disables optimization for recursive functions",
      ],
      answer: 1,
      explanation:
        "An iterative loop reuses one activation record, while each level of recursion pushes its own record that stays until that call returns.",
    },
    {
      prompt: "What are the base cases of this recursive Fibonacci, and how many recursive calls does the non-base path make?",
      code:
        "double fibRec(int n){\n    if (n == 1 || n == 2) //base cases\n    {\n        return 1;\n    }\n    return fibRec(n - 1) + fibRec(n - 2);\n}",
      choices: [
        "Base case n == 0 only; one recursive call",
        "Base cases n == 1 and n == 2; one recursive call",
        "Base cases n == 1 and n == 2; two recursive calls",
        "Base case n == 2 only; two recursive calls",
      ],
      answer: 2,
      explanation:
        "The guard tests n == 1 || n == 2, so there are two base cases, and the return line calls fibRec twice — once with n - 1 and once with n - 2.",
    },
    {
      prompt: "Looking at the call tree for fib(6), what is the problem with the naive recursive Fibonacci?",
      choices: [
        "It recomputes the same values repeatedly, each call spawning two more",
        "It never reaches a base case for even values of n",
        "It uses no activation records at all, so intermediate results are lost between calls",
        "It returns the wrong value for large n",
      ],
      answer: 0,
      explanation:
        "The two recursive calls per level overlap heavily, so identical subproblems are recomputed instead of reused.",
    },
    {
      prompt: "Which claim about recursion does the deck make?",
      choices: [
        "Recursion is always faster than iteration",
        "Simpler code, but it may perform poorly",
        "Recursion uses less memory than iteration",
        "Any recursive function can be rewritten without needing a base case at all",
      ],
      answer: 1,
      explanation:
        "The deck lists simplicity and shorter code as the benefits, and poor performance plus higher memory use as the cost.",
    },
  ],
  flashcards: [
    {
      front: "Recursive definition",
      back: "Defining something in terms of itself. Requires a base case — the part of the definition that is not recursive and can be determined.",
    },
    {
      front: "Ancestor (the deck's example)",
      back: "An ancestor is a parent or one of their (parent's) ancestors. \"A parent\" is the base case; \"their ancestors\" is the recursive part.",
    },
    {
      front: "Recursive function",
      back: "A function that calls itself.",
    },
    {
      front: "Activation Record (AR)",
      back: "The record placed on top of the run-time stack every time a function is called, and popped off when that function has fully executed.",
    },
    {
      front: "Run-time stack",
      back: "A LIFO (Last In First Out) stack of activation records. main calls function1 calls function2 calls function3 leaves 3 AR's above main's.",
    },
    {
      front: "Factorial base case",
      back: "0! = 1.",
    },
    {
      front: "Factorial recursive rule",
      back: "n! = n * (n-1)!",
    },
    {
      front: "Designing a recursive function — the two steps",
      back: "1. Determine the base case(s): cases where the answer is known without recursion. 2. Determine the rule that reduces the problem repeatedly until a base case is encountered.",
    },
    {
      front: "Base case for printing an array backward",
      back: "Do nothing when numItems <= 0 — the body sits inside if (numItems > 0), so the function just returns.",
    },
    {
      front: "Base case for printing a linked list",
      back: "Do nothing when head == nullptr.",
    },
    {
      front: "Forward vs backward list printing, recursively",
      back: "Forward: cout << head->num; then printListRec(head->next). Backward: printListRec(head->next); then cout << head->num.",
    },
    {
      front: "Cost of recursion",
      back: "Simpler solution and fewer lines of code, but it may perform poorly and uses more memory than iteration — each call requires a separate AR. Tail recursion optimization can help.",
    },
    {
      front: "Fibonacci sequence",
      back: "1, 1, 2, 3, 5, 8, 13, 21, … The first two numbers are 1 and 1; every number after that is the sum of the previous two.",
    },
    {
      front: "fibRec base cases",
      back: "n == 1 || n == 2 return 1; otherwise return fibRec(n - 1) + fibRec(n - 2).",
    },
    {
      front: "Why the fib call tree is wasteful",
      back: "The same values, for example fib(2), are computed over and over, and each recursive call generates 2 more calls.",
    },
  ],
  items: [
    makeItem({
      id: "recursion-01",
      topicId: "recursion",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is a recursive definition, and what does every recursive definition require?",
      expected:
        "A recursive definition defines something in terms of itself. Requirement: a base case — the part of the definition that is not recursive and can be determined. In the ancestor definition (\"an ancestor is a parent or one of their (parent's) ancestors\"), parent is the base case and \"their ancestors\" is the recursive part of the definition.",
      criteria: [
        "States that a recursive definition defines something in terms of itself",
        "States the requirement of a base case — the non-recursive part that can be determined",
        "Identifies parent as the base case of the ancestor definition",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#recursive-definition",
        excerpt:
          "Defining something in terms of itself\n- Requirement: Base case (the part of the definition that is not recursive) and can be determined\n- Ancestor definition\n  - An ancestor is a parent or one of their (parent's) ancestors\n  - Parent is the base case\n  - Their ancestors (recursive part of the definition)",
        citation: "Lecture Deck 06.2",
        page: 5,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-02",
      topicId: "recursion",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is an Activation Record, when is it pushed, and when is it popped?",
      expected:
        "Every time a function is called, an Activation Record (AR) is placed on top of the run-time stack. The run-time stack is a LIFO (Last In First Out) structure. The AR is popped off the stack when the function is done — fully executed. If main calls function1, function1 calls function2, and function2 calls function3, there will be 3 AR's on top of the stack above main's.",
      criteria: [
        "States an AR is pushed on top of the run-time stack on every function call",
        "States the stack is LIFO (Last In First Out)",
        "States the AR is popped when the function is done / fully executed",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#activation-records",
        excerpt:
          "Every time a function is called, an Activation Record (AR) is placed on top of the run-time stack\n- Recall a stack is a LIFO (Last In First Out)\n- The AR is popped off the stack when the function is done (fully executed)\n- For example, if main calls function1 calls function 2 and function 2 calls function 3 We will have 3 AR's on top of the stack",
        citation: "Lecture Deck 06.2",
        page: 7,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-03",
      topicId: "recursion",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "State the two steps for designing a recursive function.",
      expected:
        "1. Determine the base case(s) — cases where we know the answer without recursion. 2. Determine the rule, where the problem is reduced repeatedly by recursively calling the function until the base cases are encountered. In the factorial definition, the factorial of n is reduced until it reaches 0 (base case); we then backtrack and substitute the answers.",
      criteria: [
        "Step 1: determine the base case(s), where the answer is known without recursion",
        "Step 2: determine the rule that reduces the problem repeatedly until a base case is encountered",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#designing-recursive-functions",
        excerpt:
          "1. Determine the base case(s). Cases where we know the answer without recursion\n2. Determine the rule. Where the problem is reduced repeatedly by recursively calling the function until the base cases are encountered\nIn the factorial definition, the factorial of n is reduced until it reaches 0 (base case)\nWe then backtrack and substitute the answers",
        citation: "Lecture Deck 06.2",
        page: 13,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-04",
      topicId: "recursion",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write the recursive factorial function, `double factorial(int n)`, with its base case marked.",
      expected:
        "double factorial(int n){\n    if (n == 0) //Base case\n    {\n        return 1;\n    }\n    return  n * factorial(n - 1);\n}",
      criteria: [
        "Tests n == 0 and returns 1 as the base case",
        "Returns n * factorial(n - 1) for the recursive rule",
      ],
      timeBudgetSec: 90,
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#factorial-recursive",
        excerpt:
          "double factorial(int n){\n    if (n == 0) //Base case\n    {\n        return 1;\n    }\n    return  n * factorial(n - 1);\n}",
        citation: "Lecture Deck 06.2",
        page: 12,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-05",
      topicId: "recursion",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write `void revPrintRec(int numbers[], size_t numItems)`, which prints a partially-filled array backward using recursion and no loop.",
      expected:
        "void revPrintRec(int numbers[], size_t numItems){\n    //base case do nothing when numItems is <= 0\n    if (numItems > 0)\n    {\n        cout << setw(4) << numbers[numItems-1];\n        revPrintRec(numbers, numItems - 1);\n    }\n}",
      criteria: [
        "Base case does nothing when numItems <= 0 — the body is guarded by if (numItems > 0)",
        "Prints numbers[numItems-1] before recursing",
        "Recurses with numItems - 1",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#rev-print-recursive",
        excerpt:
          "void revPrintRec(int numbers[], size_t numItems){\n    //base case do nothing when numItems is <= 0\n    if (numItems > 0)\n    {\n        cout << setw(4) << numbers[numItems-1];\n        revPrintRec(numbers, numItems - 1);\n    }\n}",
        citation: "Lecture Deck 06.2",
        page: 15,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-06",
      topicId: "recursion",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write `void printListRec(Node* head)` twice: once so it prints the linked list forward, and once so it prints it backward.",
      expected:
        "Forward:\nvoid printListRec(Node* head){\n    if (head != nullptr)\n    {\n        cout << setw(4) << head->num;\n        printListRec(head->next);\n    }\n}\n\nBackward:\nvoid printListRec(Node* head){\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}",
      criteria: [
        "Both versions guard the body with if (head != nullptr) as the base case",
        "Forward prints head->num before the recursive call on head->next",
        "Backward makes the recursive call on head->next before printing head->num",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#print-list-backward-recursive",
        excerpt:
          "void printListRec(Node* head){\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}",
        citation: "Lecture Deck 06.2",
        page: 18,
      },
      // The item asks for both directions, so it covers the forward slide too.
      extraAtoms: ["#print-list-forward-recursive"],
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-07",
      topicId: "recursion",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Trace `factorial(4)`. List the chain of calls down to the base case and the value each one returns on the way back up.\n```\ndouble factorial(int n){\n    if (n == 0) //Base case\n    {\n        return 1;\n    }\n    return  n * factorial(n - 1);\n}\n```",
      expected:
        "Calls down: factorial(4) → factorial(3) → factorial(2) → factorial(1) → factorial(0).\nReturns back up: factorial(0) returns 1 (base case); factorial(1) returns 1 * 1 = 1; factorial(2) returns 2 * 1 = 2; factorial(3) returns 3 * 2 = 6; factorial(4) returns 4 * 6 = 24.",
      criteria: [
        "Shows the calls reducing n by 1 down to factorial(0)",
        "States factorial(0) returns 1 from the base case",
        "Final answer is 24",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#factorial-base-and-rule",
        excerpt:
          "4! = 4 * 3 * 2 * 1 = 4 * 3!\n3! = 3 * 2 * 1 = 3 * 2!\n2! = 2 * 1 = 2 * 1!\n1! = 1 = 1 * 0!\n0! = 1 (special case)\nIn general\n0! – 1 This is called the Base Case\nn! = n * (n-1)! This is called the Recursive Rule",
        citation: "Lecture Deck 06.2",
        page: 10,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-08",
      topicId: "recursion",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "A list holds 3, 7, 9 in that order, head pointing at 3. What does this print, and why?\n```\nvoid printListRec(Node* head){\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}\n```",
      expected:
        "It prints 9 7 3 — the list backward. Because the recursive call comes before the cout, each call drives all the way to head == nullptr before anything is printed; the printing then happens as the activation records pop, so the last node prints first and the head node prints last.",
      criteria: [
        "Output is 9 7 3 (the list in reverse)",
        "Explains that the recursive call runs before the cout, so printing happens as the calls return/unwind",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#print-list-backward-recursive",
        excerpt:
          "void printListRec(Node* head){\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}",
        citation: "Lecture Deck 06.2",
        page: 18,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-09",
      topicId: "recursion",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "This is meant to be the deck's recursive factorial. What is wrong with it, and which requirement of a recursive definition does it violate?\n```\ndouble factorial(int n){\n    return  n * factorial(n - 1);\n}\n```",
      expected:
        "The base case is missing. A recursive definition requires a base case — the part of the definition that is not recursive and can be determined — and here nothing ever stops the reduction, so factorial keeps calling itself with smaller and smaller n. Since every call places an activation record on the run-time stack and none of them ever finish, the stack keeps growing instead of unwinding. The fix is the deck's guard: if (n == 0) return 1; before the recursive return.",
      criteria: [
        "Identifies the missing base case",
        "Names the base case requirement — the non-recursive part that can be determined — as what is violated",
        "States the fix: if (n == 0) return 1;",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#factorial-recursive",
        excerpt:
          "double factorial(int n){\n    if (n == 0) //Base case\n    {\n        return 1;\n    }\n    return  n * factorial(n - 1);\n}",
        citation: "Lecture Deck 06.2",
        page: 12,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-10",
      topicId: "recursion",
      format: FORMATS.CLOZE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Fill in the two blanks in the recursive Fibonacci:\n```\ndouble fibRec(int n){\n    if (____________) //base cases\n    {\n        return 1;\n    }\n    return ____________;\n}\n```",
      expected: "n == 1 || n == 2 ; and fibRec(n - 1) + fibRec(n - 2)",
      criteria: [
        "First blank is n == 1 || n == 2 (both base cases)",
        "Second blank is fibRec(n - 1) + fibRec(n - 2)",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#fibonacci-recursive",
        excerpt:
          "double fibRec(int n){\n    if (n == 1 || n == 2) //base cases\n    {\n        return 1;\n    }\n    return fibRec(n - 1) + fibRec(n - 2);\n}",
        citation: "Lecture Deck 06.2",
        page: 22,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-11",
      topicId: "recursion",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Compare the recursive and iterative versions of the same algorithm: what does recursion buy, and what does it cost?",
      expected:
        "Recursion leads to a simpler solution and fewer lines of code — revPrintRec and printListRec replace their loops with a single guarded self-call. The cost: recursive functions may perform poorly, and they use more memory than iterative functions, because each call requires a separate activation record on the run-time stack, where a loop reuses one. Tail recursion optimization can reclaim some of that.",
      criteria: [
        "Benefit: simpler solution and fewer lines of code",
        "Cost: may perform poorly and uses more memory, because each call requires a separate AR",
        "Mentions tail recursion optimization",
      ],
      extraAtoms: ["#rev-print-iterative", "#print-list-iterative"],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#recursion-efficiency",
        excerpt:
          "Recursion leads to simpler solution and fewer lines of code\n- They may perform poorly\n- Use more memory than iterative functions\n- Each call requires a separate AR\n- Tail recursion optimization\n- What is the running time of each of the algorithms discussed so far?",
        citation: "Lecture Deck 06.2",
        page: 19,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-12",
      topicId: "recursion",
      format: FORMATS.COMPLEXITY,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "From the fib(6) call tree, explain why the naive recursive Fibonacci behaves so differently from recursive factorial. Justify your answer with the branching structure.",
      expected:
        "Recursive factorial makes one recursive call per level and reduces n by 1 each time, so it produces a single chain of n calls. fibRec makes two calls per level — each recursive call generates 2 more calls — so the calls form a branching tree rather than a chain, and the same values (fib(2), for example) are computed over and over across different branches. That repeated recomputation, not the arithmetic, is what makes the naive version expensive.",
      criteria: [
        "States factorial makes one recursive call per level (a chain) while fibRec makes two (a branching tree)",
        "States each recursive call generates 2 more calls",
        "Identifies repeated recomputation of the same values, e.g. fib(2), as the cost",
      ],
      provenance: {
        sourceId: "cpp-slides-06.2-recursion",
        anchor: "#fibonacci-call-tree",
        excerpt:
          "Notice that the same values, for example, fib(2), are computed over and over, and each recursive call generates 2 more calls",
        citation: "Lecture Deck 06.2",
        page: 23,
      },
      generationMeta: {
        model: "claude-opus-5",
        generatedAt: "2026-08-09",
        promptedFrom: "sources/cpp/recursion.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-mcq-01",
      topicId: "recursion",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In the definition \"an ancestor is a parent or one of their (parent's) ancestors,\" which part is the base case?",
      choices: [
        "\"one of their ancestors\"",
        "The whole definition is the base case",
        "\"a parent\"",
        "There is no base case in this definition",
      ],
      answerIndex: 2,
      expected: "\"a parent\"",
      criteria: [
        "\"A parent\" is the part you can determine without applying the definition again, which is exactly what a base case is.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-mcq-02",
      topicId: "recursion",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "main calls function1, function1 calls function2, and function2 calls function3. How many activation records sit above main's on the run-time stack?",
      choices: ["1", "4", "0", "3"],
      answerIndex: 3,
      expected: "3",
      criteria: [
        "Each of the three nested calls pushed its own AR, so function1's, function2's, and function3's records are stacked above main's.",
      ],
      provenance: null,
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-mcq-03",
      topicId: "recursion",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "These two functions differ only in the order of two statements. What does the second one print?\n```\nvoid printListRec(Node* head){        // A\n    if (head != nullptr)\n    {\n        cout << setw(4) << head->num;\n        printListRec(head->next);\n    }\n}\n\nvoid printListRec(Node* head){        // B\n    if (head != nullptr)\n    {\n        printListRec(head->next);\n        cout << setw(4) << head->num;\n    }\n}\n```",
      choices: [
        "The same order as A, because statement order inside the if makes no difference",
        "Nothing; B never reaches its cout",
        "Only the last node's value",
        "The list backward",
      ],
      answerIndex: 3,
      expected: "The list backward",
      criteria: [
        "Putting the recursive call first drives all the way to the end of the list before any printing happens, so values print as the calls unwind.",
      ],
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "recursion-mcq-04",
      topicId: "recursion",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Why do recursive functions use more memory than their iterative equivalents?",
      choices: [
        "They copy the entire data structure again on every single call",
        "Each call needs its own activation record",
        "They allocate their local variables on the heap",
        "The compiler disables optimization for recursive functions",
      ],
      answerIndex: 1,
      expected: "Each call needs its own activation record",
      criteria: [
        "An iterative loop reuses one activation record, while each level of recursion pushes its own record that stays until that call returns.",
      ],
      provenance: null,
      difficulty: 1,
      verifiedByHuman: true,
    }),
  ],
};
