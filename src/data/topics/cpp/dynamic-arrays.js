export default {
  id: "dynamic-arrays",
  title: "Dynamic Arrays",
  subtitle: "CS 2401 — new[]/delete[] & pointer arithmetic",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "Arrays and pointers are compatible",
      body:
        "An array name and a pointer to its element type work interchangeably. Given int *intPtr; int numbers[10];, the assignment intPtr = numbers; makes intPtr **point to the first element** of numbers. From there, intPtr[2] = 99; stores 99 in the **third slot** (index 2), just like numbers[2] would.",
    },
    {
      heading: "Creating a dynamic array",
      body:
        "new can allocate a whole block at once: intArray = new int[10]; reserves room for **10 ints on the heap**, and intArray points at the first one. Because it was allocated as an array, it must be freed with the **array form of delete**: delete[] intArray;, not plain delete.",
    },
    {
      heading: "The delete[] pitfall",
      body:
        "delete[] only works correctly if the pointer still points at the **start of the block** new gave you. If you shift it first — chArray += 5; — and then call delete[] chArray;, the runtime tries to free 10 elements starting from the **sixth position**, which can **corrupt memory or crash** the program. Never delete through a pointer that's been moved from its original allocation.",
    },
    {
      heading: "Pointers and function parameters",
      body:
        "Because arrays and pointers are compatible, a function that expects an array can just take a pointer: void someFunction(int *intPtr); accepts either a **plain pointer or an array name** — the array simply decays to a pointer to its first element when passed.",
    },
    {
      heading: "Pointers as reference parameters",
      body:
        "Pointers give you another way to write a swap-by-reference function: void swap(int *intPtr1, int *intPtr2) dereferences both parameters to exchange the values they point to. The caller passes **addresses** — swap(&x, &y); — so the function can modify x and y directly, the same job reference parameters do.",
    },
    {
      heading: "Sizing an array at run time",
      body:
        "A dynamic array's size doesn't need to be known until the program is running. intArray = new int[size]; can use a size read from the user with cin >> size;, something an ordinary (static) array can't do. When you're finished, delete[] intArray; **frees the whole block**.",
    },
    {
      heading: "strndup",
      body:
        "strndup is a c-string function that **duplicates** a c-string: it allocates new memory, copies up to a given number of characters into it, and returns a **pointer to the new copy**. char *chPtr = strndup(name, 100); gives chPtr its own independent copy of name's contents.",
    },
    {
      heading: "strndup vs. strncpy",
      body:
        "Copying a string manually with strncpy takes **two steps**: first new char[...] to allocate, then strncpy to copy in. strndup **combines both steps into one call**, allocating the memory and copying the text for you: chPtr = strndup(name, 100);.",
    },
    {
      heading: "Pointer arithmetic",
      body:
        "Adding an integer to a pointer doesn't add that many bytes — intPtr + i adds **i * sizeof(int)** bytes, so the arithmetic automatically accounts for the pointed-to type's size. That's what lets *(intPtr + i) walk through a dynamic array one element at a time, the same as intPtr[i].",
    },
  ],
  questions: [
    {
      prompt: "Given int *intPtr; int numbers[10]; intPtr = numbers;, what does intPtr point to?",
      choices: [
        "The first element of numbers",
        "The last element of numbers",
        "The size of numbers",
        "Nothing until new is called",
      ],
      answer: 0,
      explanation:
        "Assigning an array name to a pointer makes the pointer refer to the array's first element.",
    },
    {
      prompt: "How do you allocate an array of 10 ints on the heap?",
      choices: [
        "intArray = new int[10];",
        "intArray = new int(10);",
        "intArray = new int, 10;",
        "int intArray[10] = new;",
      ],
      answer: 0,
      explanation: "new int[10] allocates a dynamic array of 10 ints.",
    },
    {
      prompt: "Which statement correctly frees a dynamically allocated array?",
      code: "int *intArray = new int[10];",
      choices: [
        "delete [] intArray;",
        "delete intArray;",
        "free(intArray);",
        "intArray.delete();",
      ],
      answer: 0,
      explanation:
        "Arrays allocated with new [...] must be freed with the array form, delete []; plain delete is for single objects.",
    },
    {
      prompt: "What goes wrong here?",
      code: "char *chArray = new char[10];\nchArray += 5;\ndelete [] chArray;",
      choices: [
        "chArray no longer points at the start of the allocated block, which can corrupt memory",
        "Nothing — delete[] always finds the original block",
        "chArray leaks memory but nothing else happens",
        "The += operator isn't allowed on pointers",
      ],
      answer: 0,
      explanation:
        "delete[] expects the pointer to still reference the start of the block new returned; a shifted pointer can corrupt memory or free memory used elsewhere.",
    },
    {
      prompt: "Why does void someFunction(int *intPtr); accept an array argument?",
      choices: [
        "Arrays and pointers are compatible — an array name decays to a pointer to its first element",
        "C++ automatically converts arrays to vectors",
        "The function secretly copies the whole array",
        "Because intPtr is declared as int[]",
      ],
      answer: 0,
      explanation:
        "An array name used as an argument decays to a pointer to its first element, matching an int * parameter.",
    },
    {
      prompt: "In this swap function, what does *intPtr1 = *intPtr2; do?",
      code: "void swap(int *intPtr1, int *intPtr2) {\n  int temp = *intPtr1;\n  *intPtr1 = *intPtr2;\n  *intPtr2 = temp;\n}",
      choices: [
        "Stores the value intPtr2 points to into the memory intPtr1 points to",
        "Makes intPtr1 point to the same address as intPtr2",
        "Compares the two pointers",
        "Deletes the memory at intPtr1",
      ],
      answer: 0,
      explanation:
        "Dereferencing both sides copies the value pointed to by intPtr2 into the memory pointed to by intPtr1.",
    },
    {
      prompt: "To call swap(int *intPtr1, int *intPtr2) on ordinary ints x and y, you write:",
      choices: ["swap(&x, &y);", "swap(x, y);", "swap(*x, *y);", "swap(x[], y[]);"],
      answer: 0,
      explanation:
        "swap expects addresses, so the caller passes &x and &y to give it pointers to x and y.",
    },
    {
      prompt: "What does strndup(name, 100) return?",
      choices: [
        "A pointer to a newly allocated copy of name's contents",
        "The length of name",
        "true if name fits in 100 characters",
        "A reference to name itself",
      ],
      answer: 0,
      explanation:
        "strndup allocates new memory, copies up to the given number of characters, and returns a pointer to that new copy.",
    },
    {
      prompt: "What's the advantage of strndup over new + strncpy?",
      choices: [
        "It allocates and copies in a single call",
        "It never allocates on the heap",
        "It works on integers as well as chars",
        "It automatically deletes the original string",
      ],
      answer: 0,
      explanation:
        "strndup combines what would otherwise be a separate new char[...] allocation and a strncpy call into one step.",
    },
    {
      prompt: "In this loop, what does *(intPtr + i) do?",
      code: "for (i = 0; i < size; i++) {\n  cout << *(intPtr + i) << ' ';\n}",
      choices: [
        "Accesses the i-th element of the array intPtr points to, same as intPtr[i]",
        "Adds i to the pointer's stored address without reading memory",
        "Multiplies the pointer's address by i",
        "Deletes the element at index i",
      ],
      answer: 0,
      explanation:
        "Dereferencing intPtr + i reads the value at that offset, equivalent to indexing with intPtr[i].",
    },
    {
      prompt: "When you write intPtr + i, how much is actually added to the address?",
      choices: [
        "i * sizeof(the pointed-to type)",
        "Just i",
        "i bytes, regardless of type",
        "sizeof(intPtr)",
      ],
      answer: 0,
      explanation:
        "Pointer arithmetic scales by the size of the pointed-to type, so intPtr + i moves i * sizeof(type) bytes.",
    },
    {
      prompt:
        "What lets a dynamic array's size be decided while the program runs (unlike a plain declared array)?",
      code: "cin >> size;\nintArray = new int[size];",
      choices: [
        "new int[size] allocates based on a run-time value",
        "Plain arrays can also use a variable size",
        "size must be a compile-time constant either way",
        "new requires a literal size",
      ],
      answer: 0,
      explanation:
        "Unlike a plain array declaration, new int[size] can use a size determined at run time, such as user input.",
    },
  ],
};
