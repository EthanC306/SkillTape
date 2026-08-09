// ─────────────────── c++ · 05.2 Queues ───────────────────
// Text is original; the code snippets are the deck's own.
import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "queues",
  title: "Queues",
  subtitle: "FIFO, circular array implementation",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): default — not covered by the
  // diagnostic quiz or self-reported struggle list, not "known easy."
  examWeight: 1.0,
  cards: [
    {
      heading: "What a queue is",
      body:
        "A queue is a data structure of ordered entries such that entries can only be inserted at one end, called the **rear**, and removed at the other end, called the **front**. Because the earliest thing put in is the first thing taken out, a queue is called a **First-In/First-Out** data structure, or **FIFO**. Items are taken out of the queue in the **same order** that they were put in.",
    },
    {
      heading: "Queue operations",
      body:
        "The operation to insert at the rear of the queue is called push, **enqueue**, or insert. The operation to remove from the front of the queue is called pop, **dequeue**, or remove. **Queue overflow** is the condition resulting from attempting to add an entry to a full queue. **Queue underflow** is the condition resulting from attempting to remove an entry from an empty queue.",
    },
    {
      heading: "Why an array queue needs to be circular",
      body:
        "A plain array implementation has to track both **front** and **rear** indices, but the rear doesn't always mean the **end of the array**, and the rear index isn't always **higher** than the front. If the queue is currently using elements 2 through CAPACITY - 1 and a new item needs to be inserted, slots **0 and 1** may already be free even though the high end is full — the fix is to treat the array as a **circular array** and wrap the index back around.",
    },
    {
      heading: "Circular array bookkeeping",
      body:
        "The number of items in the queue is stored in **numItems**. For a non-empty queue, the items sit in a circular array beginning at **data[front]** and continuing through **data[rear]**. The array's total capacity is **CAPACITY**. For an **empty queue**, rear still holds some valid index, and front is always equal to **nextIndex(rear)**.",
    },
    {
      heading: "The array queue class",
      body:
        "data[CAPACITY] holds the elements, and front, rear, and numItems are size_t indices and a counter. A private helper, **nextIndex**, wraps an index around the array: it returns **(index + 1) % CAPACITY**. The public interface offers push, pop, peek, **size** — which just returns numItems — and **isEmpty**, which tests **numItems == 0**.",
      code:
        "const int CAPACITY = 30;\ntemplate <typename Item>\nclass Queue {\nprivate:\n    Item data[CAPACITY]; // Partially-filled array\n    size_t front;        // Index of item at front of the queue\n    size_t rear;         // Index of item at rear of the queue\n    size_t numItems;     // Total number of items in the queue\n\n    size_t nextIndex(size_t index) const{\n        return (index + 1) % CAPACITY;\n    }\n\npublic:\n    Queue();\n    void push(const Item& entry);\n    Item pop();\n    Item peek();\n    size_t size() const { return numItems; }\n    bool isEmpty() const {\n        return (numItems == 0);\n    }\n};",
    },
    {
      heading: "Constructor",
      body:
        "The constructor starts the queue empty without writing to data at all. It sets **numItems** to **0**, **front** to **0**, and **rear** to **CAPACITY - 1** — one slot before index 0, so the very first push lands at index 0 after wrapping.",
      code:
        "template <class Item>\nQueue<Item>::Queue( )\n{\n    numItems = 0;\n    front = 0;\n    rear = CAPACITY - 1;\n}",
    },
    {
      heading: "push, array version",
      body:
        "push first **asserts** that numItems is less than CAPACITY, which guards against **overflow**. It then advances **rear** to **nextIndex(rear)** before writing anything, stores the entry at **data[rear]**, and **increments numItems**. Advancing rear before writing is exactly what makes the first-ever push land at index 0.",
      code:
        "template <class Item>\nvoid Queue<Item>::push(const Item& entry)\n{\n    assert(numItems < CAPACITY);\n    rear = nextIndex(rear);\n    data[rear] = entry;\n    numItems++;\n}",
    },
    {
      heading: "pop, array version",
      body:
        "pop **asserts** the queue is not empty, which guards against **underflow**. It saves **data[front]** as removedItem before touching anything else, advances **front** to **nextIndex(front)**, **decrements numItems**, and finally returns the saved item.",
      code:
        "Item Queue<Item>::pop( )\n{\n    assert(!isEmpty( ));\n    Item removedItem = data[front];\n    front = nextIndex(front);\n    numItems--;\n    return removedItem;\n}",
    },
    {
      heading: "peek",
      body:
        "peek also **asserts** the queue isn't empty, then simply returns **data[front]** without changing front, rear, or numItems — the item stays on the queue, exactly like **peek** does on a stack.",
      code:
        "template <class Item>\nItem Queue<Item>::peek( )\n{\n    assert(!isEmpty( ));\n    return data[front];\n}",
    },
    {
      heading: "Linked list implementation",
      body:
        "A queue can also be built on a **linked list**, still tracking numItems. The front of the queue is the **head node**, and the rear of the queue is the **final node**. The member variable **frontPtr** is the head pointer of the list, and for a non-empty queue **rearPtr** is the tail pointer. Unlike the stack's linked-list version, the full linked-list queue code is left as an **exercise**.",
    },
  ],
  questions: [
    {
      prompt: "Where can entries be inserted and removed in a queue?",
      choices: [
        "At the rear for insertion, at the front for removal",
        "Only at one end, called the front, for both operations",
        "Anywhere, since order doesn't matter",
        "Only at the rear, for both operations",
      ],
      answer: 0,
      explanation:
        "A queue restricts insertion to the rear and removal to the front, which is what makes it FIFO rather than a stack.",
    },
    {
      prompt: "You enqueue 3, then 7, then 5 onto an empty queue. What does the next dequeue return?",
      choices: ["The largest value, 7", "5", "7", "3"],
      answer: 3,
      explanation:
        "A queue is First-In/First-Out, so the earliest item pushed, 3, is the first one back off.",
    },
    {
      prompt: "What is queue overflow?",
      choices: [
        "Trying to add an entry to a full queue",
        "Trying to remove an entry from an empty queue",
        "Storing an item at a negative array index",
        "Peeking at a queue with one item on it",
      ],
      answer: 0,
      explanation:
        "Overflow is the full-queue error: there is no room left to insert another entry.",
    },
    {
      prompt: "What is queue underflow?",
      choices: [
        "Trying to add an entry to a full queue",
        "Overwriting the front pointer",
        "Enqueuing a null item",
        "Trying to remove an entry from an empty queue",
      ],
      answer: 3,
      explanation:
        "Underflow is the empty-queue error: there is no front item left to remove.",
    },
    {
      prompt: "Why can't a plain array implementation just treat the last array index as a fixed rear boundary?",
      choices: [
        "Because rear must always be lower than front",
        "Because the rear doesn't always mean the end of the array, and the front can drift past a fixed high boundary as items are removed",
        "Because arrays can't hold more than CAPACITY - 1 items",
        "Because C++ arrays don't support indexing past element 0",
      ],
      answer: 1,
      explanation:
        "As items are pushed and popped, the occupied range can wrap around, so treating the array's last index as a hard boundary wastes freed slots at the low end.",
    },
    {
      prompt: "What does nextIndex do?",
      code:
        "size_t nextIndex(size_t index) const{\n    return (index + 1) % CAPACITY;\n}",
      choices: [
        "Returns index - 1, wrapping at 0",
        "Doubles the capacity of the array",
        "Returns (index + 1) % CAPACITY, wrapping past the last slot back to 0",
        "Always returns 0",
      ],
      answer: 2,
      explanation:
        "The modulo by CAPACITY is what turns a plain array into a circular one, sending index CAPACITY - 1 back to 0.",
    },
    {
      prompt: "For an empty queue, what is true of front and rear?",
      choices: [
        "rear holds some valid index, and front equals nextIndex(rear)",
        "front is always 0 and rear is always CAPACITY - 1",
        "Both front and rear are set to -1",
        "front is always greater than rear",
      ],
      answer: 0,
      explanation:
        "The empty-queue invariant is that front sits exactly one slot ahead of rear, i.e. front == nextIndex(rear), whatever valid index rear happens to hold.",
    },
    {
      prompt: "Why does the constructor set rear to CAPACITY - 1 instead of 0?",
      code:
        "template <class Item>\nQueue<Item>::Queue( )\n{\n    numItems = 0;\n    front = 0;\n    rear = CAPACITY - 1;\n}",
      choices: [
        "0, so the first push writes to data[0] directly",
        "CAPACITY, one past the last valid index",
        "-1, matching the stack's empty convention",
        "CAPACITY - 1, so nextIndex(rear) makes the first push land at index 0",
      ],
      answer: 3,
      explanation:
        "push always advances rear with nextIndex before writing, so starting rear one slot behind index 0 is what makes the first push actually land at index 0.",
    },
    {
      prompt: "What is this assert protecting against?",
      code:
        "template <class Item>\nvoid Queue<Item>::push(const Item& entry)\n{\n    assert(numItems < CAPACITY);\n    rear = nextIndex(rear);\n    data[rear] = entry;\n    numItems++;\n}",
      choices: [
        "A null pointer being stored in data",
        "Overflow — pushing onto a full queue",
        "Enqueuing an item of the wrong type",
        "Underflow — popping from an empty queue",
      ],
      answer: 1,
      explanation:
        "If numItems has already reached CAPACITY, there is no free slot left, which is the overflow condition the assert catches.",
    },
    {
      prompt: "Why does push advance rear before writing the entry?",
      code:
        "rear = nextIndex(rear);\ndata[rear] = entry;\nnumItems++;",
      choices: [
        "So the very first push, right after construction, lands at index 0, since rear starts at CAPACITY - 1",
        "So data[rear] is always one slot behind the item actually stored",
        "It doesn't matter; writing first would work identically",
        "So old items get overwritten immediately",
      ],
      answer: 0,
      explanation:
        "Because the constructor leaves rear at CAPACITY - 1, advancing it first is what produces index 0 on the first call, matching front's starting value of 0.",
    },
    {
      prompt: "What does this pop return?",
      code:
        "Item removedItem = data[front];\nfront = nextIndex(front);\nnumItems--;\nreturn removedItem;",
      choices: [
        "data[rear], the most recently pushed item",
        "numItems, the current size of the queue",
        "The value saved from data[front] before front was advanced",
        "data[front] after front has already moved forward",
      ],
      answer: 2,
      explanation:
        "removedItem is read from data[front] first, before front is advanced, so it holds the item that was actually at the front.",
    },
    {
      prompt: "What is the difference between peek and pop on this queue?",
      choices: [
        "peek returns the item at the front without removing it; pop removes it",
        "peek works only on array queues; pop works only on linked queues",
        "There is no difference",
        "peek removes the front item; pop only looks at it",
      ],
      answer: 0,
      explanation:
        "peek reads data[front] and changes nothing, while pop also advances front and decrements numItems.",
    },
    {
      prompt: "In the linked list implementation, which node is the rear of the queue?",
      choices: [
        "The head node",
        "There is no rear node; only front matters",
        "Whichever node rearPtr last visited, not necessarily the tail",
        "The final node in the list",
      ],
      answer: 3,
      explanation:
        "The rear of the queue is stored at the final node of the linked list, mirroring how the front is stored at the head node.",
    },
    {
      prompt: "What do frontPtr and rearPtr point to in the linked-list queue?",
      choices: [
        "frontPtr is an index, not a pointer",
        "frontPtr is the head pointer; rearPtr is the tail pointer, for a non-empty queue",
        "Both point to the same node at all times",
        "rearPtr is only used when the queue is empty",
      ],
      answer: 1,
      explanation:
        "frontPtr is the linked list's head pointer, and rearPtr is its tail pointer whenever the queue holds at least one item.",
    },
  ],
  items: [
    makeItem({
      id: "queues-01",
      topicId: "queues",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is a queue, and what are Queue Overflow and Queue Underflow?",
      expected:
        "A queue is a data structure of ordered entries such that entries can only be inserted at one end (the rear) and removed at the other end (the front) — it's called a First-In/First-Out (FIFO) data structure, since items come out in the same order they were put in. Queue Overflow is the condition resulting from attempting to add an entry to a full queue. Queue Underflow is the condition resulting from attempting to remove an entry from an empty queue.",
      criteria: [
        "States entries are inserted at the rear and removed at the front, and describes FIFO",
        "Defines Overflow as adding to a full queue",
        "Defines Underflow as removing from an empty queue",
      ],
      provenance: {
        sourceId: "cpp-slides-05.2-queues",
        anchor: "#what-a-queue-is",
        excerpt:
          "A queue is a data structure of ordered entries such that entries can only be inserted at one end (called the rear) and removed at the other end (called the front)\n- The queue is called a First-In/First-Out (FIFO) data structure.\n- Items are taken out of the queue in the same order that they were put into the queue\n- Queue overflow: Attempting to add an entry to a full queue.\n- Queue Underflow: Attempting to remove an entry from an empty queue.",
        citation: "Lecture Deck 05.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-02",
        promptedFrom: "sources/cpp/queues.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-02",
      topicId: "queues",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "In the circular array implementation, what do front, rear, and numItems represent, and what is true of front and rear when the queue is empty?",
      expected:
        "numItems stores the number of items in the queue. For a non-empty queue, the items are stored in a circular array beginning at data[front] and continuing through data[rear]; CAPACITY is the array's total capacity. For an empty queue, rear is some valid index, and front is always equal to nextIndex(rear).",
      criteria: [
        "States items run from data[front] through data[rear] in a circular array",
        "States that for an empty queue, front equals nextIndex(rear)",
      ],
      provenance: {
        sourceId: "cpp-slides-05.2-queues",
        anchor: "#array-implementation-concept",
        excerpt:
          "The number of items in the queue is stored in the member variable numItems.\n- For a non-empty queue, the items are stored in a circular array beginning at data[front] and continuing through data[rear].\n- The total capacity of the queue is CAPACITY.\n- For an empty queue, rear is some valid index, and the front is always equal to nextIndex(rear).",
        citation: "Lecture Deck 05.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-02",
        promptedFrom: "sources/cpp/queues.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-03",
      topicId: "queues",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write the array-based push function, given `Item data[CAPACITY]; size_t front, rear, numItems;` and a `nextIndex` helper.",
      expected:
        "template <class Item>\nvoid Queue<Item>::push(const Item& entry)\n{\nassert(numItems < CAPACITY);\nrear = nextIndex(rear);\ndata[rear] = entry;\nnumItems++;\n}",
      criteria: [
        "Uses assert to check numItems < CAPACITY before pushing (guards against overflow)",
        "Advances rear with nextIndex(rear) before storing entry at data[rear]",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-05.2-queues",
        anchor: "#array-queue-push",
        excerpt:
          "template <class Item>\nvoid Queue<Item>::push(const Item& entry)\n{\nassert(numItems < CAPACITY);\nrear = nextIndex(rear);\ndata[rear] = entry;\nnumItems++;\n}",
        citation: "Lecture Deck 05.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-02",
        promptedFrom: "sources/cpp/queues.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-04",
      topicId: "queues",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What does the nextIndex helper do, and why does the array implementation need it?",
      expected:
        "nextIndex(size_t index) returns (index + 1) % CAPACITY. It's needed because the rear doesn't always mean the end of the array and the rear index isn't always higher than the front — the queue is stored in a circular array, so advancing past the last slot has to wrap back around to index 0 instead of running off the array.",
      criteria: [
        "States nextIndex returns (index + 1) % CAPACITY",
        "Explains it exists so the array can wrap around (circular array) instead of treating the last index as a hard boundary",
      ],
      provenance: {
        sourceId: "cpp-slides-05.2-queues",
        anchor: "#circular-array-concept",
        excerpt:
          "- Does the rear always mean the end of the array? Is the rear index always higher than the front index?\n- If the queue is currently using elements 2 to the CAPACITY-1, what should happen if a new item is to be inserted?\n- Circular array.\nsize_t nextIndex(size_t index) const{\nreturn (index + 1) % CAPACITY;\n}",
        citation: "Lecture Deck 05.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-02",
        promptedFrom: "sources/cpp/queues.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-05",
      topicId: "queues",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "How does the front/rear relationship in the array-based queue differ from front/rear in the linked-list-based queue?",
      expected:
        "In the array implementation, front and rear are indices into a circular array, and for an empty queue front equals nextIndex(rear). In the linked-list implementation, front and rear are pointers (frontPtr and rearPtr): frontPtr is the head pointer of the list, and rearPtr is the tail pointer for a non-empty queue — the front of the queue is the head node and the rear is the final node.",
      criteria: [
        "States array front/rear are circular-array indices with front == nextIndex(rear) when empty",
        "States linked-list front/rear are frontPtr (head) and rearPtr (tail) pointers",
      ],
      provenance: {
        sourceId: "cpp-slides-05.2-queues",
        anchor: "#linked-list-implementation-concept",
        excerpt:
          "- The items in the queue are stored in a linked list, with front of the queue stored at the head node, and the rear of the queue stored at the final node.\n- The member variable frontPtr is the head pointer of the linked list of items. For a non-empty queue, the member variable rearPtr is the tail pointer of the linked list",
        citation: "Lecture Deck 05.2",
      },
      extraAtoms: ["#array-implementation-concept"],
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-02",
        promptedFrom: "sources/cpp/queues.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-06",
      topicId: "queues",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace this array-based queue pop() call:\n```\nItem Queue<Item>::pop( )\n{\nassert(!isEmpty( ));\nItem removedItem = data[front];\nfront = nextIndex(front);\nnumItems--;\nreturn removedItem;\n}\n```\nWhat happens to front, and what is returned?",
      expected:
        "removedItem is read from data[front] before front changes. front is then advanced to nextIndex(front), wrapping around the array if needed. numItems is decremented, and removedItem — the value that was at the old front — is returned.",
      criteria: [
        "States removedItem is captured from data[front] before front is advanced",
        "States front moves to nextIndex(front) and the value returned is the old front item",
      ],
      provenance: {
        sourceId: "cpp-slides-05.2-queues",
        anchor: "#array-queue-pop",
        excerpt:
          "Item Queue<Item>::pop( )\n{\nassert(!isEmpty( ));\nItem removedItem = data[front];\nfront = nextIndex(front);\nnumItems--;\nreturn removedItem;\n}",
        citation: "Lecture Deck 05.2",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-02",
        promptedFrom: "sources/cpp/queues.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-mcq-01",
      topicId: "queues",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Where can entries be inserted and removed in a queue?",
      choices: [
        "At the rear for insertion, at the front for removal",
        "Only at one end, called the front, for both operations",
        "Anywhere, since order doesn't matter",
        "Only at the rear, for both operations",
      ],
      answerIndex: 0,
      expected: "At the rear for insertion, at the front for removal",
      criteria: [
        "A queue restricts insertion to the rear and removal to the front, which is what makes it FIFO rather than a stack.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-mcq-02",
      topicId: "queues",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "You enqueue 3, then 7, then 5 onto an empty queue. What does the next dequeue return?",
      choices: [
        "The largest value, 7",
        "5",
        "7",
        "3",
      ],
      answerIndex: 3,
      expected: "3",
      criteria: [
        "A queue is First-In/First-Out, so the earliest item pushed, 3, is the first one back off.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-mcq-03",
      topicId: "queues",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Why can't a plain array implementation just treat the last array index as a fixed rear boundary?",
      choices: [
        "Because rear must always be lower than front",
        "Because the rear doesn't always mean the end of the array, and the front can drift past a fixed high boundary as items are removed",
        "Because arrays can't hold more than CAPACITY - 1 items",
        "Because C++ arrays don't support indexing past element 0",
      ],
      answerIndex: 1,
      expected: "Because the rear doesn't always mean the end of the array, and the front can drift past a fixed high boundary as items are removed",
      criteria: [
        "As items are pushed and popped, the occupied range can wrap around, so treating the array's last index as a hard boundary wastes freed slots at the low end.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "queues-mcq-04",
      topicId: "queues",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Why does the constructor set rear to CAPACITY - 1 instead of 0?\n```\ntemplate <class Item>\nQueue<Item>::Queue( )\n{\n    numItems = 0;\n    front = 0;\n    rear = CAPACITY - 1;\n}\n```",
      choices: [
        "0, so the first push writes to data[0] directly",
        "CAPACITY, one past the last valid index",
        "-1, matching the stack's empty convention",
        "CAPACITY - 1, so nextIndex(rear) makes the first push land at index 0",
      ],
      answerIndex: 3,
      expected: "CAPACITY - 1, so nextIndex(rear) makes the first push land at index 0",
      criteria: [
        "push always advances rear with nextIndex before writing, so starting rear one slot behind index 0 is what makes the first push actually land at index 0.",
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
