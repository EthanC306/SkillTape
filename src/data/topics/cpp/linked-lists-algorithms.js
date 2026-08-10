import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "linked-lists-algorithms",
  title: "Linked List Algorithms",
  subtitle: "Length, search, insert, delete",
  course: "cpp",
  showChart: false,

  examWeight: 1.5,
  cards: [
    {
      heading: "The `cursor` pattern",
      body:
        "Most linked-list algorithms share one idea: a **cursor** pointer starts at `head` and walks the list one node at a time via `cursor = cursor->getNext();`, stopping when `cursor == nullptr`. Length, output, and `search` are all just this loop with a different action inside.",
    },
    {
      heading: "List length",
      body:
        "`size_t count = 0; Node *cursor = head; while (cursor != nullptr) { count++; cursor = cursor->getNext(); }`. Every visited node increments `count` by one; once `cursor` falls off the end, `count` holds the total. This is **O(n)**: it must touch every node.",
    },
    {
      heading: "Output list",
      body:
        "Same traversal, but instead of counting, each visited node's data is printed: `cout << cursor->getData() << endl;` before advancing `cursor`. Nothing about the list itself changes; it's a read-only walk.",
    },
    {
      heading: "Search",
      body:
        "`Node* search(int target)` walks the list comparing `cursor->getData() == target`; it **returns cursor** the moment it matches, or **nullptr** if the loop finishes without finding it. Worst case (no match, or the match is last) touches all n nodes → **O(n)**.",
    },
    {
      heading: "Head insert",
      body:
        "To insert `newData` at the very front: `Node *temp = new Node(value); temp->setNext(head); head = temp;`. Because `head` must actually change inside the function, `head` has to be **passed by reference** if this logic lives in a separate function. This is **O(1)**, dramatically faster than inserting at the front of an array/vector.",
    },
    {
      heading: "Insert after a pointer: two cases",
      body:
        "Inserting after a node pointed to by **previous** splits into two cases: (1) `previous` is **nullptr**, meaning the list is empty, so you just call **headInsert**; (2) `previous` points to a real node, so the new node slots in right after it.",
    },
    {
      heading: "Insert: case 2 code",
      body:
        "`Node *temp = new Node(value); if (previous != nullptr) { temp->setNext(previous->getNext()); previous->setNext(temp); }`. The **order matters**: `temp` must grab `previous`'s old next pointer before `previous` is redirected to `temp`, or that link would be lost.",
    },
    {
      heading: "Delete: three cases",
      body:
        "Deleting the node pointed to by **current** has three cases: (1) `current` is **nullptr**, so there is nothing to delete and the function just returns; (2) `current` **is head**, so move `head` to `current->getNext()` before deleting; (3) `current` is **elsewhere**, so find its predecessor by walking from `head` until `previous->getNext() == current`, then splice `current` out.",
    },
    {
      heading: "Delete: full code",
      body:
        "For the elsewhere case: `Node *previous = head; while (previous->getNext() != current) { previous = previous->getNext(); } previous->setNext(current->getNext()); delete current;`. Finding the predecessor is what makes this **O(n)** in the general case, even though the splice itself is O(1).",
    },
    {
      heading: "List destructor",
      body:
        "`List::~List() { Node *cursor = head; while (cursor != nullptr) { deleteNode(cursor); cursor = cursor->getNext(); } }` walks the list, deallocating each node so the whole list's memory is freed when the List object is destroyed.",
    },
    {
      heading: "Keeping a `tail` pointer",
      body:
        "If a program frequently accesses the **end** of the list, for example by always appending, it pays off to keep a **tail** pointer that always points at the last node. Without one, reaching the end requires an O(n) walk from `head` every time; with one, appends become O(1).",
    },
  ],
  questions: [
    {
      id: "linked-lists-algorithms-q01",
      prompt: "What is the running time of the list-length algorithm?",
      code: "size_t count = 0;\nNode *cursor = head;\nwhile (cursor != nullptr) {\n    count++;\n    cursor = cursor->getNext();\n}",
      choices: [
        "O(n)",
        "O(1)",
        "O(n²)",
        "O(log n)",
      ],
      answer: 0,
      explanation:
        "The `cursor` visits every node exactly once before reaching `nullptr`, so the work scales linearly with the list's size.",
    },
    {
      id: "linked-lists-algorithms-q02",
      prompt: "What does `search()` return if target is not found in the list?",
      code: "Node* search(int target) {\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        if (cursor->getData() == target) return cursor;\n        cursor = cursor->getNext();\n    }\n    return nullptr;\n}",
      choices: [
        "The last node visited",
        "nullptr",
        "A node with data == -1",
        "head",
      ],
      answer: 1,
      explanation:
        "If the loop runs out of nodes without a match, it falls through to `return nullptr;`.",
    },
    {
      id: "linked-lists-algorithms-q03",
      prompt: "Why is `head` insert an O(1) operation?",
      code: "Node *temp = new Node(value);\ntemp->setNext(head);\nhead = temp;",
      choices: [
        "It only ever works on lists that already contain exactly one node",
        "It doesn't allocate any new memory",
        "It secretly uses binary search",
        "It does a fixed number of pointer operations",
      ],
      answer: 3,
      explanation:
        "Allocating one node and reassigning two pointers takes the same amount of work regardless of the list's length.",
    },
    {
      id: "linked-lists-algorithms-q04",
      prompt:
        "Why must `temp->setNext(previous->getNext())` happen BEFORE `previous->setNext(temp)` when inserting after a pointer?",
      code: "Node *temp = new Node(value);\nif (previous != nullptr) {\n    temp->setNext(previous->getNext());\n    previous->setNext(temp);\n}",
      choices: [
        "The order doesn't actually matter here",
        "Otherwise previous->getNext() is already temp, losing the rest of the list",
        "It avoids a memory leak in temp itself",
        "C++ requires setNext calls to be written in alphabetical order by variable name",
      ],
      answer: 1,
      explanation:
        "If `previous` were redirected to `temp` first, `previous->getNext()` would return `temp` instead of the original next node, orphaning the rest of the list.",
    },
    {
      id: "linked-lists-algorithms-q05",
      prompt: "In the insert algorithm, what does `previous == nullptr` signal?",
      choices: [
        "The list is empty, so insert at the head",
        "An invalid pointer was passed in, and the program is expected to crash on it",
        "The list has exactly one node",
        "previous points to the last node in the list",
      ],
      answer: 0,
      explanation:
        "A `nullptr` `previous` means there's no node to insert after, which corresponds to an empty list, handled by calling `headInsert`.",
    },
    {
      id: "linked-lists-algorithms-q06",
      prompt: "When deleting a node, why does the `head` case need special handling?",
      code: "if (current == head) {\n    head = current->getNext();\n    delete current;\n}",
      choices: [
        "The head node can never be deleted",
        "Deleting the head always empties the whole list, whatever else it held",
        "There's no predecessor to re-link, so head itself must move",
        "head is a const pointer and can't be reassigned",
      ],
      answer: 2,
      explanation:
        "Every other node has a predecessor to re-link, but the `head` node doesn't, so `head` itself is advanced to the next node instead.",
    },
    {
      id: "linked-lists-algorithms-q07",
      prompt: "In the general (middle-of-list) delete case, why is a `previous` pointer needed?",
      code: "Node *previous = head;\nwhile (previous->getNext() != current) {\n    previous = previous->getNext();\n}\nprevious->setNext(current->getNext());\ndelete current;",
      choices: [
        "Because previous's next pointer must be redirected around current",
        "previous is only used for printing, not deletion",
        "Because current cannot be handed to delete directly in C++ without a copy",
        "To count how many nodes come before current",
      ],
      answer: 0,
      explanation:
        "Splicing `current` out of the list means the node before it must point past it, which is what `previous->setNext(current->getNext())` does.",
    },
    {
      id: "linked-lists-algorithms-q08",
      prompt: "Why keep a separate `tail` pointer if a program frequently appends to the end of a list?",
      choices: [
        "It's required before the list destructor can free anything",
        "It automatically sorts the list",
        "It makes appends O(1)",
        "It removes the need for a head pointer",
      ],
      answer: 2,
      explanation:
        "Without `tail`, reaching the last node requires traversing the whole list each time; `tail` gives direct O(1) access to it.",
    },
    {
      id: "linked-lists-algorithms-q09",
      prompt: "What is the running time of `search()` in the worst case?",
      choices: [
        "O(1)",
        "O(log n)",
        "O(n log n)",
        "O(n)",
      ],
      answer: 3,
      explanation:
        "If the target isn't in the list (or is the last node), `search` must examine all n nodes before finishing.",
    },
  ],
  items: [
    makeItem({
      id: "linked-lists-algorithms-01",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write a `search` function that returns a pointer to the node containing target, or `nullptr` if not found.",
      expected:
        "Node* search(int target)\n{ Node *cursor = head;\nwhile(cursor != nullptr){\nif(cursor->getData() == target){\nreturn cursor;\n}\ncursor = cursor->getNext();\n}\nreturn nullptr;\n}",
      criteria: [
        "Traverses with a cursor from head until cursor == nullptr",
        "Returns cursor as soon as cursor->getData() == target",
        "Returns nullptr after the loop if nothing matched",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#search-function",
        excerpt:
          "Node* search(int target)\n{ Node *cursor = head;\nwhile(cursor != nullptr){\nif(cursor->getData() == target){\nreturn cursor;\n}\ncursor = cursor->getNext();\n}\nreturn nullptr;\n}",
        citation: "Lecture Deck 03.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists-algorithms.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-02",
      topicId: "linked-lists-algorithms",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Why is `head` insert an O(1) algorithm, and what does that require if `head` insert lives inside a separate function?",
      expected:
        "Head insert is O(1) because it just attaches a new node in front and moves head, a fixed number of pointer operations, much faster than inserting at the beginning of an array/vector. As a result of the algorithm, head will have a new pointer value, so if passing head to a function, it needs to be referenced (call-by-reference) so the caller's head actually updates.",
      criteria: [
        "States head insert is O(1), faster than inserting at the beginning of an array/vector",
        "States head must be passed by reference if the insert logic is in a function",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#head-insert-concept",
        excerpt:
          "- Assuming we are inserting newData at the head of the list\n- As a result of this algorithm, head will have a new pointer value\n- If passing head to a function, it needs to be referenced\n- This is an O(1) algorithm. Much faster than inserting at the beginning of an array/vector",
        citation: "Lecture Deck 03.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists-algorithms.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-03",
      topicId: "linked-lists-algorithms",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "What breaks if you swap the order of these two lines when inserting after `previous`?\n```\ntemp->setNext(previous->getNext());\nprevious->setNext(temp);\n```",
      expected:
        "If previous->setNext(temp) ran first, then temp->setNext(previous->getNext()) would set temp's next to temp itself (since previous->getNext() is now temp), losing the link to the rest of the list. The correct order captures previous's old next before previous is redirected. Case 2, where previous points to a non-nullptr node: Node *temp = new Node(value); if(previous != nullptr){ temp->setNext(previous->getNext()); previous->setNext(temp); }",
      criteria: [
        "Identifies that redirecting previous first would make previous->getNext() return temp instead of the original next node",
        "States the rest of the list would be lost/orphaned",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#insert-after-previous-pointer",
        excerpt:
          "Case 2: previous is pointing to non-nullptr node\nNode *temp = new Node(value);\nif(previous != nullptr){\ntemp->setNext(previous->getNext());\nprevious->setNext(temp);\n}",
        citation: "Lecture Deck 03.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists-algorithms.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-04",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write `deleteNode(Node *current)`, handling both the `nullptr` case and the `current` == `head` case.",
      expected:
        "void deleteNode(Node *current){\nif(current == nullptr){//nothing to delete\nreturn;\n}\nif(current == head){//first node\nhead = current->getNext();\ndelete current;\n}\n}",
      criteria: [
        "Returns immediately if current is nullptr",
        "If current == head, sets head = current->getNext() before deleting current",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#delete-node-function",
        excerpt:
          "void deleteNode(Node *current){\nif(current == nullptr){//nothing to delete\nreturn;\n}\nif(current == head){//first node\nhead = current->getNext();\ndelete current;\n}",
        citation: "Lecture Deck 03.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists-algorithms.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-05",
      topicId: "linked-lists-algorithms",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Given this code for deleting a node that isn't the `head`, why does the while loop stop before reaching `current` itself?\n```\nNode *previous = head;\nwhile(previous->getNext() != current){\nprevious = previous->getNext();\n}\nprevious->setNext(current->getNext());\ndelete current;\n```",
      expected:
        "The loop advances previous until previous->getNext() equals current, that is, until previous is the node right before current. It deliberately stops one node short of current so previous can be used to skip over current: previous->setNext(current->getNext()); splices current out of the list, then delete current frees it.",
      criteria: [
        "States the loop stops when previous is the node immediately before current",
        "Explains previous->setNext(current->getNext()) skips over current in the list",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#delete-node-cont",
        excerpt:
          "else{ //find the previous pointer of current\nNode *previous = head;\nwhile(previous->getNext() != current){\nprevious = previous->getNext();\n}\n//skip over current in the list and delete it\nprevious->setNext(current->getNext());\ndelete current;\n}",
        citation: "Lecture Deck 03.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists-algorithms.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-06",
      topicId: "linked-lists-algorithms",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "When is it worth keeping a `tail` pointer for a linked list, and what does it buy you?",
      expected:
        "If we're accessing the end of the list regularly (e.g., adding at the end of the list), we can improve the performance by keeping track of the end of the list (tail). tail always points the last element of the list, and as elements are added to the end, tail changes accordingly.",
      criteria: [
        "States tail is worth it when the end of the list is accessed regularly (e.g. frequent appends)",
        "States tail always points to the last element and is updated as elements are appended",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#list-tail",
        excerpt:
          "If we're accessing the end of the list regularly (e.g., adding at the end of the list), we can improve the performance by keeping track of the end of the list (tail)\n- tail always points the last element of the list\n- As we add elements to the end of the list, tail changes accordingly",
        citation: "Lecture Deck 03.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/linked-lists-algorithms.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
  
    makeItem({
      id: "linked-lists-algorithms-07",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt:
        "Write the first-node case of `DList::deleteNode(DNode *cursor)`, including the guard for a null `cursor` and the deallocation at the end.",
      expected:
        "void DList::deleteNode(DNode *cursor) {\n    if (cursor == nullptr) { return; } // nothing to delete\n\n    if (cursor == head) { // first node\n        head = cursor->getNext();\n        if (head != nullptr) { //only node?\n            head->setPrevious(nullptr);\n        }\n    }\n\n    delete cursor; //deallocate the node\n}",
      criteria: [
        "Returns immediately when cursor == nullptr, before dereferencing anything",
        "Detects the first-node case with cursor == head",
        "Advances head with head = cursor->getNext()",
        "Guards head != nullptr before calling head->setPrevious(nullptr), since the deleted node may have been the only node",
        "Calls delete cursor at the end, after the pointers have been rewired",
      ],
      timeBudgetSec: 180,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#delete-node-function-doubly",
        excerpt:
          "void DList::deleteNode(DNode *cursor) {\nif (cursor == nullptr) {return;} // nothing to delete\nif (cursor == head) { // first node\nhead = cursor->getNext();\nif (head != nullptr){ //only node?\nhead->setPrevious(nullptr);\n}\n}\ndelete cursor; //deallocate the node\n}",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-08",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt:
        "Write the delete for the last node",
      expected:
        "} else if (cursor->getNext() == nullptr) { //last node\n    DNode *previous = cursor->getPrevious(); // find the previous of cursor\n    previous->setNext(nullptr);\n}\n\ndelete cursor; //deallocate the node",
      criteria: [
        "Detects the last node with cursor->getNext() == nullptr",
        "Reaches the previous node directly via cursor->getPrevious(), with no search loop, because the prev pointer is already stored",
        "Sets previous->setNext(nullptr) so the list has a new end",
        "Runs as an else-if after the head case, so a single-node list is handled by the head branch instead",
        "Still deallocates with delete cursor after the rewiring",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#delete-node-function-doubly",
        excerpt:
          "} else if (cursor->getNext() == nullptr) { //last node\nDNode *previous = cursor->getPrevious(); // find the previous of cursor\nprevious->setNext(nullptr);\n}\ndelete cursor; //deallocate the node",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-09",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt:
        "Write the middle-node case of `DList::deleteNode(DNode *cursor)`",
      expected:
        "} else { // somewhere in the middle\n    DNode *after = cursor->getNext();\n    DNode *before = cursor->getPrevious();\n    before->setNext(after);\n    after->setPrevious(before);\n}\n\ndelete cursor; //deallocate the node",
      criteria: [
        "Captures both neighbours first: after = cursor->getNext() and before = cursor->getPrevious()",
        "Repairs both directions: before->setNext(after) and after->setPrevious(before)",
        "Finds before in O(1) from the stored prev pointer, with no walk from head",
        "Falls through as the final else, so it only runs when cursor is neither head nor last",
        "Still deallocates with delete cursor after the splice",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#delete-node-function-doubly",
        excerpt:
          "} else { // somewhere in the middle\nDNode *after = cursor->getNext();\nDNode *before = cursor->getPrevious();\nbefore->setNext(after);\nafter->setPrevious(before);\n}\ndelete cursor; //deallocate the node",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
   
    makeItem({
      id: "linked-lists-algorithms-mcq-01",
      topicId: "linked-lists-algorithms",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What is the running time of the list-length algorithm?\n```\nsize_t count = 0;\nNode *cursor = head;\nwhile (cursor != nullptr) {\n    count++;\n    cursor = cursor->getNext();\n}\n```",
      choices: [
        "O(n)",
        "O(1)",
        "O(n²)",
        "O(log n)",
      ],
      answerIndex: 0,
      expected: "O(n)",
      criteria: [
        "The cursor visits every node exactly once before reaching nullptr, so the work scales linearly with the list's size.",
      ],
      
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-mcq-02",
      topicId: "linked-lists-algorithms",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Why must `temp->setNext(previous->getNext())` happen BEFORE `previous->setNext(temp)` when inserting after a pointer?\n```\nNode *temp = new Node(value);\nif (previous != nullptr) {\n    temp->setNext(previous->getNext());\n    previous->setNext(temp);\n}\n```",
      choices: [
        "The order doesn't actually matter here",
        "Otherwise previous->getNext() is already temp, losing the rest of the list",
        "It avoids a memory leak in temp itself",
        "C++ requires setNext calls to be written in alphabetical order by variable name",
      ],
      answerIndex: 1,
      expected: "Otherwise previous->getNext() is already temp, losing the rest of the list",
      criteria: [
        "If previous were redirected to temp first, previous->getNext() would return temp instead of the original next node, orphaning the rest of the list.",
      ],
      
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-mcq-03",
      topicId: "linked-lists-algorithms",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In the insert algorithm, what does `previous == nullptr` signal?",
      choices: [
        "The list is empty, so insert at the head",
        "An invalid pointer was passed in, and the program is expected to crash on it",
        "The list has exactly one node",
        "previous points to the last node in the list",
      ],
      answerIndex: 0,
      expected: "The list is empty, so insert at the head",
      criteria: [
        "A nullptr previous means there's no node to insert after, which corresponds to an empty list, handled by calling headInsert.",
      ],
     
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-mcq-04",
      topicId: "linked-lists-algorithms",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "When deleting a node, why does the `head` case need special handling?\n```\nif (current == head) {\n    head = current->getNext();\n    delete current;\n}\n```",
      choices: [
        "The head node can never be deleted",
        "Deleting the head always empties the whole list, whatever else it held",
        "There's no predecessor to re-link, so head itself must move",
        "head is a const pointer and can't be reassigned",
      ],
      answerIndex: 2,
      expected: "There's no predecessor to re-link, so head itself must move",
      criteria: [
        "Every other node has a predecessor to re-link, but the head node doesn't, so head itself is advanced to the next node instead.",
      ],
     
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
  ],
};
