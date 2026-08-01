// ─────────────────── C++ · 04.1 Function and Class Templates ───────────────────
// and Class Templates". Text is original; the code snippets are the deck's own.
import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "templates",
  title: "Function & Class Templates",
  subtitle: "c++ — writing one version that works for every type",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): default — not covered by the
  // diagnostic quiz or self-reported struggle list, not "known easy."
  examWeight: 1.0,
  cards: [
    {
      heading: "Why templates exist",
      body:
        "Quite often you need an algorithm that works on **different data types**. One way to get that is **overloaded functions** — writing void swap(int&, int&), void swap(double&, double&), and void swap(string&, string&) as three separate functions. That's the same logic copied three times. **Templates** are the other way: you write the function **once** and the compiler generates a version for whatever type you use it with.",
    },
    {
      heading: "Declaring a template function",
      body:
        "A template function takes a **generic type** — a stand-in name for a type that isn't decided yet. You introduce it with the keyword **typename** or the keyword **class**; the two are interchangeable here, and this course uses **typename** because it reads more clearly. The declaration goes on its own line above the function: **template <typename T>**. The name **T** is just an identifier — any valid name works — and it will **match any type** you send in.",
    },
    {
      heading: "The swap template function",
      body:
        "Here is swap written once for every type. The line **template <typename T>** announces the generic type, and then **T** is used everywhere a concrete type would normally go: the two **reference** parameters and the local **temp** variable are all of type T.",
      code:
        "template <typename T>\nvoid swap (T &first, T &second)\n{\n    T temp = first;\n    first = second;\n    second = temp;\n}",
    },
    {
      heading: "Calling a template function",
      body:
        "You call it like any ordinary function — no special syntax. The compiler looks at the **arguments** you passed and figures out what T must be, then generates that version. Passing two ints makes T become **int**; passing two chars makes T become **char**. The same source code serves both calls.",
      code:
        "//swap integers\nint integer1 = 1, integer2 = 2;\nswap(integer1, integer2);\ncout << \"Swapped integer values are \"\n     << integer1 << \" \" << integer2 << endl;\n\n//swap characters\nchar symbol1 = 'A', symbol2 = 'B';\nswap(symbol1, symbol2);\ncout << \"Swapped character values are \"\n     << symbol1 << \" \" << symbol2 << endl;",
    },
    {
      heading: "Class templates",
      body:
        "The same idea works on **classes**. Suppose you want a **Pair** class that stores two values of any type. Rather than designing a separate class for int pairs, char pairs, and string pairs, you design a **single template class** that takes a generic type. The **template <typename T>** line goes directly above the **class** keyword, and T is then usable anywhere inside the class — parameters, return types, and the private data members.",
    },
    {
      heading: "The Pair template class",
      body:
        "Notice that T appears in the setters' **parameters**, the getters' **return types**, and the two **private** members. The comment shows that **template <class T>** would mean exactly the same thing.",
      code:
        "template <typename T>  //or template <class T>\nclass Pair\n{\npublic:\n    Pair();\n    Pair(T firstValue, T secondValue);\n    void setFirst(T value);\n    void setSecond(T value);\n    T getFirst();\n    T getSecond();\nprivate:\n    T first;\n    T second;\n};",
    },
    {
      heading: "Using a template class",
      body:
        "Unlike a template function, a template class can't deduce its type from how you use it — you have to **state the type in angle brackets** when you declare the object. **Pair <int> score;** makes a pair of ints; **Pair <char> seats;** makes a pair of chars. After that, the objects behave like ordinary objects: score.setFirst(3); and ch = seats.getSecond();.",
      code:
        "Pair <int> score;\nPair <char> seats;\n...\n...\nscore.setFirst(3);\nch = seats.getSecond();",
    },
    {
      heading: "Defining member functions outside the class",
      body:
        "When you write a member function's body outside the class, two things change. Every definition must be preceded by its own **template <typename T>** line, and the **<T>** must be attached to the **class name** before the :: — you write **Pair <T>::setFirst**, not just Pair::setFirst. Forgetting the angle brackets is the classic compile error here.",
      code:
        "template <typename T>\nvoid Pair <T>::setFirst(T value)\n{\n    first = value;\n}",
    },
    {
      heading: "More than one generic type",
      body:
        "A template can declare **several** generic types, separated by **commas**: **template <typename T1, typename T2>**. That lets one class hold two independent types — var1 is a T1 and var2 is a T2 — so the same class could pair an int with a string, or a char with a double.",
      code:
        "template <typename T1, typename T2>\nclass ClassName\n{\npublic:\n    void setvars (T1 v1, T2 v2);\n    T2 getvar2 ();\n    ...\nprivate:\n    T1 var1;\n    T2 var2;\n};",
    },
    {
      heading: "Definitions with multiple types",
      body:
        "The rule from before still applies, just with the full list. The template line repeats **both** parameters, and the class name carries **both** of them in its angle brackets: **ClassName<T1, T2>::**. The return type in front comes from whichever generic type the function actually returns — here getvar2 returns a **T2**.",
      code:
        "template <typename T1, typename T2>\nvoid ClassName<T1, T2>::setvars (T1 v1, T2 v2)\n{\n    var1 = v1;\n    var2 = v2;\n}\n\ntemplate <typename T1, typename T2>\nT2  ClassName <T1, T2>::getvar2 ()\n{\n    return var2;\n}",
    },
  ],
  questions: [
    {
      prompt: "What problem do templates solve?",
      choices: [
        "Making programs run in constant time",
        "Allocating memory on the heap",
        "Writing the same algorithm once instead of overloading it for every data type",
        "Hiding a class's private data",
      ],
      answer: 2,
      explanation:
        "Templates let one definition serve every data type, replacing a pile of near-identical overloaded functions.",
    },
    {
      prompt: "Which two keywords can introduce a generic type parameter?",
      choices: ["typename or class", "auto or const", "struct or union", "generic or template"],
      answer: 0,
      explanation:
        "Both typename and class work identically here; this course uses typename because it's more readable.",
    },
    {
      prompt: "What is missing above this function?",
      code: "void swap (T &first, T &second)\n{\n    T temp = first;\n    first = second;\n    second = temp;\n}",
      choices: [
        "using T = int;",
        "template <typename T>",
        "#include <template>",
        "class T;",
      ],
      answer: 1,
      explanation:
        "Without the template <typename T> line above it, the compiler has no idea what T is.",
    },
    {
      prompt: "In `template <typename T>`, what is T?",
      choices: [
        "A required keyword that cannot be renamed",
        "Always shorthand for int",
        "The name of the function being defined",
        "An identifier standing in for any type the caller supplies",
      ],
      answer: 3,
      explanation:
        "T is just a valid identifier you chose; it will match whatever type the code is used with.",
    },
    {
      prompt: "After this call, what type does the compiler use for T?",
      code: "char symbol1 = 'A', symbol2 = 'B';\nswap(symbol1, symbol2);",
      choices: ["char", "int", "string", "void"],
      answer: 0,
      explanation:
        "The compiler deduces T from the arguments, so passing two chars makes T become char.",
    },
    {
      prompt: "Why are the swap parameters declared as `T &first, T &second`?",
      code: "template <typename T>\nvoid swap (T &first, T &second)",
      choices: [
        "References make the template compile faster",
        "T can only be used with references",
        "They're references, so the swap changes the caller's actual variables",
        "It prevents the arguments from being modified",
      ],
      answer: 2,
      explanation:
        "Passing by reference is what lets swap modify the original variables rather than local copies.",
    },
    {
      prompt: "How do you declare a Pair object that holds two ints?",
      choices: ["Pair score<int>;", "Pair <int> score;", "Pair score;", "int Pair score;"],
      answer: 1,
      explanation:
        "A template class needs its type argument in angle brackets right after the class name.",
    },
    {
      prompt: "Why must you write `Pair <int>` but you can just write `swap(a, b)`?",
      choices: [
        "Classes are always slower than functions",
        "swap is a built-in function, not a template",
        "Angle brackets are optional everywhere and just stylistic",
        "A template function deduces its type from the arguments; a class declaration has no arguments to deduce from",
      ],
      answer: 3,
      explanation:
        "There's nothing for the compiler to inspect when you declare an object, so the type must be stated explicitly.",
    },
    {
      prompt: "What is wrong with this out-of-class definition?",
      code: "template <typename T>\nvoid Pair::setFirst(T value)\n{\n    first = value;\n}",
      choices: [
        "The class name needs <T>: it should be Pair <T>::setFirst",
        "The template line should say <class T>",
        "The return type should be T, not void",
        "Nothing — this compiles fine",
      ],
      answer: 0,
      explanation:
        "<T> must be specified with the class name, so the correct form is Pair <T>::setFirst.",
    },
    {
      prompt: "How many template lines does a class with three out-of-class member function definitions need?",
      choices: [
        "One, above the class only",
        "Three, above the definitions only",
        "Four — one above the class and one above each definition",
        "None, if the class already has one",
      ],
      answer: 2,
      explanation:
        "Every out-of-class definition needs its own template line, in addition to the one above the class itself.",
    },
    {
      prompt: "How do you declare a class template with two independent generic types?",
      choices: [
        "template <typename T1><typename T2>",
        "template <typename T1, typename T2>",
        "template <typename T1 and T2>",
        "template <T1, T2>",
      ],
      answer: 1,
      explanation:
        "Each parameter gets its own typename keyword, separated by a comma inside one pair of angle brackets.",
    },
    {
      prompt: "What does this function return?",
      code: "template <typename T1, typename T2>\nT2  ClassName <T1, T2>::getvar2 ()\n{\n    return var2;\n}",
      choices: [
        "var1, whose type is T1",
        "A pointer to the object",
        "Nothing — it is void",
        "var2, whose type is the second generic type T2",
      ],
      answer: 3,
      explanation:
        "The return type in front of the class name is T2, and the body returns the T2 member var2.",
    },
    {
      prompt: "In the Pair template class, what type are the private members `first` and `second`?",
      code: "private:\n    T first;\n    T second;",
      choices: [
        "first is int and second is char",
        "They are always pointers",
        "Both are T — the single generic type, so both hold the same type",
        "Their types are decided at run time",
      ],
      answer: 2,
      explanation:
        "Pair declares only one generic type, so both members are T and a Pair holds two values of the same type.",
    },
  ],
  items: [
    makeItem({
      id: "templates-01",
      topicId: "templates",
      format: FORMATS.COMPARE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Why use a template function instead of overloaded functions like these?",
      expected:
        "One way to implement an algorithm that works on different data types is through overloaded functions, e.g. void swap(int &first, int &second); void swap(double &first, double &second); void swap(string &first, string &second);. Another way is to use template functions and only write the function once — instead of writing a separate overload per type.",
      criteria: [
        "States overloaded functions require writing a separate version per type",
        "States a template function is written only once and works across types",
      ],
      provenance: {
        sourceId: "cpp-slides-04.1-templates",
        anchor: "#why-use-templates",
        excerpt:
          "- One way to do this is through the use of overloaded functions\n- Example:\n```\nvoid swap(int &first, int &second);\nvoid swap(double &first, double &second);\nvoid swap(string &first, string &second);\n```\n- Another way is to use template functions and only write the function once",
        citation: "Lecture Deck 04.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/templates.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "templates-02",
      topicId: "templates",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "Write a template swap function that works for any type T.",
      expected:
        "template <typename T>\nvoid swap (T &first, T &second)\n{\nT temp = first;\nfirst = second;\nsecond = temp;\n}",
      criteria: [
        "Declares template <typename T> before the function",
        "Takes both parameters by reference as T &first, T &second",
        "Uses a temp of type T to perform the three-step swap",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-04.1-templates",
        anchor: "#swap-template-function",
        excerpt:
          "template <typename T>\nvoid swap (T &first, T &second)\n{\nT temp = first;\nfirst = second;\nsecond = temp;\n}",
        citation: "Lecture Deck 04.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/templates.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "templates-03",
      topicId: "templates",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What does the generic type T in `template <typename T>` actually stand for, and which keyword is used for it in this course?",
      expected:
        "T (or any valid identifier) is a generic type that will match any type we send the function. A function can be defined to take a generic type specified by the keyword typename or class; this course uses typename throughout since it's more readable.",
      criteria: [
        "States T matches any type passed to the function",
        "States typename (not class) is the keyword used, because it's more readable",
      ],
      provenance: {
        sourceId: "cpp-slides-04.1-templates",
        anchor: "#template-functions-typename",
        excerpt:
          "We can define a function to take a generic type specified by the keyword typename or class\n- We will use typename throughout the course as it's more readable",
        citation: "Lecture Deck 04.1",
      },
      extraAtoms: ["#swap-template-function"],
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/templates.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "templates-04",
      topicId: "templates",
      format: FORMATS.CLOZE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Fill in the blank in this out-of-class member function definition for the Pair template class:\n```\ntemplate <typename T>\nvoid Pair ___::setFirst(T value)\n{\nfirst = value;\n}\n```",
      expected: "<T>",
      criteria: [
        "Fills in <T> after Pair",
        "Matches the note that \"<T>\" must be specified with the class name",
      ],
      provenance: {
        sourceId: "cpp-slides-04.1-templates",
        anchor: "#function-definition-out-of-class",
        excerpt:
          "template <typename T>\nvoid Pair <T>::setFirst(T value)\n{\nfirst = value;\n}\n```\nNote that \"<T>\" must be specified with the class name",
        citation: "Lecture Deck 04.1",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/templates.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "templates-05",
      topicId: "templates",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Given `template <typename T1, typename T2> class ClassName { public: void setvars (T1 v1, T2 v2); T2 getvar2 (); private: T1 var1; T2 var2; };`, what type does `getvar2()` return, and what does it return the value of?",
      expected:
        "getvar2() returns T2 — template <typename T1, typename T2> T2 ClassName <T1, T2>::getvar2 () { return var2; } — it returns the value of var2, which is of type T2.",
      criteria: [
        "States the return type is T2",
        "States it returns var2's value",
      ],
      provenance: {
        sourceId: "cpp-slides-04.1-templates",
        anchor: "#function-definitions-two-type",
        excerpt:
          "template <typename T1, typename T2>\nT2 ClassName <T1, T2>::getvar2 ()\n{ return var2;\n}",
        citation: "Lecture Deck 04.1",
      },
      extraAtoms: ["#multiple-types-template-classes"],
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-01",
        promptedFrom: "sources/cpp/templates.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
  ],
};
