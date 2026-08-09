import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "linked-lists",
  title: "Linked Lists",
  subtitle: "Nodes, pointers & the Node class",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): provisional, see dynamic-alloc.js
  // for the methodology note. Self-reported struggle area; not yet confirmed
  // by a diagnostic question.
  examWeight: 1.5,
  cards: [
    {
      heading: "Why not just use an array?",
      body:
        "Inserting into a **sorted array/vector** or at its **beginning** means shifting every element after it over — that's **O(n)**. Deleting from the **middle** has the same cost. A linked list can do these operations in **O(1)** once you already have a pointer to the right spot, because nothing needs to shift.",
    },
    {
      heading: "What a linked list is",
      body:
        "A linked list is a sequence of objects called **nodes**, where each node points to the **next** node in the list. Each node stores its own **data** plus a pointer to the next node. A separate pointer, usually named **head**, marks the beginning of the list, and the **last node's next pointer is nullptr**.",
    },
    {
      heading: "The Node class",
      body:
        "A node bundles data with a pointer: `class Node { private: <type> data; Node *next; };`. The **data** field can be any type, and **next** points to the following node (or nullptr if this is the last one).",
    },
    {
      heading: "Node constructor",
      body:
        "A typical constructor gives both fields defaults: `Node(const DataType newData = DataType(), Node *newNext = nullptr) { data = newData; next = newNext; }`. Calling `new Node()` with no arguments creates a node with default data and a **nullptr** next pointer.",
    },
    {
      heading: "Getters and setters",
      body:
        "setData and setNext **change** a node's fields. getData returns the stored value. getNext has **two overloads** — a const version returning `const Node*` and a non-const version returning `Node*` — so callers get the right access level depending on whether their own node is const.",
    },
    {
      heading: "Declaring an empty list",
      body:
        "A list starts as just a pointer: `Node *head; head = nullptr;`. An **empty list** is represented entirely by head being nullptr — there are no nodes yet. Some list implementations also keep a **tail** pointer to the last node for faster end-of-list access.",
    },
    {
      heading: "Allocating and linking nodes",
      body:
        "`head = new Node();` allocates one node on the heap and points head at it. `head->setData(50);` fills in its value. As more nodes are created and their **next** pointers are chained together, the list grows: head → 50 → 30 → 60 → 90 → nullptr.",
    },
  ],
  questions: [
    {
      prompt:
        "What is the running time for inserting an element at the beginning of an array/vector?",
      choices: [
        "O(n)",
        "O(1)",
        "O(log n)",
        "O(n²)",
      ],
      answer: 0,
      explanation:
        "Every existing element must shift over by one position to make room, so the cost scales with the array's size → O(n).",
    },
    {
      prompt: "What does a linked list's last node's next pointer point to?",
      choices: [
        "The first node inserted",
        "nullptr",
        "The head node",
        "Itself",
      ],
      answer: 1,
      explanation:
        "The last node's next pointer is nullptr, which is how algorithms know they've reached the end of the list.",
    },
    {
      prompt: "In a singly linked Node class, what does the next member store?",
      code: "class Node {\nprivate:\n    DataType data;\n    Node *next;\n};",
      choices: [
        "The index of the following node",
        "A pointer to the head of the list",
        "A pointer to the following node in the list (or nullptr if last)",
        "A copy of the following node's data",
      ],
      answer: 2,
      explanation:
        "next holds the address of the next node, letting code walk the list one link at a time; it's nullptr on the last node.",
    },
    {
      prompt: "What does this code produce?",
      code: "Node *head;\nhead = nullptr;",
      choices: [
        "A compiler error",
        "A list with one node containing garbage data",
        "An empty list",
        "A list with one node whose data is 0",
      ],
      answer: 2,
      explanation:
        "Setting head to nullptr with no nodes allocated is exactly how an empty linked list is represented.",
    },
    {
      prompt: "Why does Node provide two getNext() overloads?",
      code: "const Node* getNext() const { return next; }\nNode* getNext() { return next; }",
      choices: [
        "One overload is for the head node, the other for all other nodes",
        "So a const Node gets a const Node* back, and a non-const Node gets a modifiable Node*",
        "C++ requires two overloads for every getter",
        "So getNext can be called with or without parentheses",
      ],
      answer: 1,
      explanation:
        "Overloading on const-ness lets the compiler pick the appropriate return type depending on whether the calling object is const.",
    },
    {
      prompt: "After `head = new Node(); head->setData(50);`, what does head->getNext() return?",
      choices: [
        "nullptr",
        "50",
        "Undefined/garbage",
        "A pointer to head itself",
      ],
      answer: 0,
      explanation:
        "The default constructor initializes next to nullptr, and setData only touches the data field, so getNext() still returns nullptr.",
    },
    {
      prompt:
        "Why is inserting at the head of a linked list an O(1) operation, unlike inserting at the front of a vector?",
      choices: [
        "Vectors don't support insertion at the front",
        "Because linked lists are always kept sorted",
        "Linked lists don't actually store the new data",
        "Only the new node's next pointer and head need to change — no existing elements move",
      ],
      answer: 3,
      explanation:
        "Adding at the head just points the new node at the old head and reassigns head — a constant number of pointer updates, regardless of list size.",
    },
    {
  prompt: "What is the running time for inserting an element in a sorted array/vector?",
  choices: [
    "O(1)",
    "O(n)",
    "O(log n) ",
    "O(n^2)",
  ],
  answer: 1,
  explanation:
    "The run-time stack is LIFO, so each call pushes an Activation Record on top and that record is popped when the call finishes.",
},
{
  prompt: "What is the running time for deleting an element in the middle of an array/vector?",
  choices: [
    "O(n)",
    "O(1)",
    "O(log n)",
    "O(n²)",
  ],
  answer: 0,
  explanation:
    "After removing the element, all elements to its right must shift one slot left to close the gap, which takes linear time in the worst case.",
},
{
  prompt: "In a linked list, each object is called a ___.",
  choices: [
    "cursor",
    "node",
    "head",
    "bag",
  ],
  answer: 1,
  explanation:
    "A linked list is built from individual objects called nodes, where each node holds its data and a pointer to the next node in the chain.",
},
{
  prompt: "Each node in a linked list is a(n) ___.",
  choices: [
    "primitive value",
    "array",
    "object",
    "pointer",
  ],
  answer: 2,
  explanation:
    "Each node is an object that bundles together its data payload and a pointer to the next node in the list.",
},
  ],
  items: [
    makeItem({
      id: "linked-lists-01",
      topicId: "linked-lists",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is a linked list, and how does a program know it has reached the end of one?",
      expected:
        "A linked list is a sequence of objects where each object (called a node) points to the next in the list. A node includes data and a pointer to the next node. The beginning of the list is marked with a pointer (e.g., head), and the last node in the list points to nullptr — that's how you know you've reached the end.",
      criteria: [
        "Defines a linked list as a sequence of nodes, each pointing to the next",
        "States a node holds data plus a pointer to the next node",
        "States the last node's pointer is nullptr",
      ],
      provenance: {
        sourceId: "cpp-slides-03.1-linked-lists",
        anchor: "#what-is-a-linked-list",
        excerpt:
          "A linked list is a sequence of objects where each object points to the next in the list\n- Each object is called a node\n- A node includes data and a pointer to the next node in the list\n- The beginning of the list is marked with a pointer (e.g., head)\n- The last node in the list is pointing to nullptr",
        citation: "Lecture Deck 03.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-02",
      topicId: "linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Write a Node constructor that takes optional data and a next pointer, defaulting next to nullptr, given `private: DataType data; Node *next;`.",
      expected:
        "Node(const DataType newData = DataType(),\nNode *newNext = nullptr){\ndata = newData;\nnext = newNext;\n}",
      criteria: [
        "Gives newData a default of DataType() and newNext a default of nullptr",
        "Assigns the parameters into data and next",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-03.1-linked-lists",
        anchor: "#node-constructor",
        excerpt:
          "//constructor\nNode(const DataType newData = DataType(),\nNode *newNext = nullptr){\ndata = newData;\nnext = newNext;\n}",
        citation: "Lecture Deck 03.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-03",
      topicId: "linked-lists",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Why does Node declare two getNext() overloads instead of one?",
      expected:
        "One overload is `const Node* getNext() const{ return next; }` — get the next field as constant. The other is `Node* getNext(){ return next; }` — get the next field. The const version returns a const Node* for use on a const Node, while the non-const version returns a modifiable Node*.",
      criteria: [
        "Quotes/describes both getNext overloads (const-returning and non-const-returning)",
        "Explains the const overload exists for when the node itself is const",
      ],
      provenance: {
        sourceId: "cpp-slides-03.1-linked-lists",
        anchor: "#node-getters",
        excerpt:
          "//getters\nDataType getData() const{\nreturn data;\n}\nconst Node* getNext() const{ //get the next field as constant\nreturn next;\n}\nNode* getNext(){ //get the next field\nreturn next;\n}",
        citation: "Lecture Deck 03.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-04",
      topicId: "linked-lists",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace this code:\n```\nNode *head;\nhead = new Node();\nhead->setData(50);\n```\nWhat does head point to before and after setData(50) runs?",
      expected:
        "Before setData: head points to a node with data: ? (unspecified, since Node's default constructor gives data its default value) and next: nullptr. After head->setData(50): head points to the same node, now with data: 50 and next still nullptr.",
      criteria: [
        "States the node's next stays nullptr throughout",
        "States data changes from its default/unspecified value to 50 after setData",
      ],
      provenance: {
        sourceId: "cpp-slides-03.1-linked-lists",
        anchor: "#allocating-and-using-a-node",
        excerpt:
          "Node *head;\nhead = new Node();\nhead->setData(50);\n```\n- head starts pointing to a node with data: ? and next: nullptr\n- after setData(50), head points to a node with data: 50 and next: nullptr",
        citation: "Lecture Deck 03.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-05",
      topicId: "linked-lists",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "How is an empty linked list represented, using head and tail pointers?",
      expected:
        "A linked list object is declared with Node *head; and Node *tail; — head = nullptr; initializes it to an empty list. tail points to the end of the list.",
      criteria: [
        "States head = nullptr represents an empty list",
        "Mentions tail as the pointer to the end of the list",
      ],
      provenance: {
        sourceId: "cpp-slides-03.1-linked-lists",
        anchor: "#declaration-of-linked-list-object",
        excerpt:
          "Node *head;\nhead = nullptr; //initialize to empty list\nNode *tail; //point to the end of the list",
        citation: "Lecture Deck 03.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-06",
      topicId: "linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Node Declaration",
      expected:
        "class Node {\npublic:\n…\nprivate:\n<type> data; //can be of any type\n<type> moreData;\n…\nNode *next; //point to the next node\n};",
      criteria: [
        "Declares class Node with public and private sections",
        "Private section holds the data member(s), noted as being of any type",
        "Private section holds Node *next, a pointer to the next node",
      ],
      timeBudgetSec: 90,
      provenance: {
        sourceId: "cpp-slides-03.1-linked-lists",
        anchor: "#node-declaration-skeleton",
        excerpt:
          "class Node {\npublic:\n\nprivate:\n<type> data; //can be of any type\n<type> moreData;\n\nNode *next; //point to the next node\n};",
        citation: "Lecture Deck 03.1",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-mcq-01",
      topicId: "linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What is the running time for inserting an element at the beginning of an array/vector?",
      choices: [
        "O(n)",
        "O(1)",
        "O(log n)",
        "O(n²)",
      ],
      answerIndex: 0,
      expected: "O(n)",
      criteria: [
        "Every existing element must shift over by one position to make room, so the cost scales with the array's size → O(n).",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-mcq-02",
      topicId: "linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What does a linked list's last node's next pointer point to?",
      choices: [
        "The first node inserted",
        "nullptr",
        "The head node",
        "Itself",
      ],
      answerIndex: 1,
      expected: "nullptr",
      criteria: [
        "The last node's next pointer is nullptr, which is how algorithms know they've reached the end of the list.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-mcq-03",
      topicId: "linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In a singly linked Node class, what does the next member store?\n```\nclass Node {\nprivate:\n    DataType data;\n    Node *next;\n};\n```",
      choices: [
        "The index of the following node",
        "A pointer to the head of the list",
        "A pointer to the following node in the list (or nullptr if last)",
        "A copy of the following node's data",
      ],
      answerIndex: 2,
      expected: "A pointer to the following node in the list (or nullptr if last)",
      criteria: [
        "next holds the address of the next node, letting code walk the list one link at a time; it's nullptr on the last node.",
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
