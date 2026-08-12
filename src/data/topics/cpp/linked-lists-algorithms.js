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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
      verifiedByHuman: false,
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
          "Deck 03.3 — Doubly Linked Lists",
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
    makeItem({
      id: "linked-lists-algorithms-10",
      topicId: "linked-lists-algorithms",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Name the three cases `deleteNode` must handle, in the order the slide gives them.",
      expected:
        "1. current is pointing to nullptr: nothing to delete, return.\n2. current is pointing to the head: head must move to current->getNext().\n3. current is somewhere else: find previous by traversal and link around it.",
      criteria: [
        "Names all three cases",
        "Says the head case requires head itself to move",
        "Says the middle case requires finding previous first",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#delete-node-possibilities",
        excerpt:
          "Delete a node pointed to by a pointer called current\n- Three possibilities\n1. current is pointing to nullptr\n2. is pointing to the head (head will have a new pointer)\n3. current is pointing somewhere else including nullptr",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-11",
      topicId: "linked-lists-algorithms",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What is a tail pointer for, and what does it buy you?",
      expected:
        "tail always points at the last node in the list. Keeping it means appending to the end is O(1) instead of an O(n) traversal to find the last node. It must be updated as elements are added to the end.",
      criteria: [
        "Says tail points to the last element",
        "Says appends become O(1)",
        "Mentions tail must be maintained/updated",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#list-tail",
        excerpt:
          "If we're accessing the end of the list regularly (e.g., adding at the end of the list), we can improve the performance by keeping track of the end of the list (tail)\n- tail always points the last element of the list\n- As we add elements to the end of the list, tail changes accordingly",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-12",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "2 minutes. Write the loop that counts the nodes in a list given `head`. Then write the loop that prints every node's data. Both from the cursor skeleton.",
      expected:
        "size_t count = 0;\nNode *cursor = head;\nwhile (cursor != nullptr){\n    count++;\n    cursor = cursor->getNext();\n}\n\nNode *cursor = head;\nwhile (cursor != nullptr){\n    cout << cursor->getData() << endl;\n    cursor = cursor->getNext();\n}",
      criteria: [
        "cursor initialized to head, not to head->getNext()",
        "Loop condition is cursor != nullptr",
        "cursor = cursor->getNext() is the last statement in the body",
        "Both loops are the same skeleton with different guts",
      ],
      timeBudgetSec: 120,
      extraAtoms: ["#output-list"],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#list-length-algorithm",
        excerpt:
          "size_t count = 0;\nNode *cursor = head;\nWhile(cursor != nullptr){\ncount++;\ncursor = cursor->getNext();\n}\n//count holds the number of nodes in the list",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-13",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "3 minutes. Write `search(int target)` returning a pointer to the matching node, or `nullptr` if absent. Then state its running time and why.",
      expected:
        "Node* search(int target)\n{\n    Node *cursor = head;\n    while (cursor != nullptr){\n        if (cursor->getData() == target){\n            return cursor;\n        }\n        cursor = cursor->getNext();\n    }\n    return nullptr;\n}\n\nO(n). There is no index arithmetic on a linked list, so the only way to reach node k is to walk k links. Worst case the target is last or absent and every node is visited.",
      criteria: [
        "Returns cursor on match, not cursor->getData()",
        "Returns nullptr after the loop, not inside it",
        "States O(n)",
        "Justifies O(n) by having to traverse, no random access",
      ],
      timeBudgetSec: 180,
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#search-function",
        excerpt:
          "Node* search(int target)\n{ Node *cursor = head;\nwhile(cursor != nullptr){\nif(cursor->getData() == target){\nreturn cursor;\n}\ncursor = cursor->getNext();\n}\nreturn nullptr;\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-14",
      topicId: "linked-lists-algorithms",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "5 minutes. Write `deleteNode(Node *current)` covering all three cases. `head` is a member of the class.",
      expected:
        "void deleteNode(Node *current){\n    if (current == nullptr){ //nothing to delete\n        return;\n    }\n    if (current == head){ //first node\n        head = current->getNext();\n        delete current;\n    }\n    else{ //find the previous pointer of current\n        Node *previous = head;\n        while (previous->getNext() != current){\n            previous = previous->getNext();\n        }\n        //skip over current in the list and delete it\n        previous->setNext(current->getNext());\n        delete current;\n    }\n}",
      criteria: [
        "nullptr guard comes first",
        "Head case moves head before deleting",
        "Middle case walks previous using previous->getNext() != current",
        "previous->setNext(current->getNext()) happens BEFORE delete current",
      ],
      timeBudgetSec: 300,
      extraAtoms: ["#delete-node-cont"],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#delete-node-function",
        excerpt:
          "void deleteNode(Node *current){\nif(current == nullptr){//nothing to delete\nreturn;\n}\nif(current == head){//first node\nhead = current->getNext();\ndelete current;\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-15",
      topicId: "linked-lists-algorithms",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "List is `head -> 50 -> 30 -> nullptr`. Run:\n```\nNode *temp = new Node(99);\ntemp->setNext(head);\nhead = temp;\n```\nDraw the list after each of the three lines. Give the final traversal order.",
      expected:
        "Line 1: temp -> 99 -> ? (next is uninitialized/nullptr, temp is not yet attached; head still -> 50 -> 30 -> nullptr)\nLine 2: temp -> 99 -> 50 -> 30 -> nullptr, and head still points at 50. Two pointers now aim into the same chain.\nLine 3: head moves to temp. head -> 99 -> 50 -> 30 -> nullptr\n\nTraversal order: 99, 50, 30.",
      criteria: [
        "After line 2, head still points at 50 (has not moved yet)",
        "Recognizes the list is briefly reachable from two pointers",
        "Final order is 99, 50, 30",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#head-insert-algorithm",
        excerpt:
          "//create a node and initialize it to value\nNode *temp = new Node(value);\n//Attach it to the head\ntemp->setNext(head);\n//move head to the beginning of the list\nhead = temp;",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-16",
      topicId: "linked-lists-algorithms",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "List is `head -> 50 -> 30 -> 60 -> 90 -> nullptr`. `previous` points at the node holding 90 (the last node). Run:\n```\nNode *temp = new Node(99);\ntemp->setNext(previous->getNext());\nprevious->setNext(temp);\n```\nWhat is the list now? The slide asks whether this works when previous is the last node: answer it.",
      expected:
        "previous->getNext() is nullptr, so temp->next becomes nullptr, and then previous->next becomes temp. List is 50 -> 30 -> 60 -> 90 -> 99 -> nullptr. Yes, it works: the last node is not a special case, because copying its nullptr into temp is exactly what makes temp the new terminator.",
      criteria: [
        "Final list is 50, 30, 60, 90, 99",
        "Says temp->next receives nullptr",
        "Answers yes, and explains WHY no special case is needed",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#insert-after-previous-pointer",
        excerpt:
          "Case 2: previous is pointing to non-nullptr node\nNode *temp = new Node(value);\nif(previous != nullptr){\ntemp->setNext(previous->getNext());\nprevious->setNext(temp);\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-17",
      topicId: "linked-lists-algorithms",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "This destructor is from the slides. It has a real bug. Find it and name what rule it violates.\n```\nList::~List()\n{\n    Node *cursor = head;\n    while(cursor != nullptr){\n        deleteNode(cursor);\n        cursor = cursor->getNext();\n    }\n}\n```",
      expected:
        "deleteNode frees the node cursor points at, and the very next line reads cursor->getNext() out of that freed memory. That is a use-after-free / dangling pointer read. The rule: capture the next pointer BEFORE deleting.\n\nFix:\nNode *nextUp = cursor->getNext();\ndeleteNode(cursor);\ncursor = nextUp;\n\nIt is also O(n^2), because deleteNode re-walks from head to find previous on every call.",
      criteria: [
        "Identifies the read of cursor->getNext() after cursor is deleted",
        "Names it use-after-free / dangling pointer",
        "States the fix: save next before deleting",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#list-destructor",
        excerpt:
          "List::~List()\n{\n//deallocate all the nodes\nNode *cursor = head;\nwhile(cursor != nullptr){\ndeleteNode(cursor);\ncursor = cursor->getNext();\n}\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-18",
      topicId: "linked-lists-algorithms",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "List is `head -> 50 -> 30 -> 60 -> nullptr`, `previous` points at 50.\n```\nNode *temp = new Node(99);\nprevious->setNext(temp);\ntemp->setNext(previous->getNext());\n```\nTwo lines are in the wrong order. Say exactly what the list becomes and why.",
      expected:
        "After line 2, previous->next is temp, so line 3 reads previous->getNext() and gets temp itself. temp->next = temp, a self-loop. The list is 50 -> 99 -> 99 -> 99 ... forever, and 30 and 60 are leaked, unreachable and never freed. Rule: read the old next before you overwrite it.",
      criteria: [
        "Identifies temp->next = temp, a self-loop / infinite list",
        "Says 30 and 60 become unreachable (leaked)",
        "States the general rule about reading before overwriting",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#insert-after-previous-pointer",
        excerpt:
          "Node *temp = new Node(value);\nif(previous != nullptr){\ntemp->setNext(previous->getNext());\nprevious->setNext(temp);\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-19",
      topicId: "linked-lists-algorithms",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Two separate problems. Name both.\n```\nvoid deleteNode(Node *current){\n    if (current == head){\n        delete current;\n        head = current->getNext();\n    }\n}\n```",
      expected:
        "First: head = current->getNext() reads current after it has been deleted, a use-after-free. The two lines must swap, so head moves before the delete. Second: the nullptr guard is missing, so deleteNode(nullptr) dereferences a null pointer. The middle-of-list case is also absent entirely.",
      criteria: [
        "Identifies the read-after-delete ordering bug",
        "Says head must be reassigned before delete",
        "Identifies the missing nullptr guard",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#delete-node-function",
        excerpt:
          "if(current == nullptr){//nothing to delete\nreturn;\n}\nif(current == head){//first node\nhead = current->getNext();\ndelete current;\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-20",
      topicId: "linked-lists-algorithms",
      format: FORMATS.CLOZE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Fill the blank. Walking to find the predecessor of `current`:\n```\nNode *previous = head;\nwhile (previous->_______ != current){\n    previous = previous->getNext();\n}\n```\nWhat goes in the blank, and what breaks if you write `previous != current` instead?",
      expected:
        "getNext(). Writing previous != current stops with previous ON current, one node too far, so you have lost the predecessor and previous->setNext(current->getNext()) would make current point past itself instead of unlinking it. You must stop one node early.",
      criteria: [
        "Blank is getNext()",
        "Explains that previous != current overshoots by one node",
        "Connects it to needing the predecessor, not the node itself",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#delete-node-cont",
        excerpt:
          "else{ //find the previous pointer of current\nNode *previous = head;\nwhile(previous->getNext() != current){\nprevious = previous->getNext();\n}\n//skip over current in the list and delete it\nprevious->setNext(current->getNext());\ndelete current;\n}",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-21",
      topicId: "linked-lists-algorithms",
      format: FORMATS.COMPLEXITY,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Give running times AND one-line justifications for: insert at front of a vector, insert at front of a linked list, delete from the middle of a vector, delete a node given a pointer to its predecessor.",
      // The author's version was a markdown table; item.expected renders as
      // pre-wrap text with no markdown, so the rows are flattened to lines.
      expected:
        "Vector front insert: O(n), every existing element shifts up one slot.\nLinked list head insert: O(1), two pointer writes, no element moves.\nVector middle delete: O(n), everything after the hole shifts down.\nList delete given prev: O(1), one setNext, contiguity is never required.\n\nThe whole trade: arrays pay on structural change and win on indexing; lists pay on indexing and win on structural change.",
      criteria: [
        "All four times correct: O(n), O(1), O(n), O(1)",
        "Vector costs justified by shifting elements",
        "List O(1) justified by a fixed number of pointer writes",
        "States the general array-vs-list trade",
      ],
      provenance: {
        sourceId: "cpp-slides-03.2-linked-lists-algorithms",
        anchor: "#head-insert-concept",
        excerpt:
          "This is an O(1) algorithm. Much faster than inserting at the beginning of an array/vector",
        citation: "Lecture Deck 03.2",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),

    // ── Practice bank ──────────────────────────────────────────────────────
    // Asks about the destructor as the deck writes it (#list-destructor). The
    // use-after-free is really there; the question is whether you spot it in
    // code that looks authoritative.
    makeItem({
      id: "linked-lists-algorithms-practice-a3",
      topicId: "linked-lists-algorithms",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "What is wrong with the list destructor from the linked-list-algorithms slide, precisely?\n```\nNode *cursor = head;\nwhile(cursor != nullptr){\n    deleteNode(cursor);\n    cursor = cursor->getNext();\n}\n```",
      choices: [
        "It leaks the head node",
        "It reads memory that was already freed",
        "It never terminates",
        "Nothing, it's correct",
      ],
      answerIndex: 1,
      expected: "It reads memory that was already freed",
      criteria: [
        "deleteNode(cursor) frees the node, and then cursor->getNext() dereferences that freed pointer — a use-after-free. The fix is to save the next pointer before deleting.",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "linked-lists-algorithms-practice-a3-written",
      topicId: "linked-lists-algorithms",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.MANUAL,
      prompt:
        "Name the bug in the list destructor from the linked-list-algorithms slide, and give the fix.\n```\nNode *cursor = head;\nwhile(cursor != nullptr){\n    deleteNode(cursor);\n    cursor = cursor->getNext();\n}\n```",
      expected:
        "Use-after-free. deleteNode(cursor) releases the node, and the very next statement dereferences that same freed pointer with cursor->getNext() to find the next node. The fix is to save the successor before deleting: Node* next = cursor->getNext(); deleteNode(cursor); cursor = next;",
      criteria: [
        "Names the use-after-free: the next pointer is read out of an already-deleted node",
        "Gives the fix — capture getNext() into a temporary before deleting",
      ],
      provenance: null,
      difficulty: 3,
      verifiedByHuman: true,
    }),
  ],
};
