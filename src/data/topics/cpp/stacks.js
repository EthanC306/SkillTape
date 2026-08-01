// ─────────────────── CS2401 · 05.1 Stacks ───────────────────
// Content authored from Nasseef Abukamail's CS 2401 lecture deck 05.1, "Stacks".
// Text is original; the code snippets are the deck's own.
export default {
  id: "stacks",
  title: "Stacks",
  subtitle: "CS 2401 — LIFO, array and linked-list implementations",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "What a stack is",
      body:
        "A stack is a data structure of **ordered entries** such that entries can only be inserted and removed at one end, called the **top**. Because the last thing you put on is the first thing you take off, a stack is called a Last-In/First-Out data structure, or **LIFO**. It has two main operations: **push** places an item on top of the stack, and **pop** removes an item from the top of the stack.",
    },
    {
      heading: "Underflow and overflow",
      body:
        "Two error conditions come from misusing the two operations. **Stack underflow** is the condition resulting from trying to **pop** an item from an **empty** stack — there is nothing on top to remove. **Stack overflow** is the condition resulting from trying to **push** an item onto a **full** stack — there is no room left on top.",
    },
    {
      heading: "Array implementation of the stack",
      body:
        "A modified container class is used for the stack. The elements are stored in an array of items called **data**, and the variable **top** is the **index** of the array that refers to the top of the stack. Pushing an element means **incrementing top** and storing the item at the top position in the array; popping means returning the element stored at the top position and **decrementing top**. When the stack is empty, top is set to **-1**.",
    },
    {
      heading: "Other useful functions",
      body:
        "Three more functions round out the class. **peek** retrieves the top value of the stack **without popping it** — the item stays on the stack. **isEmpty** returns **true** if the stack is empty. **size** returns the **number of elements** on top of the stack.",
    },
    {
      heading: "Assert",
      body:
        "What should you do if the stack is full, or if something tries to pop from an empty stack? You can use the **assert** utility to generate a **run-time error** when a stack operation can't be completed. It is found in the **cassert** library, and you use it as assert(some condition) — for example, assert(x > 0);. If the condition fails, assert displays an **error message**; if the condition is **true**, assert prints nothing at all.",
    },
    {
      heading: "The array stack class",
      body:
        "Here is the whole array-based class. The array is sized by a constant **CAPACITY**, and the class is a template so the stack works with any Item type. The constructor sets **top = -1**, marking the stack empty, and the two one-line functions read straight off top: **size** returns **top + 1** and **isEmpty** tests **top == -1**. Note that data and top are private.",
      code:
        "const int CAPACITY = 64;\n\ntemplate <typename Item>\nclass Stack {\n  public:\n    Stack() { top = -1; }\n\n    void push(const Item& entry);\n    Item pop();\n    size_t size() const { return top + 1; }\n    bool isEmpty() const { return top == -1; }\n    Item peek() const;\n\n  private:\n    Item data[CAPACITY];\n    int top;\n};",
    },
    {
      heading: "push, array version",
      body:
        "push takes the entry by **const reference** and does exactly what the description said, in that order. The **assert** guards against **overflow** — top must still be below **CAPACITY - 1**, or there is no free slot above it. Then top is **incremented** first, and only after that is the entry stored at data[top].",
      code:
        "template <typename Item>\nvoid Stack<Item>::push(const Item& entry){\n    assert(top < CAPACITY - 1);\n    top++;\n    data[top] = entry;\n}",
    },
    {
      heading: "pop and peek, array version",
      body:
        "Both start with **assert(!isEmpty())**, which is the guard against **underflow**. pop **decrements top first**, so the item it wants is now one slot above the new top — that is why it returns **data[top + 1]**. peek doesn't touch top at all; it just returns **data[top]**, which is why it is declared **const**.",
      code:
        "template <typename Item>\nItem Stack<Item>::pop() {\n    assert(!isEmpty());\n    top--;\n    return data[top + 1];\n}\n\ntemplate <typename Item>\nItem Stack<Item>::peek() const {\n    assert(!isEmpty());\n    return data[top];\n}",
    },
    {
      heading: "Linked list implementation of a stack",
      body:
        "The same stack can store its items in a linked list instead. The top of the stack is the head node, pointed to by **topPtr**, and the stack is empty when topPtr is pointing to **nullptr**. Pushing an item is equivalent to **inserting at the head** of the list, and popping is equivalent to removing the head node. Because the list is built from dynamically allocated nodes, the stack should have a **destructor**, a **copy constructor**, and an **overloaded assignment operator**.",
    },
    {
      heading: "The linked-list stack class",
      body:
        "The public interface is unchanged — push, pop, peek, size, isEmpty — so code using the stack can't tell which implementation is underneath. What changed is the private side: instead of an array and an int index, there is a **Node<Item> pointer** named **topPtr** and a **size_t** counter named **numItems**. size just returns numItems, and isEmpty tests **numItems == 0**.",
      code:
        "template <typename Item>\nclass Stack {\npublic:\n    Stack();\n    size_t size() const { return numItems; }\n    bool isEmpty() const { return numItems == 0; }\n    void push(const Item &entry);\n    Item pop();\n    Item peek() const;\nprivate:\n    Node<Item> *topPtr;\n    size_t numItems;\n};",
    },
    {
      heading: "Constructor and push",
      body:
        "The constructor makes an empty stack by setting **topPtr** to **nullptr** and **numItems** to **0**. push inserts at the beginning of the list: it builds a new node holding the entry whose next pointer is the **old topPtr**, points topPtr at that new node, and **increments numItems**.",
      code:
        "template <typename Item>\nStack<Item>::Stack() {\n    topPtr = nullptr;\n    numItems = 0;\n}\n\ntemplate <typename Item>\nvoid Stack<Item>::push(const Item &entry){\n    // insert at the begining\n    Node<Item> *temp =\n            new Node<Item>(entry, topPtr);\n    topPtr = temp;\n    numItems++;\n}",
    },
    {
      heading: "pop and peek, linked-list version",
      body:
        "pop removes the head node. It saves the address of that node in **delPtr** and its value in topItem, advances topPtr to **topPtr->getNext()**, then **deletes** the old head and **decrements numItems** before returning topItem. peek does far less: it just returns **topPtr->getData()** and leaves the list alone. Both open with **assert(!isEmpty())**.",
      code:
        "template <typename Item>\nItem Stack<Item>::pop() {\n    assert(!isEmpty());\n    Node<Item> *delPtr = topPtr;\n    Item topItem = topPtr->getData();\n    topPtr = topPtr->getNext();\n    delete delPtr;\n    numItems--;\n    return topItem;\n}\n\ntemplate <typename Item>\nItem Stack<Item>::peek() const {\n    assert(!isEmpty());\n    return topPtr->getData();\n}",
    },
  ],
  questions: [
    {
      prompt: "Where can entries be inserted and removed in a stack?",
      choices: [
        "At either end, whichever is closer",
        "Only at one end, called the top",
        "Anywhere in the middle, by index",
        "Only at the bottom of the structure",
      ],
      answer: 1,
      explanation:
        "A stack restricts all access to a single end called the top, which is what makes it a stack rather than a general list.",
    },
    {
      prompt: "You push 3, then 7, then 5 onto an empty stack. What does the next pop return?",
      choices: ["3", "7", "5", "The smallest value, 3"],
      answer: 2,
      explanation:
        "A stack is Last-In/First-Out, so the most recently pushed item, 5, is the first one back off.",
    },
    {
      prompt: "What is stack underflow?",
      choices: [
        "Trying to push an item onto a full stack",
        "Storing an item at a negative array index",
        "Peeking at a stack with only one item on it",
        "Trying to pop an item from an empty stack",
      ],
      answer: 3,
      explanation:
        "Underflow is the empty-stack error: there is no top item left to remove.",
    },
    {
      prompt: "In the array implementation, what is top set to when the stack is empty?",
      choices: ["-1", "0", "CAPACITY", "nullptr"],
      answer: 0,
      explanation:
        "top holds the index of the top element, so an empty stack uses -1, one below the first valid index.",
    },
    {
      prompt: "In the array implementation, what does pushing an element do?",
      choices: [
        "Shifts every element up one position and stores the item at index 0",
        "Increments top and stores the item at the top position in the array",
        "Stores the item at the top position and then increments top",
        "Stores the item at index 0 and leaves top unchanged",
      ],
      answer: 1,
      explanation:
        "top is incremented first so it names a free slot, and the entry is then written at that new top position.",
    },
    {
      prompt: "What is this assert protecting against?",
      code: "template <typename Item>\nvoid Stack<Item>::push(const Item& entry){\n    assert(top < CAPACITY - 1);\n    top++;\n    data[top] = entry;\n}",
      choices: [
        "Underflow — popping from an empty stack",
        "Pushing an item of the wrong type",
        "Overflow — pushing onto a full stack",
        "A null pointer being stored in data",
      ],
      answer: 2,
      explanation:
        "If top has already reached the last index, incrementing it would run past the array, which is the overflow condition.",
    },
    {
      prompt: "Why does size return top + 1?",
      code: "size_t size() const { return top + 1; }\nbool isEmpty() const { return top == -1; }",
      choices: [
        "One slot in data is always reserved and never used",
        "It counts the top element twice on purpose",
        "The array is one element longer than CAPACITY",
        "top is an index starting at 0, and an empty stack's top of -1 gives a size of 0",
      ],
      answer: 3,
      explanation:
        "Converting the zero-based index of the top element to a count means adding one, and that also makes the empty case come out as 0.",
    },
    {
      prompt: "Why does this pop return data[top + 1] instead of data[top]?",
      code: "template <typename Item>\nItem Stack<Item>::pop() {\n    assert(!isEmpty());\n    top--;\n    return data[top + 1];\n}",
      choices: [
        "top was already decremented, so the popped item now sits one slot above it",
        "The top element is always stored one past the index in top",
        "It is returning the item underneath the one being removed",
        "Arrays in C++ are indexed starting at 1",
      ],
      answer: 0,
      explanation:
        "The decrement happens first, so top + 1 is the slot that held the item being removed.",
    },
    {
      prompt: "What is the difference between peek and pop?",
      choices: [
        "peek returns the bottom item; pop returns the top item",
        "peek retrieves the top value without removing it; pop removes it",
        "peek works only on empty stacks; pop works only on full ones",
        "There is none — peek is just another name for pop",
      ],
      answer: 1,
      explanation:
        "peek is the read-only look at the top of the stack, which is why it is declared const and leaves top unchanged.",
    },
    {
      prompt: "What does assert do when its condition is true?",
      choices: [
        "It prints a confirmation message",
        "It stops the program normally",
        "It prints nothing at all",
        "It returns the value of the condition",
      ],
      answer: 2,
      explanation:
        "assert is silent on success and only speaks up — with an error message at run time — when the condition fails.",
    },
    {
      prompt: "In the linked list implementation, what marks an empty stack?",
      choices: [
        "topPtr is pointing to nullptr",
        "topPtr is set to -1",
        "numItems is set to CAPACITY",
        "The head node holds a zero value",
      ],
      answer: 0,
      explanation:
        "The top of the stack is the head node, so an empty stack is one whose head pointer points nowhere.",
    },
    {
      prompt: "What list operation is this push performing?",
      code: "template <typename Item>\nvoid Stack<Item>::push(const Item &entry){\n    // insert at the begining\n    Node<Item> *temp =\n            new Node<Item>(entry, topPtr);\n    topPtr = temp;\n    numItems++;\n}",
      choices: [
        "Inserting after the head node",
        "Appending to the tail of the list",
        "Replacing the value in the head node",
        "Inserting at the head of the list",
      ],
      answer: 3,
      explanation:
        "The new node's next pointer is the old topPtr and topPtr is then moved to the new node, which is insertion at the head.",
    },
    {
      prompt: "Why does pop save topPtr in delPtr before advancing it?",
      code: "Node<Item> *delPtr = topPtr;\nItem topItem = topPtr->getData();\ntopPtr = topPtr->getNext();\ndelete delPtr;\nnumItems--;\nreturn topItem;",
      choices: [
        "delPtr is needed to decrement numItems correctly",
        "Once topPtr moves to the next node, the old head's address would otherwise be lost and could not be deleted",
        "delete cannot be called on a pointer named topPtr",
        "It makes a copy of the whole list before removing anything",
      ],
      answer: 1,
      explanation:
        "The removed node still has to be deleted, so its address must be kept somewhere before topPtr is reassigned.",
    },
    {
      prompt: "Why should the linked list stack have a destructor, a copy constructor, and an overloaded assignment operator?",
      choices: [
        "Templates require all three to compile",
        "They are needed to make size and isEmpty run in constant time",
        "It manages dynamically allocated nodes, which the compiler's defaults do not handle correctly",
        "Only classes with a private section need them",
      ],
      answer: 2,
      explanation:
        "The stack owns heap-allocated nodes, so copying and destroying it has to be defined explicitly rather than left to the default member-by-member behavior.",
    },
  ],
};
