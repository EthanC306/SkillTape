export default {
  id: "containers",
  title: "Container Classes",
  subtitle: "CS 2401 — the Bag class & STL",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "What a container class is",
      body:
        "A **container class** is a class whose objects hold a **collection of items** — many values bundled into one object. You've already used one: a **vector** is a container class. A **sequence class** is a container whose elements are kept in a set **order**, such as sorted. The container's whole job is to store the items and give you safe ways to add, find, and remove them.",
    },
    {
      heading: "Designing a container",
      body:
        "To design a container, you plan a few pieces. You need a **data structure** to hold the items (here, an array), a variable to **track how many** are stored, and a **constant for the capacity** — the most it can ever hold. Then you add **member functions** to do the work: a **constructor** to start it empty, **insert** to add a value, **erase** to remove one, **eraseAll** to remove every match, and **size** to report how many it holds.",
    },
    {
      heading: "The Bag class: its data",
      body:
        "Our example container is a **Bag** of integers, built on a fixed-size **static array**. The largest number of items it can hold is kept in a **static const** named **CAPACITY**. Its private data is just two fields: **int data[CAPACITY];** for the values and **size_t used;** for how many slots are currently filled. Code outside the bag never touches these fields directly — it goes through the bag's functions.",
    },
    {
      heading: "size_t, typedef, and using",
      body:
        "What is **size_t**? It's an **unsigned integer** type (it can't be negative), used for sizes and counts. It's defined with **typedef**, a keyword that gives an existing type a second name: **typedef int Integer;** lets you write Integer in place of int. Modern C++ does the same job with **using**: **using Integer = int;**. Both just create an **alias** — a nickname for a type, not a brand-new type.",
    },
    {
      heading: "The Bag's public interface",
      body:
        "The **public** interface is the list of things you can ask a bag to do. **Bag()** is the **constructor**; it starts the bag empty. **size()** returns how many values are stored and is marked **const** because it only reads. **insert(value)** adds a value and returns **false** if the bag is already full. **operator +=** pours another bag's contents into this one without going over CAPACITY.",
    },
    {
      heading: "Removing items: erase vs eraseAll",
      body:
        "Two functions take values out. **erase(target)** removes **one** copy of target and returns **true** if it actually found and removed it. **eraseAll(target)** removes **every** copy that matches. Both return a **bool** so the caller can tell whether anything was removed — useful when the value might not be in the bag at all.",
    },
    {
      heading: "Printing a bag with operator<<",
      body:
        "To print a bag as **[1, 2, 3]**, the class overloads **operator <<**. It's declared a **friend** so it can read the bag's private data while still being used as a normal out << bag call. A friend function is **not a member** of the class, but the class gives it permission to see inside. This is the standard way to make your own type printable with cout.",
    },
    {
      heading: "STL containers you get for free",
      body:
        "You rarely build containers by hand — the **Standard Template Library (STL)** ships ready-made ones. **vector** acts like a **dynamic array** that grows as needed. **set** stores **unique, sorted** elements: no duplicates, and you can't change an element in place. **multiset** also keeps elements **ordered** but **allows duplicates**. Pick the one whose rules fit the data you're storing.",
    },
    {
      heading: "Full example: the Bag class",
      body:
        "Here's a complete, working implementation of the Bag class from this lesson, including a small main() that exercises insert() and erase().",
      code:
        "#include <cstdlib>\n#include <iomanip>\n#include <iostream>\n#include <fstream>\n\nusing namespace std;\n\nclass Bag\n{\n\npublic:\n    static const size_t CAPACITY = 1000;\n    Bag();\n\n    size_t size() const;\n    bool insert(const int value);\n    bool erase(const int target);\n    bool eraseAll(const int target);\n    void operator+=(const Bag &otherBag);\n    friend ostream& operator <<(ostream &out, const Bag &b);\n\nprivate:\n    int data[CAPACITY];\n    size_t used;\n};\n\n\n\n\nint main(){\n\n    Bag b1;\n    b1.insert(10);\n    b1.insert(20);\n    b1.insert(20);\n    b1.insert(20);\n\n    cout << \"b1: \" << b1 << endl;\n    //return 0;\n    cout << \"After erasing 10\" << endl;\n    if(b1.erase(10)){\n        cout << \"10 was removed from the bag\" << endl;\n    }\n    else{\n        cout << \"10 was not found in the bag\" << endl;\n    }\n\n        cout << \"b1: \" << b1 << endl;\n\n        if(b1.insert(45)){\n            cout << \"45 was added to the bag\" << endl;\n        }else{\n            cout << \"Could not add 45\" << endl;\n        }\n        cout << \"b1: \" << b1 << endl;\n\n    \n    return 0;\n}\n\n\n//FUNCTION DEFINITIONS\nBag::Bag()\n{\n    used = 0;\n}\n\nsize_t Bag::size() const\n{\n    return used;\n}\n\nbool Bag::insert(const int value)\n{\n    if (used < CAPACITY)\n    {\n        data[used] = value;\n            used++;\n        return true;\n    }\n    return false;\n}\n\nbool Bag::erase(const int target)\n{\n    for (size_t i = 0; i < used; i++)\n    {\n        used--;\n        data[i] = data[used]; //Move the last element into the value we removed\n        return true;\n    }\n    return false;\n}\n\nbool Bag::eraseAll(const int target){\n    size_t originalSize = used;\n    size_t i = 0;\n    //Search for each element one at a time untl i and used are equal\n    while(i < used)\n    {\n        if(target == data[i])\n        {\n            used--;\n            data[i] = data[used];\n        }\n        else{\n            i++;\n        }\n    }\n\n    return used < originalSize;\n}\n\nvoid Bag::operator +=(const Bag &otherBag){\n    if(used + otherBag.used <= CAPACITY) \n    {\n        for(size_t i = 0; i < otherBag.used; i ++)\n        {\n            insert(otherBag.data[i]);\n        }\n    }\n}\n\nostream& operator <<(ostream &out, const Bag &b){\n    out << \"[\";\n    if (b.used > 0)\n    {\n        out << b.data[0];\n    }\n    \n    for (size_t i = 1; i < b.used; i++)\n    {\n        out << \", \" << b.data[i];\n    }\n    out << \"]\";\n    return out;\n}",
    },
  ],
  questions: [
    {
      prompt: "What is a container class?",
      choices: [
        "A class whose objects hold a collection of items",
        "A function that sorts data",
        "A special kind of loop",
        "A header file",
      ],
      answer: 0,
      explanation:
        "A container class is a class whose objects store a collection of items — a vector is a familiar example.",
    },
    {
      prompt: "Which of these is a container class you've already used?",
      choices: ["int", "vector", "if", "cout"],
      answer: 1,
      explanation:
        "A vector is a container class — it bundles a collection of elements into one object.",
    },
    {
      prompt: "What makes a sequence class different from a plain container?",
      choices: [
        "Its elements are kept in a set order",
        "It can only hold integers",
        "It has no capacity limit",
        "Its items cannot be erased",
      ],
      answer: 0,
      explanation:
        "A sequence class keeps its elements in a defined order (for example, sorted).",
    },
    {
      prompt: "In the Bag class, what does `used` track?",
      code: "int data[CAPACITY];\nsize_t used;",
      choices: [
        "The maximum capacity",
        "How many values are currently stored",
        "The largest value in the bag",
        "The array's memory address",
      ],
      answer: 1,
      explanation:
        "used counts how many slots are currently filled. CAPACITY is the fixed maximum.",
    },
    {
      prompt: "What is CAPACITY in the Bag class?",
      choices: [
        "A static constant for the most items the bag can hold",
        "The current number of items",
        "A member function",
        "A loop counter",
      ],
      answer: 0,
      explanation:
        "CAPACITY is a static const giving the largest number of items the fixed array can store.",
    },
    {
      prompt: "What kind of type is size_t?",
      choices: [
        "A signed integer",
        "An unsigned integer used for sizes and counts",
        "A floating-point type",
        "A container class",
      ],
      answer: 1,
      explanation:
        "size_t is an unsigned integer type (never negative), used for sizes and counts.",
    },
    {
      prompt: "What does this line do?",
      code: "typedef int Integer;",
      choices: [
        "Creates a new name (alias) for int",
        "Converts an Integer into an int",
        "Declares a variable named Integer",
        "Defines a new class",
      ],
      answer: 0,
      explanation:
        "typedef gives an existing type a second name. After this, Integer means int.",
    },
    {
      prompt: "Which line is the modern equivalent of `typedef int Integer;`?",
      choices: [
        "using Integer = int;",
        "int = Integer;",
        "alias Integer int;",
        "#define Integer int",
      ],
      answer: 0,
      explanation:
        "using Integer = int; creates the same alias as the typedef, in modern C++ style.",
    },
    {
      prompt: "Why is size() marked const?",
      code: "size_t size() const;",
      choices: [
        "It only reads the bag and never changes it",
        "It runs faster",
        "It always returns a constant value",
        "It can only be called once",
      ],
      answer: 0,
      explanation:
        "const promises the function won't modify the object — size() just reports how many items are stored.",
    },
    {
      prompt: "What's the difference between erase and eraseAll?",
      choices: [
        "erase removes one matching value; eraseAll removes every match",
        "erase is simply the faster version",
        "eraseAll only works on sorted bags",
        "There is no real difference",
      ],
      answer: 0,
      explanation:
        "erase deletes a single copy of the target; eraseAll deletes every copy that matches.",
    },
    {
      prompt: "Why is operator<< declared a friend of the Bag class?",
      choices: [
        "So it can read the bag's private data",
        "So it runs automatically at startup",
        "Because it is a member function",
        "To make it const",
      ],
      answer: 0,
      explanation:
        "operator<< isn't a member, so it's made a friend — that lets it read the bag's private data while still being called as out << bag.",
    },
    {
      prompt: "Which STL container stores unique, sorted elements?",
      choices: ["vector", "set", "multiset", "array"],
      answer: 1,
      explanation:
        "set holds unique, sorted elements. multiset is sorted too but allows duplicates; vector is an unordered dynamic array.",
    },
    {
      prompt: "What does insert return when the bag is already full?",
      choices: ["true", "false", "the current size", "nothing"],
      answer: 1,
      explanation:
        "insert returns false when CAPACITY is reached, so the caller knows the value wasn't added.",
    },
  ],
};
