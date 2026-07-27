export default {
  id: "linked-lists-algorithms",
  title: "Linked List Algorithms",
  subtitle: "CS 2401 — length, search, insert, delete",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "The cursor pattern",
      body:
        "Most linked-list algorithms share one idea: a **cursor** pointer starts at head and walks the list one node at a time via `cursor = cursor->getNext();`, stopping when `cursor == nullptr`. Length, output, and search are all just this loop with a different action inside.",
    },
    {
      heading: "List length",
      body:
        "`size_t count = 0; Node *cursor = head; while (cursor != nullptr) { count++; cursor = cursor->getNext(); }`. Every visited node increments count by one; once cursor falls off the end, count holds the total. This is **O(n)** — it must touch every node.",
    },
    {
      heading: "Output list",
      body:
        "Same traversal, but instead of counting, each visited node's data is printed: `cout << cursor->getData() << endl;` before advancing cursor. Nothing about the list itself changes — it's a read-only walk.",
    },
    {
      heading: "Search",
      body:
        "`Node* search(int target)` walks the list comparing `cursor->getData() == target`; it **returns cursor** the moment it matches, or **nullptr** if the loop finishes without finding it. Worst case (no match, or the match is last) touches all n nodes → **O(n)**.",
    },
    {
      heading: "Head insert",
      body:
        "To insert newData at the very front: `Node *temp = new Node(value); temp->setNext(head); head = temp;`. Because head must actually change inside the function, head has to be **passed by reference** if this logic lives in a separate function. This is **O(1)** — dramatically faster than inserting at the front of an array/vector.",
    },
    {
      heading: "Insert after a pointer — two cases",
      body:
        "Inserting after a node pointed to by **previous** splits into two cases: (1) previous is **nullptr**, meaning the list is empty, so you just call **headInsert**; (2) previous points to a real node, so the new node slots in right after it.",
    },
    {
      heading: "Insert — case 2 code",
      body:
        "`Node *temp = new Node(value); if (previous != nullptr) { temp->setNext(previous->getNext()); previous->setNext(temp); }`. The **order matters**: temp must grab previous's old next pointer *before* previous is redirected to temp, or that link would be lost.",
    },
    {
      heading: "Delete — three cases",
      body:
        "Deleting the node pointed to by **current** has three cases: (1) current is **nullptr** — nothing to delete, just return; (2) current **is head** — move head to current->getNext() before deleting; (3) current is **elsewhere** — find its predecessor by walking from head until `previous->getNext() == current`, then splice current out.",
    },
    {
      heading: "Delete — full code",
      body:
        "For the elsewhere case: `Node *previous = head; while (previous->getNext() != current) { previous = previous->getNext(); } previous->setNext(current->getNext()); delete current;`. Finding the predecessor is what makes this **O(n)** in the general case, even though the splice itself is O(1).",
    },
    {
      heading: "List destructor",
      body:
        "`List::~List() { Node *cursor = head; while (cursor != nullptr) { deleteNode(cursor); cursor = cursor->getNext(); } }` walks the list, deallocating each node so the whole list's memory is freed when the List object is destroyed.",
    },
    {
      heading: "Keeping a tail pointer",
      body:
        "If a program frequently accesses the **end** of the list — e.g., always appending — it pays off to keep a **tail** pointer that always points at the last node. Without one, reaching the end requires an O(n) walk from head every time; with one, appends become O(1).",
    },
  ],
  questions: [
    {
      prompt: "What is the running time of the list-length algorithm?",
      code: "size_t count = 0;\nNode *cursor = head;\nwhile (cursor != nullptr) {\n    count++;\n    cursor = cursor->getNext();\n}",
      choices: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      answer: 2,
      explanation:
        "The cursor visits every node exactly once before reaching nullptr, so the work scales linearly with the list's size.",
    },
    {
      prompt: "What does search() return if target is not found in the list?",
      code: "Node* search(int target) {\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        if (cursor->getData() == target) return cursor;\n        cursor = cursor->getNext();\n    }\n    return nullptr;\n}",
      choices: ["nullptr", "head", "The last node visited", "A node with data == -1"],
      answer: 0,
      explanation:
        "If the loop runs out of nodes without a match, it falls through to `return nullptr;`.",
    },
    {
      prompt: "Why is head insert an O(1) operation?",
      code: "Node *temp = new Node(value);\ntemp->setNext(head);\nhead = temp;",
      choices: [
        "It does a fixed number of pointer operations no matter how large the list is",
        "It only works on lists with one node",
        "It secretly uses binary search",
        "It doesn't allocate any new memory",
      ],
      answer: 0,
      explanation:
        "Allocating one node and reassigning two pointers takes the same amount of work regardless of the list's length.",
    },
    {
      prompt:
        "Why must temp->setNext(previous->getNext()) happen BEFORE previous->setNext(temp) when inserting after a pointer?",
      code: "Node *temp = new Node(value);\nif (previous != nullptr) {\n    temp->setNext(previous->getNext());\n    previous->setNext(temp);\n}",
      choices: [
        "Otherwise previous->getNext() would already be temp, losing the link to the rest of the list",
        "The order doesn't actually matter here",
        "C++ requires setNext calls in alphabetical order",
        "It avoids a memory leak in temp itself",
      ],
      answer: 0,
      explanation:
        "If previous were redirected to temp first, previous->getNext() would return temp instead of the original next node, orphaning the rest of the list.",
    },
    {
      prompt: "In the insert algorithm, what does `previous == nullptr` signal?",
      choices: [
        "The list is empty, so the new value should be inserted at the head",
        "The list has exactly one node",
        "An invalid pointer was passed and the program should crash",
        "previous points to the last node in the list",
      ],
      answer: 0,
      explanation:
        "A nullptr previous means there's no node to insert after, which corresponds to an empty list — handled by calling headInsert.",
    },
    {
      prompt: "When deleting a node, why does the head case need special handling?",
      code: "if (current == head) {\n    head = current->getNext();\n    delete current;\n}",
      choices: [
        "There's no predecessor node whose next pointer needs updating — head itself must move instead",
        "The head node can never be deleted",
        "Deleting the head always empties the whole list",
        "head is a const pointer and can't be reassigned",
      ],
      answer: 0,
      explanation:
        "Every other node has a predecessor to re-link, but the head node doesn't — so head itself is advanced to the next node instead.",
    },
    {
      prompt: "In the general (middle-of-list) delete case, why is a `previous` pointer needed?",
      code: "Node *previous = head;\nwhile (previous->getNext() != current) {\n    previous = previous->getNext();\n}\nprevious->setNext(current->getNext());\ndelete current;",
      choices: [
        "Because it's the previous node's next pointer that must be redirected around current",
        "Because current cannot be deleted directly in C++",
        "To count how many nodes come before current",
        "previous is only used for printing, not deletion",
      ],
      answer: 0,
      explanation:
        "Splicing current out of the list means the node before it must point past it — that's previous->setNext(current->getNext()).",
    },
    {
      prompt: "Why keep a separate tail pointer if a program frequently appends to the end of a list?",
      choices: [
        "It avoids an O(n) walk from head every time, making appends O(1)",
        "It removes the need for a head pointer",
        "It automatically sorts the list",
        "It's required for the list destructor to work",
      ],
      answer: 0,
      explanation:
        "Without tail, reaching the last node requires traversing the whole list each time; tail gives direct O(1) access to it.",
    },
    {
      prompt: "What is the running time of search() in the worst case?",
      choices: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 2,
      explanation:
        "If the target isn't in the list (or is the last node), search must examine all n nodes before finishing.",
    },
  ],
};
