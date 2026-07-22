export default {
  id: "dynamic-classes",
  title: "Dynamic Memory with Classes & Structures",
  subtitle: "CS 2401 — destructors, copy constructors & operator=",
  course: "cpp",
  showChart: false,
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
        "Every time a member function runs",
        "Only if the class has no constructor",
      ],
      answer: 0,
      explanation:
        "Destructors run automatically as an object is destroyed, usually to free dynamically allocated memory.",
    },
    {
      prompt: "Which is a valid destructor declaration for class MyString?",
      choices: [
        "~MyString();",
        "MyString::destroy();",
        "delete MyString();",
        "~MyString(int size);",
      ],
      answer: 0,
      explanation:
        "Destructors are named ~ClassName, take no parameters, return nothing, and a class may only have one.",
    },
    {
      prompt: "What does this destructor do?",
      code: "MyString::~MyString() {\n  delete[] str;\n}",
      choices: [
        "Frees the dynamically allocated character array str points to",
        "Deletes the MyString object itself from the stack",
        "Resets str to point to a new empty string",
        "Copies str into a temporary buffer",
      ],
      answer: 0,
      explanation:
        "delete[] str frees the heap array str points to; the object's own (stack or member) storage is reclaimed separately.",
    },
    {
      prompt: "In MyString::MyString(int size), what happens if size is 0 or negative?",
      code: "MyString::MyString(int size) {\n  if (size > 0) {\n    str = new char[size];\n    maxLength = size;\n  } else {\n    str = new char[1000];\n    maxLength = 1000;\n  }\n}",
      choices: [
        "It falls back to allocating a 1000-character buffer",
        "The constructor throws an exception",
        "str is left pointing to garbage",
        "maxLength is set to 0",
      ],
      answer: 0,
      explanation:
        "The else branch handles a non-positive size by defaulting to a 1000-character buffer.",
    },
    {
      prompt:
        "void printString(MyString strObject); is called with an existing MyString. Without a copy constructor, what goes wrong when printString returns?",
      choices: [
        "Its destructor deletes memory that the original object's pointer also points to, leaving a dangling pointer",
        "The original object is automatically renamed",
        "Nothing — pass by value is always safe for pointers",
        "The compiler refuses to compile the call",
      ],
      answer: 0,
      explanation:
        "A default (shallow) copy shares the same str pointer; freeing it in the copy's destructor leaves the original dangling.",
    },
    {
      prompt: "What must a copy constructor's parameter be?",
      choices: [
        "A const reference to an object of the same class",
        "A pointer to the class",
        "An int giving the size to copy",
        "A value parameter of the same class",
      ],
      answer: 0,
      explanation:
        "A value parameter of the same class would itself require copying — an infinite recursion — so the parameter must be a const reference.",
    },
    {
      prompt: "A copy constructor runs automatically in which situations?",
      choices: [
        "When an object is passed by value, or returned from a function",
        "Only when explicitly written as CopyOf(obj)",
        "Only during program startup",
        "Whenever operator<< is used",
      ],
      answer: 0,
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
        "The default assignment would copy the pointer, leaving both objects pointing at the same memory",
        "operator= doesn't exist unless you define it",
        "Assignment is illegal for classes with constructors",
        "It's required to make the class printable",
      ],
      answer: 0,
      explanation:
        "Without an overload, assignment copies str's address rather than its contents, so both objects end up sharing one buffer.",
    },
    {
      prompt: "In MyString's overloaded operator=, why check `if (newLength > maxLength)` before deleting str?",
      code: "if (newLength > maxLength) {\n  delete [] str;\n  maxLength = newLength;\n  str = strndup(rightSide.str, 1000);\n} else {\n  strncpy(str, rightSide.str, 1000);\n}",
      choices: [
        "Without it, self-assignment (string1 = string1;) would delete memory the statement still needs to read from",
        "It only checks whether rightSide is a valid object",
        "It decides whether to call the destructor",
        "It has no real purpose",
      ],
      answer: 0,
      explanation:
        "Deleting str unconditionally would break string1 = string1;, since rightSide.str and str are the same memory being read and freed at once.",
    },
    {
      prompt: "A class allocates memory with new in its constructor. Which three member functions should it define together?",
      choices: [
        "Destructor, copy constructor, and overloaded operator=",
        "Only a destructor",
        "Constructor, destructor, and a friend function",
        "getString, setString, and length",
      ],
      answer: 0,
      explanation:
        "This trio — destructor, copy constructor, operator= — keeps dynamic memory correct across destruction, copying, and assignment.",
    },
    {
      prompt: "Why does createNewArray take arr as double*& instead of double*?",
      code: "void createNewArray(double*& arr, size_t n) {\n  arr = new double[n];\n}",
      choices: [
        "So the function can redirect the caller's own pointer variable to new memory",
        "Because arrays can't be passed by pointer",
        "To make the function run faster",
        "Because double*& is required for the new operator",
      ],
      answer: 0,
      explanation:
        "Taking the pointer by reference lets the function change what the caller's pointer variable itself points to, not just a local copy.",
    },
    {
      prompt: "Given ItemType *itemPtr = new ItemType;, which two lines do the same thing?",
      code: "(*itemPtr).number = 5555;\nitemPtr->number = 5555;",
      choices: [
        "Both access the number member through the pointer",
        "The second line is a syntax error",
        "The first line only works on structs, not classes",
        "The arrow version dereferences twice",
      ],
      answer: 0,
      explanation:
        "-> combines dereference-then-dot into one operator, so itemPtr->number is equivalent to (*itemPtr).number.",
    },
  ],
};
