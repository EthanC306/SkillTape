export default {
  id: "doubly-linked-lists",
  title: "Doubly Linked Lists",
  subtitle: "CS 2401 — DNode, insert & delete with two pointers",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): provisional, see dynamic-alloc.js
  // for the methodology note. Self-reported struggle area; not yet confirmed
  // by a diagnostic question.
  examWeight: 1.5,
  cards: [
    {
      heading: "Why go doubly linked?",
      body:
        "A singly linked list only stores a **next** pointer, so walking **backward** through it is inefficient — you'd have to restart from head. A doubly linked list fixes this by giving each node **two** pointers: **next** (forward) and **previous** (backward).",
    },
    {
      heading: "The DNode class",
      body:
        "`class DNode { private: int data; DNode *next; DNode *previous; };`. The list itself now needs pointers at **both ends** conceptually — head's previous is nullptr, and the last node's next is nullptr, forming a chain that can be walked in either direction.",
    },
    {
      heading: "DNode constructor",
      body:
        "`DNode::DNode(const DataType newData, DNode *newNext, DNode *newPrevious) { data = newData; next = newNext; previous = newPrevious; }` — sets all three fields explicitly, unlike a singly linked node which only tracks one neighbor.",
    },
    {
      heading: "Insert after a cursor — the empty-list case",
      body:
        "`insertAfter(DNode *&head, DNode *cursor, int value)` first handles an **empty list**: if head is nullptr, the new node becomes head with **both** next and previous set to nullptr, then the function returns early.",
    },
    {
      heading: "Insert after a cursor — the general case",
      body:
        "`temp->next = cursor->next; temp->prev = cursor; if (cursor->next != nullptr) cursor->next->prev = temp; cursor->next = temp;` — four pointer updates are needed (versus two for a singly linked list) because both **temp's own links** and the **neighboring nodes' links back** must be set. The nullptr check guards against cursor being the last node.",
    },
    {
      heading: "Delete — three cases, now with previous",
      body:
        "Deleting cursor still has three cases, but each is aware of **previous** as well as next: (1) cursor is the **first node** — advance head, and if the new head isn't null, clear its previous; (2) cursor is the **last node** — clear the previous node's next; (3) cursor is in the **middle** — splice it out by connecting its neighbors to each other in **both directions**.",
    },
    {
      heading: "Delete — middle-of-list splice",
      body:
        "`DNode *after = cursor->getNext(); DNode *before = cursor->getPrevious(); before->setNext(after); after->setPrevious(before);` — unlike a singly linked list, no separate loop is needed to **find** the previous node, because each node already stores it directly. That's the main efficiency win of the doubly linked structure.",
    },
    {
      heading: "What's left as exercises",
      body:
        "Common follow-up algorithms for a doubly linked list: **output forward and backward** (using next then previous), **length**, **list clear**, **list copy**, and **search** — each following the same traversal patterns as singly linked lists, just with the option to go either direction.",
    },
  ],
  questions: [
    {
      prompt: "What does a doubly linked list add compared to a singly linked list?",
      choices: [
        "A guarantee that the list is never empty",
        "Automatic sorting of the list",
        "A second data field in each node",
        "A previous pointer in each node, enabling efficient backward traversal",
      ],
      answer: 3,
      explanation:
        "Each DNode stores both next and previous, so the list can be walked backward without restarting from head.",
    },
    {
      prompt: "In the DNode class, what are the three private members?",
      code: "class DNode {\nprivate:\n    int data;\n    DNode *next;\n    DNode *previous;\n};",
      choices: [
        "data, next, and previous",
        "data, head, and tail",
        "data and next only",
        "next, previous, and count",
      ],
      answer: 0,
      explanation:
        "A doubly linked node stores its data plus pointers to both its next and previous neighbors.",
    },
    {
      prompt:
        "In insertAfter(head, cursor, value), what happens if head == nullptr?",
      code: "if (head == nullptr) {\n    head = temp;\n    temp->next = nullptr;\n    temp->prev = nullptr;\n    return;\n}",
      choices: [
        "It throws an exception",
        "cursor is used as the new head instead of temp",
        "The new node becomes head, with both next and previous set to nullptr",
        "The function does nothing and returns immediately",
      ],
      answer: 2,
      explanation:
        "An empty list is a special case handled before any cursor-relative linking: the new node simply becomes the sole node in the list.",
    },
    {
      prompt: "Why does inserting after a cursor need four pointer updates instead of two?",
      code: "temp->next = cursor->next;\ntemp->prev = cursor;\nif (cursor->next != nullptr)\n    cursor->next->prev = temp;\ncursor->next = temp;",
      choices: [
        "Because both temp's own next/prev links and the neighboring nodes' back-links to temp must be set",
        "Because C++ requires initializing every pointer field twice",
        "Because cursor must be duplicated",
        "It doesn't — two updates are always enough",
      ],
      answer: 0,
      explanation:
        "A doubly linked insert must wire up temp's next and prev, plus fix up cursor->next and (if it exists) cursor->next's old prev pointer.",
    },
    {
      prompt: "Why is `if (cursor->next != nullptr)` needed before `cursor->next->prev = temp;`?",
      choices: [
        "It's optional and only improves performance",
        "To avoid dereferencing a null pointer when cursor is the last node in the list",
        "To decide whether to allocate temp",
        "To check whether the list has more than one node",
      ],
      answer: 1,
      explanation:
        "If cursor is the last node, cursor->next is nullptr, and dereferencing it (cursor->next->prev) would be undefined behavior.",
    },
    {
      prompt: "When deleting the first node in a doubly linked list, what must happen to the new head?",
      code: "if (cursor == head) {\n    head = cursor->getNext();\n    if (head != nullptr) {\n        head->setPrevious(nullptr);\n    }\n}",
      choices: [
        "Its next pointer must be cleared to nullptr",
        "Its previous pointer must be cleared to nullptr, since it has no node before it now",
        "It must be deleted immediately",
        "Nothing — head can keep its old previous pointer",
      ],
      answer: 1,
      explanation:
        "After removing the old first node, the new first node's previous must be nullptr since nothing precedes it anymore.",
    },
    {
      prompt:
        "What is the key efficiency advantage of deleting a middle node in a doubly linked list versus a singly linked list?",
      code: "DNode *after = cursor->getNext();\nDNode *before = cursor->getPrevious();\nbefore->setNext(after);\nafter->setPrevious(before);",
      choices: [
        "It avoids calling delete on the node",
        "Middle nodes can't be deleted in a singly linked list at all",
        "The previous node is already known directly — no loop is needed to find it",
        "It doesn't require updating any pointers",
      ],
      answer: 2,
      explanation:
        "A singly linked list must walk from head to find the predecessor before it can delete; a doubly linked node already stores that pointer.",
    },
    {
      prompt: "Deleting a node in a doubly linked list has how many distinct cases?",
      choices: [
        "One: the same logic always applies",
        "Four: first, last, middle, and root",
        "Two: empty list and non-empty list",
        "Three: first node, last node, and a node in the middle",
      ],
      answer: 3,
      explanation:
        "Deletion branches on whether the target is the head, the last node (next is nullptr), or somewhere in the middle.",
    },
  ],
};
