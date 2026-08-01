export default {
  id: "linked-lists",
  title: "Linked Lists",
  subtitle: "CS 2401 — nodes, pointers & the Node class",
  course: "cpp",
  showChart: false,
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
  ],
};
