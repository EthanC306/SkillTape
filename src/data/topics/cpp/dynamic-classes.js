import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "dynamic-classes",
  title: "Dynamic Memory with Classes & Structures",
  subtitle: "Destructors, copy constructors & operator=",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): provisional, see dynamic-alloc.js
  // for the methodology note. Self-reported struggle area; not yet confirmed
  // by a diagnostic question (the quiz didn't reach the rule-of-three items).
  examWeight: 1.5,
  cards: [
    {
      heading: "Why classes need destructors",
      body:
        "When an object with dynamically allocated memory **goes out of scope**, that memory doesn't free itself. Classes automate the cleanup with a **destructor** — a member function C++ calls **automatically** whenever the object is destroyed, so you don't have to remember to delete anything by hand.",
    },
    {
      heading: "Writing a destructor",
      body:
        "A destructor's name is a **tilde (~) followed by the class name** — ~MyString(). It takes **no parameters and returns no value**, and a class can have **only one**. Its body usually just calls delete (or delete[]) on whatever the class allocated with new.",
    },
    {
      heading: "The MyString example",
      body:
        "MyString wraps a **dynamically allocated c-string**. Its private data is just char *str; (a pointer to the array) and int maxLength; (the declared max length). Its public interface includes constructors, a destructor, setString, getString, length, at, and a friend operator<< for printing.",
    },
    {
      heading: "MyString's constructors",
      body:
        "MyString() allocates a default 1000-char buffer: str = new char[1000];. MyString(int size) allocates size characters if size > 0, otherwise falls back to 1000. MyString(const char s[]) uses **strndup** to allocate and copy the given text in one step, then sets maxLength from strlen(str).",
    },
    {
      heading: "The copy problem",
      body:
        "Pass a MyString to a function **by value** — void printString(MyString strObject); — and the object is **copied** into strObject. Because str is just a pointer, the default copy makes strObject.str point at the **same memory** as the original. When printString ends, its destructor deletes that memory, leaving the **original object's pointer dangling**.",
    },
    {
      heading: "Copy constructors",
      body:
        "The fix is a **copy constructor**: a constructor whose one parameter is a **const reference** to the same class type, called automatically whenever an object is passed **by value** or **returned** from a function. Any class that uses new should define one — MyString::MyString(const MyString& strObject) allocates a **fresh, independent** buffer with strndup instead of copying the pointer.",
    },
    {
      heading: "Overloading operator=",
      body:
        "Assignment — lastCopy = last; — has the same shallow-copy problem as pass-by-value: without help, both objects end up pointing at the **same memory**. The fix is to overload operator= as a **member function** (not a friend), making sure it allocates its **own memory** for the left-hand side before copying the characters over.",
    },
    {
      heading: "Self-assignment and capacity",
      body:
        "MyString's operator= checks whether the **existing buffer is big enough** (newLength > maxLength) before deleting it. Skipping that check means a statement like string1 = string1; would **delete the very memory it's about to read from** — so the size check protects against self-assignment as a side effect.",
    },
    {
      heading: "The rule of three",
      body:
        "Any class that manages dynamic memory with new needs all **three** special members together: a **destructor**, a **copy constructor**, and an **overloaded operator=**. Leaving any one out risks a double-free, a dangling pointer, or a memory leak the moment an object is copied, assigned, or destroyed.",
    },
    {
      heading: "Pointers as reference parameters",
      body:
        "A function that needs to **redirect** a caller's pointer to new memory must take that pointer by **reference**: void createNewArray(double*& arr, size_t n) { arr = new double[n]; } — the & makes arr an alias for the caller's own pointer variable, not a copy of it.",
    },
    {
      heading: "Pointers to structs and classes: ->",
      body:
        "Given ItemType *itemPtr = new ItemType;, you could dereference and use the dot operator — (*itemPtr).number = 5555; — but C++ offers the **arrow operator**, ->, to do both steps at once: itemPtr->number = 5555; is the standard, more common way to reach a member through a pointer.",
    },
  ],
  questions: [
    {
      prompt: "When is a destructor called?",
      choices: [
        "Automatically, when an object goes out of scope",
        "Only when you call it explicitly",
        "Only if the class has no constructor",
        "Every time a member function runs",
      ],
      answer: 0,
      explanation:
        "Destructors run automatically as an object is destroyed, usually to free dynamically allocated memory.",
    },
    {
      prompt: "Which is a valid destructor declaration for class MyString?",
      choices: [
        "MyString::destroy();",
        "~MyString(int size);",
        "~MyString();",
        "delete MyString();",
      ],
      answer: 2,
      explanation:
        "Destructors are named ~ClassName, take no parameters, return nothing, and a class may only have one.",
    },
    {
      prompt: "What does this destructor do?",
      code: "MyString::~MyString() {\n  delete[] str;\n}",
      choices: [
        "Frees the dynamically allocated character array str points to",
        "Resets str to point to a new empty string",
        "Copies str into a temporary buffer",
        "Deletes the MyString object itself from the stack",
      ],
      answer: 0,
      explanation:
        "delete[] str frees the heap array str points to; the object's own (stack or member) storage is reclaimed separately.",
    },
    {
      prompt: "In MyString::MyString(int size), what happens if size is 0 or negative?",
      code: "MyString::MyString(int size) {\n  if (size > 0) {\n    str = new char[size];\n    maxLength = size;\n  } else {\n    str = new char[1000];\n    maxLength = 1000;\n  }\n}",
      choices: [
        "maxLength is set to 0",
        "The constructor throws an exception",
        "str is left pointing to garbage",
        "It falls back to allocating a 1000-character buffer",
      ],
      answer: 3,
      explanation:
        "The else branch handles a non-positive size by defaulting to a 1000-character buffer.",
    },
    {
      prompt:
        "void printString(MyString strObject); is called with an existing MyString. Without a copy constructor, what goes wrong when printString returns?",
      choices: [
        "Nothing — pass by value is always safe for pointers",
        "Its destructor deletes memory that the original object's pointer also points to, leaving a dangling pointer",
        "The compiler refuses to compile the call",
        "The original object is automatically renamed",
      ],
      answer: 1,
      explanation:
        "A default (shallow) copy shares the same str pointer; freeing it in the copy's destructor leaves the original dangling.",
    },
    {
      prompt: "What must a copy constructor's parameter be?",
      choices: [
        "A const reference to an object of the same class",
        "A value parameter of the same class",
        "A pointer to the class",
        "An int giving the size to copy",
      ],
      answer: 0,
      explanation:
        "A value parameter of the same class would itself require copying — an infinite recursion — so the parameter must be a const reference.",
    },
    {
      prompt: "A copy constructor runs automatically in which situations?",
      choices: [
        "Only when explicitly written as CopyOf(obj)",
        "Whenever operator<< is used",
        "When an object is passed by value, or returned from a function",
        "Only during program startup",
      ],
      answer: 2,
      explanation:
        "Pass-by-value arguments and function returns of the class type both trigger the copy constructor automatically.",
    },
    {
      prompt: "Why does MyString's copy constructor use strndup instead of copying the pointer str directly?",
      code: "MyString::MyString(const MyString& strObject) {\n  maxLength = strObject.length();\n  str = strndup(strObject.str, 1000);\n}",
      choices: [
        "So the new object gets its own independent memory instead of sharing the original's",
        "Because strndup is faster than pointer assignment",
        "Because str is declared const",
        "To avoid calling the destructor",
      ],
      answer: 0,
      explanation:
        "strndup allocates a fresh buffer and copies the characters, so the new object doesn't share memory with the original.",
    },
    {
      prompt: "Why must operator= be overloaded for a class like MyString?",
      choices: [
        "It's required to make the class printable",
        "The default assignment would copy the pointer, leaving both objects pointing at the same memory",
        "operator= doesn't exist unless you define it",
        "Assignment is illegal for classes with constructors",
      ],
      answer: 1,
      explanation:
        "Without an overload, assignment copies str's address rather than its contents, so both objects end up sharing one buffer.",
    },
    {
      prompt: "In MyString's overloaded operator=, why check `if (newLength > maxLength)` before deleting str?",
      code: "if (newLength > maxLength) {\n  delete [] str;\n  maxLength = newLength;\n  str = strndup(rightSide.str, 1000);\n} else {\n  strncpy(str, rightSide.str, 1000);\n}",
      choices: [
        "It has no real purpose",
        "It decides whether to call the destructor",
        "It only checks whether rightSide is a valid object",
        "Without it, self-assignment (string1 = string1;) would delete memory the statement still needs to read from",
      ],
      answer: 3,
      explanation:
        "Deleting str unconditionally would break string1 = string1;, since rightSide.str and str are the same memory being read and freed at once.",
    },
    {
      prompt: "A class allocates memory with new in its constructor. Which three member functions should it define together?",
      choices: [
        "getString, setString, and length",
        "Destructor, copy constructor, and overloaded operator=",
        "Only a destructor",
        "Constructor, destructor, and a friend function",
      ],
      answer: 1,
      explanation:
        "This trio — destructor, copy constructor, operator= — keeps dynamic memory correct across destruction, copying, and assignment.",
    },
    {
      prompt: "Why does createNewArray take arr as double*& instead of double*?",
      code: "void createNewArray(double*& arr, size_t n) {\n  arr = new double[n];\n}",
      choices: [
        "Because double*& is required for the new operator",
        "Because arrays can't be passed by pointer",
        "To make the function run faster",
        "So the function can redirect the caller's own pointer variable to new memory",
      ],
      answer: 3,
      explanation:
        "Taking the pointer by reference lets the function change what the caller's pointer variable itself points to, not just a local copy.",
    },
    {
      prompt: "Given ItemType *itemPtr = new ItemType;, which two lines do the same thing?",
      code: "(*itemPtr).number = 5555;\nitemPtr->number = 5555;",
      choices: [
        "The second line is a syntax error",
        "The first line only works on structs, not classes",
        "Both access the number member through the pointer",
        "The arrow version dereferences twice",
      ],
      answer: 2,
      explanation:
        "-> combines dereference-then-dot into one operator, so itemPtr->number is equivalent to (*itemPtr).number.",
    },
  ],
  items: [
    makeItem({
      id: "dynamic-classes-01",
      topicId: "dynamic-classes",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What are the naming and signature rules for a destructor?",
      expected:
        "A destructor is a member function called automatically when an object goes out of scope. Its name begins with a '~' followed by the class name, it usually calls delete to deallocate dynamic variables, it takes no parameters and returns no value, and a class may only have one destructor.",
      criteria: [
        "States the name is ~ followed by the class name",
        "States it's called automatically when the object goes out of scope",
        "States it takes no parameters, returns no value, and a class has only one",
      ],
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#destructors",
        excerpt:
          "A destructor is a member function of a class that is called automatically when an object goes out of scope\n- Usually calls delete to deallocate all dynamic variables\n- The destructor name begins with a '~' followed by the class name\n- A destructor takes no parameters and returns no value\n- A class may only have one destructor",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-02",
      topicId: "dynamic-classes",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write the MyString destructor, given `private: char *str;`.",
      expected: "MyString::~MyString() {\n delete[] str;\n}",
      criteria: [
        "Names the destructor ~MyString()",
        "Uses delete[] (array form), not plain delete, since str is a dynamic array",
      ],
      timeBudgetSec: 90,
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#mystring-destructor",
        excerpt: "MyString::~MyString() {\ndelete[] str;\n}",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-03",
      topicId: "dynamic-classes",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "`void printString(MyString strObject);` is called as `printString(name);` where name is an existing MyString, and MyString has no copy constructor. What goes wrong?",
      expected:
        "The object name is copied to the parameter strObject, but since we're using dynamic allocation, both name and strObject end up pointing to the same location. When printString terminates, the destructor runs and deallocates the memory for strObject — which also deallocates it for name. The original object name is now pointing to memory that has been deallocated.",
      criteria: [
        "States name and strObject end up pointing to the same memory location",
        "States printString's destructor deallocates that shared memory when it terminates",
        "States name is left pointing to deallocated memory",
      ],
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#copy-constructor-problem",
        excerpt:
          "Because we're using dynamic allocation, both name and strObject will be pointing to the same location\n- When the function printString terminates, the destructor will be called, and the memory allocated for both name and strObject will be deallocated\n- Now the original object name is pointing to memory that has been deallocated",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-04",
      topicId: "dynamic-classes",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What must a copy constructor's parameter be, and when does it get called automatically?",
      expected:
        "A copy constructor's one parameter must be of the same type as the class and must be a const call-by-reference. It's called automatically whenever a call-by-value argument of the class is used, or a function returns an object of the class type. Any class that uses pointers and the new operator should have one.",
      criteria: [
        "States the parameter must be a const reference to the same class type",
        "States it triggers on pass-by-value and on function return of the class type",
      ],
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#copy-constructor",
        excerpt:
          "A copy constructor is a constructor that has one parameter that is of the same type as the class, with the following exceptions:\n- Its parameter must be a const call-by-reference.\n- A copy constructor is called automatically whenever:\n- A call-by-value argument of the class is used\n- A function returns an object of the class type\n- Any class that uses pointers and the new operator should have a copy constructor",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-05",
      topicId: "dynamic-classes",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Write MyString's copy constructor, given `private: char *str; int maxLength;` and a `length()` accessor.",
      expected:
        "MyString::MyString(const MyString& strObject) {\n maxLength = strObject.length();\n str = strndup(strObject.str, 1000);\n}",
      criteria: [
        "Takes a const MyString& parameter",
        "Uses strndup to allocate a fresh, independent copy of strObject.str rather than copying the pointer",
        "Sets maxLength from strObject.length()",
      ],
      timeBudgetSec: 150,
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#mystring-copy-constructor",
        excerpt:
          "// MyString copy constructor\nMyString::MyString(const MyString& strObject) {\nmaxLength = strObject.length();\n// Allocate and copy up to 1000 characters\nstr = strndup(strObject.str, 1000);\n}",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-06",
      topicId: "dynamic-classes",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "In MyString's overloaded operator=, why does it check `if (newLength > maxLength)` before calling `delete [] str;`?\n```\nvoid MyString::operator = (const MyString &rightSide){\n int newLength = strlen(rightSide.str);\n if (newLength > maxLength)\n {\n delete [] str;\n maxLength = newLength;\n str = strndup(rightSide.str, 1000);\n }\n else {\n strncpy(str, rightSide.str, 1000);\n }\n}\n```",
      expected:
        "Before deleting, the code checks whether maxLength is already big enough. If it didn't check, a statement like string1 = string1; would delete the memory allocated to the string before it's done being read from — self-assignment would destroy the very data operator= is trying to copy.",
      criteria: [
        "States the check avoids unnecessarily/incorrectly deleting str",
        "Names the specific failure case: string1 = string1; would delete memory the statement still needs to read",
      ],
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#mystring-overloaded-assignment",
        excerpt:
          "//before deleting check to see if maxLength is enough. If not checked, then\n//the statement string1 = string1; will delete the memory allocated to the string.\nif (newLength > maxLength)",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 3,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-07",
      topicId: "dynamic-classes",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Given `ItemType *itemPtr = new ItemType;`, how do `(*itemPtr).number` and `itemPtr->number` compare?",
      expected:
        "(*itemPtr) dereferences the structure, and number can then be accessed with the dot operator: (*itemPtr).number = 5555;. The arrow operator -> replaces that \"*\" and \".\" combination in one step — itemPtr->number = 5555; — and is the most common way to access members of pointers to structures.",
      criteria: [
        "States (*itemPtr).number dereferences then uses the dot operator",
        "States itemPtr->number does the same thing in one operator",
        "Identifies -> as the more common form",
      ],
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#arrow-operator",
        excerpt:
          "- C++ offers an operator that replaces the \"*\" and \".\" combination\n- The operator is called the arrow operator \"->\"\n- Arrow operator is the most common way to access members of pointers to structures\n- The structure members can now be accessed as follows:\n```\nitemPtr->number = 5555;\nitemPtr->price = 26.95;\n```",
        citation: "Lecture Deck 02.3",
      },
      extraAtoms: ["#pointers-to-structures"],
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "dynamic-classes-08",
      topicId: "dynamic-classes",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Why does `createNewArray` take its pointer parameter as `double*&` instead of `double*`?\n```\nvoid createNewArray(double*& arr, size_t n)\n{\n arr = new double[n];\n}\n```",
      expected:
        "A function might need to change a pointer to a new location. The pointer has to be passed to the function as a call-by-reference parameter, so double*& lets createNewArray redirect the caller's own pointer variable (not just a local copy of it) to the newly allocated memory.",
      criteria: [
        "States a pointer that needs to be redirected must be passed by reference",
        "Explains double*& lets the function change the caller's actual pointer variable",
      ],
      provenance: {
        sourceId: "cpp-slides-02.3-dynamic-classes",
        anchor: "#pointers-as-reference-parameters",
        excerpt:
          "- A function might need to change a pointer to a new location.\n- The pointer has to be passed to the function as call-by-reference parameter.\n- Example:\n```\nvoid createNewArray(double*& arr, size_t n)\n{\narr = new double[n];\n}\n```",
        citation: "Lecture Deck 02.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/dynamic-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
  ],
};
