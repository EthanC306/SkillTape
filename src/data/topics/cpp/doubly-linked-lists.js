import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "doubly-linked-lists",
  title: "Doubly Linked Lists",
  subtitle: "DNode, insert & delete with two pointers",
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
        "A singly linked list only stores a **next** pointer, so walking **backward** through it is inefficient, since you'd have to restart from `head`. A doubly linked list fixes this by giving each node **two** pointers: **next** (forward) and **previous** (backward).",
    },
    {
      heading: "The `DNode` class",
      body:
        "`class DNode { private: int data; DNode *next; DNode *previous; };`. The list itself now needs pointers at **both ends** conceptually: `head`'s `previous` is `nullptr`, and the last node's `next` is `nullptr`, forming a chain that can be walked in either direction.",
    },
    {
      heading: "`DNode` constructor",
      body:
        "`DNode::DNode(const DataType newData, DNode *newNext, DNode *newPrevious) { data = newData; next = newNext; previous = newPrevious; }` sets all three fields explicitly, unlike a singly linked node which only tracks one neighbor.",
    },
    {
      heading: "Insert after a `cursor`: the empty-list case",
      body:
        "`insertAfter(DNode *&head, DNode *cursor, int value)` first handles an **empty list**: if `head` is `nullptr`, the new node becomes `head` with **both** `next` and `previous` set to `nullptr`, then the function returns early.",
    },
    {
      heading: "Insert after a `cursor`: the general case",
      body:
        "`temp->next = cursor->next; temp->prev = cursor; if (cursor->next != nullptr) cursor->next->prev = temp; cursor->next = temp;` needs four pointer updates (versus two for a singly linked list) because both **temp's own links** and the **neighboring nodes' links back** must be set. The `nullptr` check guards against `cursor` being the last node.",
    },
    {
      heading: "Delete: three cases, now with `previous`",
      body:
        "Deleting `cursor` still has three cases, but each is aware of **previous** as well as `next`: (1) `cursor` is the **first node**, so advance `head`, and if the new `head` isn't null, clear its `previous`; (2) `cursor` is the **last node**, so clear the `previous` node's `next`; (3) `cursor` is in the **middle**, so splice it out by connecting its neighbors to each other in **both directions**.",
    },
    {
      heading: "Delete: middle-of-list splice",
      body:
        "`DNode *after = cursor->getNext(); DNode *before = cursor->getPrevious(); before->setNext(after); after->setPrevious(before);`. Unlike a singly linked list, no separate loop is needed to **find** the `previous` node, because each node already stores it directly. That's the main efficiency win of the doubly linked structure.",
    },
    {
      heading: "What's left as exercises",
      body:
        "Common follow-up algorithms for a doubly linked list: **output forward and backward** (using `next` then `previous`), **length**, **list clear**, **list copy**, and **search**, each following the same traversal patterns as singly linked lists, just with the option to go either direction.",
    },
  ],
  questions: [
    {
      id: "doubly-linked-lists-q01",
      verifiedByHuman: false,
      prompt: "What does a doubly linked list add compared to a singly linked list?",
      choices: [
        "A guarantee that the list can never be empty once built",
        "Automatic sorting of the list",
        "A second data field in each node",
        "A previous pointer in each node",
      ],
      answer: 3,
      explanation:
        "Each `DNode` stores both `next` and `previous`, so the list can be walked backward without restarting from `head`.",
    },
    {
      id: "doubly-linked-lists-q02",
      verifiedByHuman: false,
      prompt: "In the `DNode` class, what are the three private members?",
      code: "class DNode {\nprivate:\n    int data;\n    DNode *next;\n    DNode *previous;\n};",
      choices: [
        "data, next, and previous",
        "data, head, and tail",
        "data and next only",
        "next, previous, and count",
      ],
      answer: 0,
      explanation:
        "A doubly linked node stores its data plus pointers to both its `next` and `previous` neighbors.",
    },
    {
      id: "doubly-linked-lists-q03",
      verifiedByHuman: false,
      prompt:
        "In `insertAfter(head, cursor, value)`, what happens if `head` == `nullptr`?",
      code: "if (head == nullptr) {\n    head = temp;\n    temp->next = nullptr;\n    temp->prev = nullptr;\n    return;\n}",
      choices: [
        "It throws an exception",
        "cursor is used as the new head instead of temp",
        "It becomes head, with next and previous both nullptr",
        "The function does nothing at all and returns to its caller immediately",
      ],
      answer: 2,
      explanation:
        "An empty list is a special case handled before any `cursor`-relative linking: the new node simply becomes the sole node in the list.",
    },
    {
      id: "doubly-linked-lists-q04",
      verifiedByHuman: false,
      prompt: "Why does inserting after a `cursor` need four pointer updates instead of two?",
      code: "temp->next = cursor->next;\ntemp->prev = cursor;\nif (cursor->next != nullptr)\n    cursor->next->prev = temp;\ncursor->next = temp;",
      choices: [
        "Because temp's own links and the neighbours' back-links to temp both need setting",
        "Because C++ requires every pointer field in a node to be initialized exactly twice",
        "Because cursor must be duplicated",
        "It doesn't; two updates are always enough",
      ],
      answer: 0,
      explanation:
        "A doubly linked insert must wire up temp's `next` and `prev`, plus fix up `cursor->next` and (if it exists) `cursor->next`'s old `prev` pointer.",
    },
    {
      id: "doubly-linked-lists-q05",
      verifiedByHuman: false,
      prompt: "Why is `if (cursor->next != nullptr)` needed before `cursor->next->prev = temp;`?",
      choices: [
        "It's optional, and skipping it only costs a little performance on long lists",
        "To avoid dereferencing nullptr when cursor is the last node",
        "To decide whether to allocate temp",
        "To check whether the list has more than one node",
      ],
      answer: 1,
      explanation:
        "If `cursor` is the last node, `cursor->next` is `nullptr`, and dereferencing it (`cursor->next->prev`) would be undefined behavior.",
    },
    {
      id: "doubly-linked-lists-q06",
      verifiedByHuman: false,
      prompt: "When deleting the first node in a doubly linked list, what must happen to the new `head`?",
      code: "if (cursor == head) {\n    head = cursor->getNext();\n    if (head != nullptr) {\n        head->setPrevious(nullptr);\n    }\n}",
      choices: [
        "Its next pointer must be cleared to nullptr",
        "Its previous pointer must be set to nullptr",
        "It must be deleted immediately",
        "Nothing; the new head can keep whatever previous pointer it already had",
      ],
      answer: 1,
      explanation:
        "After removing the old first node, the new first node's `previous` must be `nullptr` since nothing precedes it anymore.",
    },
    {
      id: "doubly-linked-lists-q07",
      verifiedByHuman: false,
      prompt:
        "What is the key efficiency advantage of deleting a middle node in a doubly linked list versus a singly linked list?",
      code: "DNode *after = cursor->getNext();\nDNode *before = cursor->getPrevious();\nbefore->setNext(after);\nafter->setPrevious(before);",
      choices: [
        "It avoids calling delete on the node",
        "Middle nodes can't be deleted from a singly linked list at all, only from a doubly linked one",
        "The previous node is already known, so no search loop",
        "It doesn't require updating any pointers",
      ],
      answer: 2,
      explanation:
        "A singly linked list must walk from `head` to find the predecessor before it can delete; a doubly linked node already stores that pointer.",
    },
    {
      id: "doubly-linked-lists-q08",
      verifiedByHuman: false,
      prompt: "Deleting a node in a doubly linked list has how many distinct cases?",
      choices: [
        "One: the same logic always applies",
        "Four: first node, last node, middle node, and root node",
        "Two: empty list and non-empty list",
        "Three: first, last, middle",
      ],
      answer: 3,
      explanation:
        "Deletion branches on whether the target is the `head`, the last node (`next` is `nullptr`), or somewhere in the middle.",
    },
  ],
  items: [
    makeItem({
      id: "doubly-linked-lists-01",
      topicId: "doubly-linked-lists",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What problem do doubly linked lists solve, and how?",
      expected:
        "With singular (singly) linked lists, it is inefficient to traverse backward in the list. Doubly linked lists solve this problem by storing two pointers in each node (next, previous). The next pointer points to the next node while previous points to the previous node in the list.",
      criteria: [
        "States singly linked lists are inefficient to traverse backward",
        "States each doubly linked node stores both a next and a previous pointer",
      ],
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#why-doubly-linked-lists",
        excerpt:
          "With singular linked lists discussed earlier, it is inefficient to traverse backward in the list\n- Doubly linked lists solve this problem by storing two pointers in each node (next, previous)\n- The next pointer points to the next node while previous points to the previous node in the list",
        citation: "Lecture Deck 03.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/doubly-linked-lists.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-02",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Write the `DNode` constructor, given `data`, `next`, `previous` fields and parameters `newData`, `newNext`, `newPrevious`.",
      expected:
        "DNode::DNode(const DataType newData,\nDNode * newNext,\nDNode *newPrevious)\n{\ndata = newData;\nnext = newNext;\nprevious = newPrevious;\n}",
      criteria: [
        "Takes newData, newNext, newPrevious as parameters",
        "Assigns all three fields: data, next, previous",
      ],
      timeBudgetSec: 90,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#dnode-constructor",
        excerpt:
          "DNode::DNode(const DataType newData,\nDNode * newNext,\nDNode *newPrevious)\n{\ndata = newData;\nnext = newNext;\nprevious = newPrevious;\n}",
        citation: "Lecture Deck 03.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/doubly-linked-lists.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-03",
      topicId: "doubly-linked-lists",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace `insertAfter(head, cursor, value)` when the list is empty (`head` == `nullptr`):\n```\nif (head == nullptr)//list is empty\n{ head = temp;\ntemp->next = NULL;\ntemp->prev = NULL;\nreturn;\n}\n```\nWhat does the list look like afterward?",
      expected:
        "temp becomes head, and both temp->next and temp->prev are set to NULL. The function returns immediately without touching cursor, since there's nothing else in the list. The list now has exactly one node: head, with no next and no previous.",
      criteria: [
        "States temp becomes the new head",
        "States both next and prev are NULL on the new node",
        "States the function returns early, not falling through to the cursor-relative logic",
      ],
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#insert-after-cursor-node",
        excerpt:
          "if (head == nullptr)//list is empty\n{ head = temp;\ntemp->next = NULL;\ntemp->prev = NULL;\nreturn;\n}",
        citation: "Lecture Deck 03.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/doubly-linked-lists.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-04",
      topicId: "doubly-linked-lists",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "What would go wrong if this line were removed from insertAfter?\n```\ntemp->next = cursor->next;\ntemp->prev = cursor;\nif (cursor->next != nullptr) //check if at end of list\n cursor->next->prev = temp;\ncursor->next = temp;\n```",
      expected:
        "The nullptr check guards against cursor being the last node in the list. If cursor->next is nullptr (cursor is at the end), there is no next node whose prev pointer needs updating, and `cursor->next->prev = temp;` would dereference a null pointer. Removing the check would cause undefined behavior whenever inserting after the last node.",
      criteria: [
        "States the check exists because cursor might be at the end of the list (cursor->next is nullptr)",
        "States without it, cursor->next->prev would dereference a null pointer",
      ],
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#insert-after-cursor-node",
        excerpt:
          "temp->next = cursor->next;\ntemp->prev = cursor;\nif (cursor->next != nullptr) //check if at end of list\ncursor->next->prev = temp;\ncursor->next = temp;",
        citation: "Lecture Deck 03.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/doubly-linked-lists.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-05",
      topicId: "doubly-linked-lists",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What are the three cases `deleteNode` must handle in a doubly linked list?",
      expected:
        "Deletion has three options: (1) deleting the first node, (2) deleting the last node, (3) deleting a node in the middle.",
      criteria: [
        "Lists all three cases: first node, last node, middle node",
        "Doesn't omit or merge any of the three cases",
      ],
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#delete-node-three-options",
        excerpt:
          "Deletion has three options\n1. Deleting the first node\n2. Deleting the last node\n3. Deleting a node in the middle",
        citation: "Lecture Deck 03.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/doubly-linked-lists.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-06",
      topicId: "doubly-linked-lists",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Compare deleting a middle node in a doubly linked list to a singly linked list. Why can `DList::deleteNode`'s middle case splice directly without a search loop?",
      expected:
        "In the middle case: DNode *after = cursor->getNext(); DNode *before = cursor->getPrevious(); before->setNext(after); after->setPrevious(before);. Because each DNode already stores its previous pointer directly, before is available in O(1), with no need to walk from head to find it, unlike a singly linked list's delete, which must loop until previous->getNext() == current.",
      criteria: [
        "Quotes/describes the middle-case splice using getNext()/getPrevious()",
        "Explains previous is already known via cursor->getPrevious(), no search loop needed",
      ],
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#delete-node-function-doubly",
        excerpt:
          "} else { // somewhere in the middle\nDNode *after = cursor->getNext();\nDNode *before = cursor->getPrevious();\nbefore->setNext(after);\nafter->setPrevious(before);\n}",
        citation: "Lecture Deck 03.3",
      },
      extraAtoms: ["#delete-node-function"],
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/doubly-linked-lists.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-07",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Write the List destructor: deallocate every node in the list.",
      // Transcribed verbatim from the lecture slide (also quoted in the
      // "List destructor" card in linked-lists-algorithms.js). Note the slide's
      // version reads cursor->getNext() AFTER deleteNode(cursor) has freed it —
      // see the last criterion.
      expected:
        "List::~List()\n{\n//deallocate all the nodes\nNode *cursor = head;\nwhile(cursor != nullptr){\ndeleteNode(cursor);\ncursor = cursor->getNext();\n}\n}",
      criteria: [
        "Starts a cursor at head and loops while cursor != nullptr",
        "Frees each node on the way through, via deleteNode(cursor)",
        "Advances with cursor = cursor->getNext() so every node is visited",
        "Worth noting: reading cursor->getNext() after deleteNode(cursor) has freed that node is a use-after-free; a safe version saves next (or the doomed node) before deleting",
      ],
      timeBudgetSec: 150,
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-08",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt: "Write `List::outputForward()`: output a doubly linked list from `head` to tail.",
      expected:
        "void List::outputForward() const{\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        cout << cursor->getData() << \" \";\n        cursor = cursor->getNext();\n    }\n    cout << endl;\n}",
      criteria: [
        "Starts the cursor at head",
        "Loops while cursor != nullptr, printing cursor->getData()",
        "Advances with cursor = cursor->getNext()",
        "Marked const, since the traversal doesn't modify the list",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#output-forward",
        excerpt:
          "void List::outputForward() const{\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        cout << cursor->getData() << \" \";\n        cursor = cursor->getNext();\n    }\n    cout << endl;\n}",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-09",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt: "Write `List::outputBackward()`: output a doubly linked list from tail to `head`.",
      expected:
        "void List::outputBackward() const{\n    Node *cursor = tail;\n    while (cursor != nullptr) {\n        cout << cursor->getData() << \" \";\n        cursor = cursor->getPrevious();\n    }\n    cout << endl;\n}",
      criteria: [
        "Starts the cursor at tail, not head",
        "Loops while cursor != nullptr, printing cursor->getData()",
        "Walks backward with cursor = cursor->getPrevious(), only possible because each node stores a previous pointer",
        "Marked const, since the traversal doesn't modify the list",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#output-backward",
        excerpt:
          "void List::outputBackward() const{\n    Node *cursor = tail;\n    while (cursor != nullptr) {\n        cout << cursor->getData() << \" \";\n        cursor = cursor->getPrevious();\n    }\n    cout << endl;\n}",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      extraAtoms: ["#why-doubly-linked-lists"],
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-10",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt: "Write `List::length()`: a function that returns the count of nodes in the list.",
      expected:
        "int List::length() const{\n    int count = 0;\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        count++;\n        cursor = cursor->getNext();\n    }\n    return count;\n} // length",
      criteria: [
        "Initializes count to 0 and cursor to head",
        "Increments count once per node while cursor != nullptr",
        "Advances with cursor = cursor->getNext()",
        "Returns count after the loop: O(n), since every node must be touched",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#list-length-doubly",
        excerpt:
          "int List::length() const{\n    int count = 0;\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        count++;\n        cursor = cursor->getNext();\n    }\n    return count;\n} // length",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-11",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt: "Write `List::clear()`: deallocate every node and leave the list empty.",
      expected:
        "void List::clear(){\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        Node *doomed = cursor;\n        cursor = cursor->getNext();\n        delete doomed;\n    }\n    head = nullptr;\n    tail = nullptr;\n}",
      criteria: [
        "Saves the node to be freed (doomed) before advancing the cursor",
        "Advances cursor = cursor->getNext() BEFORE delete doomed, because reading getNext() off a freed node is undefined behavior",
        "Deletes every node exactly once",
        "Resets both head and tail to nullptr so the emptied list has no dangling pointers",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#list-clear",
        excerpt:
          "void List::clear(){\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        Node *doomed = cursor;\n        cursor = cursor->getNext();\n        delete doomed;\n    }\n    head = nullptr;\n    tail = nullptr;\n}",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-12",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt: "Write `List::copy(const List &source)`: make this list a copy of source.",
      expected:
        "void List::copy(const List &source){\n    clear();\n    Node *cursor = source.head;\n    while (cursor != nullptr) {\n        addToTail(cursor->getData());\n        cursor = cursor->getNext();\n    }\n} // copy",
      criteria: [
        "Calls clear() first so the existing nodes are freed instead of leaked",
        "Walks source with a cursor starting at source.head, not this list's head, which clear() just emptied",
        "Calls addToTail(cursor->getData()) per node so the copy keeps the original order",
        "Deep copy: new nodes are allocated rather than sharing source's pointers",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#list-copy",
        excerpt:
          "void List::copy(const List &source){\n    clear();\n    Node *cursor = source.head;\n    while (cursor != nullptr) {\n        addToTail(cursor->getData());\n        cursor = cursor->getNext();\n    }\n} // copy",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-13",
      topicId: "doubly-linked-lists",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.EXTRACTED,
      prompt: "Write `List::search(const DataType &target)`: return whether target appears in the list.",
      expected:
        "bool List::search(const DataType &target) const{\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        if (cursor->getData() == target) {\n            return true;\n        }\n        cursor = cursor->getNext();\n    }\n    return false;\n} // search",
      criteria: [
        "Traverses with a cursor from head until cursor == nullptr",
        "Returns true as soon as cursor->getData() == target",
        "Returns false after the loop if nothing matched",
        "Takes target by const reference and is marked const",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-03.3-doubly-linked-lists",
        anchor: "#search-doubly",
        excerpt:
          "bool List::search(const DataType &target) const{\n    Node *cursor = head;\n    while (cursor != nullptr) {\n        if (cursor->getData() == target) {\n            return true;\n        }\n        cursor = cursor->getNext();\n    }\n    return false;\n} // search",
        citation:
          "Lecture Deck 03.3 — Doubly Linked Lists",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-mcq-01",
      topicId: "doubly-linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "In the `DNode` class, what are the three private members?\n```\nclass DNode {\nprivate:\n    int data;\n    DNode *next;\n    DNode *previous;\n};\n```",
      choices: [
        "data, next, and previous",
        "data, head, and tail",
        "data and next only",
        "next, previous, and count",
      ],
      answerIndex: 0,
      expected: "data, next, and previous",
      criteria: [
        "A doubly linked node stores its data plus pointers to both its next and previous neighbors.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-mcq-02",
      topicId: "doubly-linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Why does inserting after a `cursor` need four pointer updates instead of two?\n```\ntemp->next = cursor->next;\ntemp->prev = cursor;\nif (cursor->next != nullptr)\n    cursor->next->prev = temp;\ncursor->next = temp;\n```",
      choices: [
        "Because temp's own links and the neighbours' back-links to temp both need setting",
        "Because C++ requires every pointer field in a node to be initialized exactly twice",
        "Because cursor must be duplicated",
        "It doesn't; two updates are always enough",
      ],
      answerIndex: 0,
      expected: "Because temp's own links and the neighbours' back-links to temp both need setting",
      criteria: [
        "A doubly linked insert must wire up temp's next and prev, plus fix up cursor->next and (if it exists) cursor->next's old prev pointer.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-mcq-03",
      topicId: "doubly-linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Why is `if (cursor->next != nullptr)` needed before `cursor->next->prev = temp;`?",
      choices: [
        "It's optional, and skipping it only costs a little performance on long lists",
        "To avoid dereferencing nullptr when cursor is the last node",
        "To decide whether to allocate temp",
        "To check whether the list has more than one node",
      ],
      answerIndex: 1,
      expected: "To avoid dereferencing nullptr when cursor is the last node",
      criteria: [
        "If cursor is the last node, cursor->next is nullptr, and dereferencing it (cursor->next->prev) would be undefined behavior.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "doubly-linked-lists-mcq-04",
      topicId: "doubly-linked-lists",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "When deleting the first node in a doubly linked list, what must happen to the new `head`?\n```\nif (cursor == head) {\n    head = cursor->getNext();\n    if (head != nullptr) {\n        head->setPrevious(nullptr);\n    }\n}\n```",
      choices: [
        "Its next pointer must be cleared to nullptr",
        "Its previous pointer must be set to nullptr",
        "It must be deleted immediately",
        "Nothing; the new head can keep whatever previous pointer it already had",
      ],
      answerIndex: 1,
      expected: "Its previous pointer must be set to nullptr",
      criteria: [
        "After removing the old first node, the new first node's previous must be nullptr since nothing precedes it anymore.",
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
