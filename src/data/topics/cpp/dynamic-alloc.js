export default {
  id: "dynamic-alloc",
  title: "Dynamic Allocation",
  subtitle: "CS 2401 — pointers & the heap",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "Static vs. dynamic allocation",
      body:
        "Variables you declare normally get their memory automatically — that's **static allocation**. **Dynamic allocation** lets a program request memory while it's running, on demand. A **pointer** is a variable that holds a **memory address**, so having a pointer to a location just means holding that address, ready to use. Any variable's address can be obtained with the **address-of operator**, &, as in &x.",
    },
    {
      heading: "Declaring pointers",
      body:
        "A pointer declaration writes the pointed-to type, then an asterisk, then the name: double *dblPtr, value; — but only **dblPtr is a pointer** here; value is an ordinary double. dblPtr is a **pointer to a double**, so it's **compatible with &value** (the address of a double), not with the address of an int or a char.",
    },
    {
      heading: "Dereferencing",
      body:
        "Once dblPtr = &value; makes dblPtr point at value's memory, the same symbol used to declare a pointer also **accesses what it points to**: *dblPtr = 12.3; changes the memory value refers to, so cout << *dblPtr and cout << value now print the **same number**. Using * this way is called the **dereferencing operator**.",
    },
    {
      heading: "Allocating with new",
      body:
        "The **new operator** requests a block of memory from a place called the **heap**. intPtr = new int; allocates space for one int, leaving it holding **garbage**. new int(99) both **allocates and initializes**, so the memory already holds 99. Any type works this way — new double, new char('A'), and so on.",
    },
    {
      heading: "Freeing memory with delete",
      body:
        "Memory from new doesn't free itself — you must **explicitly deallocate** it with the **delete operator**: delete intPtr;. This returns the memory to the **heap** so it can be reused. Forgetting to delete leaves that memory unusable for the rest of the program — a **memory leak**.",
    },
    {
      heading: "Dangling references",
      body:
        "If two pointers hold the **same address** — intPtr2 = intPtr1; — and then delete intPtr1; frees that memory, intPtr2 still points at the now-freed spot. intPtr2 is called a **dangling reference**: it points to memory that is **no longer allocated**, and using it is undefined behavior.",
    },
    {
      heading: "nullptr",
      body:
        "**nullptr** is a special constant pointer value meaning it **points at nothing**. It plays the same role NULL played in older C++, and it's the standard way to **initialize a pointer** before it's given a real address. Unlike an integer literal, nullptr can be assigned to **any pointer type**.",
    },
    {
      heading: "When new fails",
      body:
        "If the **new operator** can't find enough free memory, it doesn't just return an error code — it **throws an exception**, and if nothing catches it, the program **terminates**. Handling that failure gracefully requires an **exception handler** around the allocation.",
    },
    {
      heading: "Static, dynamic, and automatic variables",
      body:
        "C++ variables fall into three groups. **Automatic variables** are the ordinary local variables you've always used — created and destroyed as their scope is entered and left. **Dynamic variables** are created explicitly with **new**, and live until you delete them. **Static variables**, made with the static keyword (static int x = 5;), are **global to the file** and keep their value for the program's whole run.",
    },
    {
      heading: "Type inference with auto",
      body:
        "Since C++11, the **auto** keyword lets the compiler figure out a variable's type from its initializer — but the variable **must be initialized at declaration**. auto value = 2.3; creates a double, and auto ptr = &value; creates a **pointer to a double**, because that's what &value produces.",
    },
  ],
  questions: [
    {
      prompt: "What is a pointer?",
      choices: [
        "A variable that holds a memory address",
        "A function that allocates memory",
        "A type of array",
        "A loop control variable",
      ],
      answer: 0,
      explanation:
        "A pointer is a variable whose value is a memory address — the address of some other variable.",
    },
    {
      prompt: "Which operator returns the memory address of a variable?",
      choices: ["&", "*", "->", "::"],
      answer: 0,
      explanation:
        "The address-of operator, &, returns a variable's memory address, as in &x.",
    },
    {
      prompt: "Given this declaration, which variable is a pointer?",
      code: "double *dblPtr, value;",
      choices: ["Only dblPtr", "Only value", "Both dblPtr and value", "Neither"],
      answer: 0,
      explanation:
        "The * binds to the name it precedes, so only dblPtr is a pointer; value is an ordinary double.",
    },
    {
      prompt: "What does *dblPtr do in this code?",
      code: "value = 34.5;\ndblPtr = &value;\n*dblPtr = 12.3;",
      choices: [
        "Declares a new pointer",
        "Dereferences dblPtr to access/change the memory value refers to",
        "Deletes the pointer",
        "Compares dblPtr to value",
      ],
      answer: 1,
      explanation:
        "*dblPtr dereferences the pointer, reaching into the memory it points to (the same memory as value).",
    },
    {
      prompt: "What does this statement do?",
      code: "intPtr = new int(99);",
      choices: [
        "Allocates memory for an int and initializes it to 99",
        "Declares an int variable named 99",
        "Deletes intPtr",
        "Copies 99 into an existing int",
      ],
      answer: 0,
      explanation:
        "new int(99) allocates space for one int on the heap and initializes it to 99 in one step.",
    },
    {
      prompt: "Where does memory from the new operator come from?",
      choices: [
        "The heap",
        "The stack",
        "A static global array",
        "The operating system's registry",
      ],
      answer: 0,
      explanation: "new allocates memory from the heap.",
    },
    {
      prompt: "After intPtr = new int; with no initializer, what does intPtr point to?",
      choices: [
        "Garbage (an unspecified value)",
        "Always 0",
        "nullptr",
        "A compile error occurs",
      ],
      answer: 0,
      explanation:
        "Without an initializer, the newly allocated int holds whatever garbage was already in that memory.",
    },
    {
      prompt: "What does the delete operator do?",
      choices: [
        "Deallocates memory so it can be reused",
        "Sets the pointer to point at 0",
        "Copies the pointed-to value elsewhere",
        "Declares a new pointer",
      ],
      answer: 0,
      explanation: "delete frees memory that new allocated, returning it to the heap.",
    },
    {
      prompt: "In this code, what is intPtr2 after delete intPtr1?",
      code: "int *intPtr1, *intPtr2;\nintPtr1 = new int(99);\nintPtr2 = intPtr1;\ndelete intPtr1;",
      choices: [
        "A dangling reference, pointing to deallocated memory",
        "A null pointer",
        "Still safely pointing to 99",
        "A compile error",
      ],
      answer: 0,
      explanation:
        "intPtr2 holds the same address intPtr1 had. Deleting through intPtr1 frees that memory, so intPtr2 is left dangling.",
    },
    {
      prompt: "What is nullptr?",
      choices: [
        "A special constant pointer meaning 'points at nothing'",
        "A function that frees memory",
        "An integer equal to -1",
        "A reserved variable name for arrays",
      ],
      answer: 0,
      explanation:
        "nullptr is a special constant used to initialize or reset pointers; it can be assigned to any pointer type.",
    },
    {
      prompt: "What happens if the new operator fails to find enough memory?",
      choices: [
        "It throws an exception, terminating the program unless handled",
        "It silently returns nullptr",
        "It waits until memory is available",
        "It reduces the requested size automatically",
      ],
      answer: 0,
      explanation:
        "A failed new throws an exception; without an exception handler to catch it, the program terminates.",
    },
    {
      prompt: "Which kind of variable is created with the static keyword and is global to the file?",
      code: "static int x = 5;",
      choices: [
        "A static variable",
        "A dynamic variable",
        "An automatic variable",
        "A pointer variable",
      ],
      answer: 0,
      explanation:
        "static creates a static variable, which is global to the file and keeps its value for the program's run.",
    },
    {
      prompt: "Which line correctly uses auto?",
      choices: [
        "auto value = 2.3;",
        "auto value;",
        "auto int value = 2.3;",
        "value = auto(2.3);",
      ],
      answer: 0,
      explanation:
        "auto variables must be initialized at declaration so the compiler can infer the type from the initializer.",
    },
  ],
};
