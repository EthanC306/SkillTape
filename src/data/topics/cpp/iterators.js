// ─────────────────── cpp · 04.2 STL Containers & Iterators ───────────────────
// Content authored from Course staff's Data Structures lecture deck 04.2, "STL
// Containers & Iterators". Text is original; the code snippets are the deck's own.
// The `flashcards` deck has a different source: it is authored from the drill
// questions the repo owner supplied directly, targeting C++11 hand-written
// linked-list iterators. It therefore ranges past deck 04.2 — into operator--,
// const_iterator, iterator invalidation, and template/linker mechanics.
export default {
  id: "iterators",
  title: "STL Containers & Iterators",
  subtitle: "Data Structures — this, multiset, and writing your own iterator",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "The this pointer",
      body:
        "Sometimes a member function needs the **address of the object it was called on**. C++ gives you a keyword for that: **this**. It is a **pointer** that always points to the **current object** — the one that **invoked** the function. Inside a member function you can reach a field through it with **this->data = 5;**, which changes the data value of the current object to 5, and you can hand out the object's own address with **return this;**.",
      code: "this->data = 5;   // set the current object's data to 5\nreturn this;      // hand back a pointer to the current object",
    },
    {
      heading: "Why containers need iterators",
      body:
        "Containers can have complex types and data structures inside them. For something like a **linked list** there's no easy way to reach an element by an **integer index** — you'd have to walk the chain by hand every time. **Iterators** give you a **standard** way to navigate a container's elements regardless of how it's built internally, hiding the data structure behind familiar operators. The usual toolkit is **begin()** and **end()** (plus the constant versions cbegin() and cend()), operator ++ and operator -- to move, and the **dereference** operator to reach the element the iterator is sitting on.",
    },
    {
      heading: "STL, set, and multiset",
      body:
        "The **Standard Template Library (STL)** is a set of ready-made library classes — vector, set, multiset, and more. **set** and **multiset** differ in exactly one way: a **set cannot have duplicate** elements, while a multiset can. Both keep their elements **ordered**. A multiset also refuses to let you **change** an element once it's inserted, though elements can still be **deleted**, and it ships with an **iterator** whose **++** and **--** operators move in either direction.",
      code:
        "multiset<string> names;\nnames.insert(\"Jack\");\nnames.insert(\"Janet\");\nnames.insert(\"Chrissy\");\nnames.insert(\"Jack\");",
    },
    {
      heading: "Iterating over the elements",
      body:
        "The standard loop runs from **begin()** until the iterator is **not equal to** end(), advancing with **it++**. **Dereferencing** the iterator gets the stored value. Because a multiset is sorted, the output comes out in order — Chrissy, Jack, Jack, Janet — not insertion order. Writing **auto** lets C++ **deduce** the type; here it is really a **multiset<string>::iterator**, which is what older compilers made you spell out in full.",
      code:
        "for (auto it = names.begin(); it != names.end(); it++) {\n    string word = *it;   //get stored string at it\n    cout << word << endl;\n}\n\n// what auto deduced:\n// multiset<string>::iterator it;",
    },
    {
      heading: "The five kinds of iterator",
      body:
        "**Input** iterators let you retrieve data from the object. **Output** iterators let you modify it but not read it back. **Forward** iterators do input and output but move in one direction only. **Bidirectional** iterators add everything above plus movement in either direction. **Random** access iterators go further still, allowing access by **index** as in [i]. The categories **nest** — input and output at the center, wrapped by forward, then bidirectional, with random access outermost — so each level can do everything the level inside it can.",
    },
    {
      heading: "An iterator for your own List class",
      body:
        "Once List provides an iterator you use it exactly like an STL one. Declare it with **List <int>::iterator it;**, set it to **begin()**, compare it against **end()**, and advance it with **++it**. Or skip the long type name and write **auto** — C++ works out the type from the **assignment**.",
      code:
        "List <int>::iterator it;\nfor (it = myList.begin(); it != myList.end(); ++it) {\n    cout << *it;\n}\n\n// same loop, with auto\nfor (auto it = myList.begin(); it != myList.end(); ++it) {\n    cout << *it;\n}",
    },
    {
      heading: "What C++ expects an iterator to declare",
      body:
        "To be a well-behaved iterator, a class must publish some type information. **iterator_category** says which kind it is — one of input_iterator_tag, output_iterator_tag, **forward_iterator_tag**, bidirectional_iterator_tag, or random_access_iterator_tag. **difference_type** is a **signed** integer used to measure the **distance** between two iterators (e.g. ptrdiff_t). **value_type** is the type being iterated over, while **pointer** and **reference** name a pointer to that type and a reference to it.",
    },
    {
      heading: "Designing the Iterator class",
      body:
        "The plan: place the iterator class **inside** the List class, give it a **single private** member that is a **Node pointer**, and declare its category as **forward_iterator_tag**. Then implement a **constructor** and overload the **dereference** operator, ->, and **++** in both **prefix and postfix** forms, along with == and !=.",
    },
    {
      heading: "Iterator: types and constructor",
      body:
        "The three **using** lines publish the type information C++ asks for. The constructor takes the node to start on and **defaults to nullptr** — that default is what makes a plain Iterator() mean **one past the end**.",
      code:
        "template <typename ItDataType>\nclass Iterator {\npublic:\n    using iterator_category = forward_iterator_tag;\n    using difference_type = ptrdiff_t;\n    using value_type = ItDataType;\n\n    // initialize the iterator\n    Iterator(Node<ItDataType> *initial = nullptr) {\n        current = initial;\n    }",
    },
    {
      heading: "Iterator: dereference, arrow, and comparison",
      body:
        "The **dereference** operator returns a **reference** to the data in the current node, so dereferencing the iterator reads — and can even assign to — the stored value. **operator->** returns the **node pointer** itself, which is what lets you write it->getData(). Two iterators compare **equal** when their **current** pointers point at the **same node** — that single comparison is what makes it != myList.end() work, since end() hands back an iterator whose current is **nullptr**.",
      code:
        "// Implement the * operator\nItDataType &operator*() const {\n    return current->getData();\n}\n\nNode<ItDataType> * operator->() {\n    return current;\n}\n\n//More operators\nbool operator==(const Iterator other) const {\n    return current == other.current;\n}\n\nbool operator!=(const Iterator other) const {\n    return current != other.current;\n}",
    },
    {
      heading: "Iterator: prefix vs postfix ++",
      body:
        "Both forms advance current to **getNext()**, but they differ in what they hand back and how they're told apart. **Prefix** (++it) returns **this** by reference — the already-advanced iterator. **Postfix** (it++) is distinguished by a **dummy int parameter**, saves a **copy** of the iterator first, and returns that **original** un-advanced copy. That extra copy is why prefix is the cheaper of the two.",
      code:
        "// overload prefix ++ operator as in ++it\nIterator &operator++() {\n    current = current->getNext();\n    return *this;\n}\n\n// overload postfix ++ operator as in it++\nIterator operator++(int) {\n    Iterator original = *this;\n    current = current->getNext();\n    return original;\n}",
    },
    {
      heading: "Iterator: private data",
      body:
        "All that machinery sits on top of **one** data member, named **current**: a **pointer** to the node the iterator is sitting on. Everything else — dereferencing, comparing, advancing — is just a **thin wrapper** around this single pointer.",
      code: "private:\n    Node<ItDataType> *current;\n};",
    },
    {
      heading: "Constant iterators",
      body:
        "It's desirable to also provide a **constant iterator**, used when the data needs to be **protected** from modification, and STL containers include **both** kinds. The implementation is very similar to the ordinary iterator: **const** appears on the constructor's parameter, on the return types of the **dereference** and **->** operators, and on the private **current** member. Everything else — the ++ overloads, the == and != comparisons — is the same code as before.",
      code:
        "template <typename ItDataType>\nclass ConstIterator {\npublic:\n    using iterator_category = forward_iterator_tag;\n\n    // initialize the iterator\n    ConstIterator(const Node<ItDataType> *initial = nullptr) {\n        current = initial;\n    }\n\n    // Implement the * operator\n    const ItDataType &operator*() const {\n        return current->getData();\n    }\n\n    const Node<ItDataType> *operator->() const {\n        return current;\n    }\n\n    // overload prefix ++ operator as in ++it\n    ConstIterator &operator++() {\n        current = current->getNext();\n        return *this;\n    }\n\n    // overload postfix ++ operator as in it++\n    ConstIterator operator++(int) {\n        ConstIterator original = *this;\n        current = current->getNext();\n        return original;\n    }\n\n    //More operators\n    bool operator==(const ConstIterator other) const {\n        return current == other.current;\n    }\n\n    bool operator!=(const ConstIterator other) const {\n        return current != other.current;\n    }\n\nprivate:\n    const Node<ItDataType> *current;\n};",
    },
    {
      heading: "Wiring the iterators into List",
      body:
        "To make List consistent with STL containers, add four functions. **begin()** and its constant version **cbegin()** both return an iterator to the **first** element — built from **head**. **end()** and **cend()** return one that is **one beyond the last** element, i.e. holding **nullptr**, which is exactly the default-constructed iterator. Also add the member type aliases iterator and const_iterator so callers can declare **List<int>::iterator**.",
      code:
        "using iterator = Iterator<DataType>;\nIterator<DataType> begin() {\n    return Iterator<DataType>(head);\n}\nIterator<DataType> end() {\n    return Iterator<DataType>();\n}\n\nusing const_iterator = ConstIterator<DataType>;\nConstIterator<DataType> cbegin() {\n    return ConstIterator<DataType>(head);\n}\nConstIterator<DataType> cend() {\n    return ConstIterator<DataType>();\n}",
    },
    {
      heading: "Structure of the finished List class",
      body:
        "Everything nests. The file starts with **#include \"node.h\"**, and **inside** the **List** class sit both the **Iterator** and the **Const Iterator** classes. Putting them inside List is what gives them the qualified names **List<int>::iterator** and **List<int>::const_iterator**.",
    },
  ],
  questions: [
    {
      prompt: "What does the keyword `this` refer to inside a member function?",
      choices: [
        "A copy of the object's data",
        "A pointer to the object that invoked the function",
        "The class itself, not any object",
        "The most recently constructed object",
      ],
      answer: 1,
      explanation:
        "this is a pointer that always points to the current object — the one the member function was called on.",
    },
    {
      prompt: "Why can't a linked list's elements be reached with an integer index the way an array's can?",
      choices: [
        "Linked lists are always sorted",
        "Indexes only work on constant data",
        "Linked lists have no elements, only pointers",
        "Its nodes are chained by pointers, so there's no direct offset to element i",
      ],
      answer: 3,
      explanation:
        "You'd have to walk the chain node by node, which is exactly the complexity iterators are designed to hide.",
    },
    {
      prompt: "What is the one difference between set and multiset?",
      choices: [
        "multiset is sorted, set is not",
        "set has an iterator, multiset does not",
        "set cannot hold duplicate elements; multiset can",
        "multiset can only hold strings",
      ],
      answer: 2,
      explanation:
        "Both keep their elements ordered — only the duplicate rule differs.",
    },
    {
      prompt: "What does this program print?",
      code: "multiset<string> names;\nnames.insert(\"Jack\");\nnames.insert(\"Janet\");\nnames.insert(\"Chrissy\");\nnames.insert(\"Jack\");\n\nfor (auto it = names.begin(); it != names.end(); it++) {\n    cout << *it << endl;\n}",
      choices: [
        "Jack, Janet, Chrissy, Jack",
        "Chrissy, Jack, Jack, Janet",
        "Chrissy, Jack, Janet",
        "Jack, Jack, Janet, Chrissy",
      ],
      answer: 1,
      explanation:
        "A multiset keeps elements sorted and allows duplicates, so both Jacks print, in alphabetical order.",
    },
    {
      prompt: "In this loop, what is the real type of `it`?",
      code: "multiset<string> names;\nfor (auto it = names.begin(); it != names.end(); it++) { ... }",
      choices: [
        "multiset<string>::iterator",
        "string",
        "string*",
        "auto is its own type",
      ],
      answer: 0,
      explanation:
        "auto just tells C++ to deduce the type from begin(); older compilers required spelling out multiset<string>::iterator.",
    },
    {
      prompt: "Which iterator category allows access by index, as in [i]?",
      choices: ["Forward", "Bidirectional", "Input", "Random access"],
      answer: 3,
      explanation:
        "Random access is the most capable category and is the only one supporting subscript-style access.",
    },
    {
      prompt: "In the iterator hierarchy, which is true?",
      choices: [
        "A forward iterator can do everything a bidirectional one can",
        "A random access iterator can do everything a bidirectional one can",
        "Input and output iterators are the most capable",
        "The categories are unrelated to each other",
      ],
      answer: 1,
      explanation:
        "The categories nest outward from input/output to random access, so each outer level includes the ones inside it.",
    },
    {
      prompt: "What is difference_type used for?",
      code: "using iterator_category = forward_iterator_tag;\nusing difference_type = ptrdiff_t;\nusing value_type = ItDataType;",
      choices: [
        "The type of data the iterator iterates over",
        "Comparing two iterators for equality",
        "Marking which iterator category the class belongs to",
        "A signed integer measuring the distance between two iterators",
      ],
      answer: 3,
      explanation:
        "difference_type (e.g. ptrdiff_t) is signed precisely because the distance between two iterators can be negative.",
    },
    {
      prompt: "What does operator* return, and why a reference?",
      code: "ItDataType &operator*() const {\n    return current->getData();\n}",
      choices: [
        "A copy of the data, so changes are discarded",
        "The node pointer",
        "A reference to the current node's data, so *it names the stored value itself",
        "A const pointer to the next node",
      ],
      answer: 2,
      explanation:
        "Returning a reference means *it refers to the stored element rather than a throwaway copy.",
    },
    {
      prompt: "What distinguishes the postfix ++ overload from the prefix one?",
      code: "Iterator &operator++() { ... }\nIterator operator++(int) { ... }",
      choices: [
        "The dummy int parameter marks the postfix version",
        "The postfix version takes a real int telling it how far to move",
        "The prefix version must be const",
        "Postfix is the one returning a reference",
      ],
      answer: 0,
      explanation:
        "The unused int parameter exists only so the compiler can tell the two overloads apart.",
    },
    {
      prompt: "What does this postfix ++ return?",
      code: "Iterator operator++(int) {\n    Iterator original = *this;\n    current = current->getNext();\n    return original;\n}",
      choices: [
        "A reference to the advanced iterator",
        "The data at the next node",
        "A copy of the iterator as it was before advancing",
        "Nothing — it modifies in place",
      ],
      answer: 2,
      explanation:
        "It saves the original first and returns that copy, which is why it++ is more expensive than ++it.",
    },
    {
      prompt: "How do two iterators decide whether they are equal?",
      code: "bool operator==(const Iterator other) const {\n    return current == other.current;\n}",
      choices: [
        "They compare their current pointers — same node means equal",
        "They compare the data stored at each node",
        "They compare how many times each has been advanced",
        "They compare the sizes of their lists",
      ],
      answer: 0,
      explanation:
        "Equality is pointer identity: both iterators must be sitting on the same node.",
    },
    {
      prompt: "What does end() return, and why does that stop the loop?",
      code: "Iterator<DataType> end() {\n    return Iterator<DataType>();\n}",
      choices: [
        "An iterator to the last node, so the last element is skipped",
        "A default-constructed iterator whose current is nullptr — the walk stops when it runs off the list",
        "The number of elements in the list",
        "A null reference that causes the loop to throw",
      ],
      answer: 1,
      explanation:
        "The constructor defaults to nullptr, so end() means one past the last element and it != end() fails exactly when the walk finishes.",
    },
    {
      prompt: "In the ConstIterator, what changes compared with the ordinary Iterator?",
      code: "const ItDataType &operator*() const { ... }\nprivate:\n    const Node<ItDataType> *current;",
      choices: [
        "It can only move backward",
        "It stores a copy of the data instead of a pointer",
        "It drops the ++ operators entirely",
        "Its functions return constant pointers and values, so the data can't be modified through it",
      ],
      answer: 3,
      explanation:
        "The implementation is otherwise the same — const is added so the iterator can read but never modify the elements.",
    },
  ],
  flashcards: [
    // ── Prefix vs. postfix ──────────────────────────────────────────────
    {
      front: "What does the unnamed int parameter in Iterator operator++(int) actually do?",
      back:
        "Nothing at run time. It is a dummy tag whose only job is to let the compiler tell the postfix overload apart from the prefix one.",
    },
    {
      front: "Why does prefix operator++ return Iterator&?",
      back:
        "It hands back the iterator itself, already advanced — so a reference to *this is still alive and valid.",
    },
    {
      front: "Why does postfix operator++ return Iterator by value?",
      back:
        "It must hand back the position from before the advance, which survives only as a local copy — so it cannot be returned by reference.",
    },
    {
      front: "What goes wrong if postfix operator++ returns by reference instead of by value?",
      back:
        "It returns a reference to the local copy, which is destroyed on return — a dangling reference, so any use of it is undefined behavior.",
    },
    {
      front: "Write the full body of postfix operator-- for a doubly linked list iterator.",
      back:
        "Iterator operator--(int) {\n    Iterator original = *this;\n    current = current->getPrevious();\n    return original;\n}",
    },
    {
      front: "Given correct implementations, what is the difference in returned value between it++ and ++it?",
      back:
        "it++ evaluates to the position from before the move; ++it evaluates to the position after it.",
    },
    {
      front: "A postfix operator-- compiles fine but it-- behaves identically to --it. What two changes are needed?",
      back:
        "Save the pre-decrement copy, then return that instead of *this:\nIterator original = *this;\nreturn original;",
    },
    {
      front: "Which of prefix/postfix increment is cheaper, and why?",
      back:
        "Prefix — postfix has to construct, hold, and return an extra copy of the iterator.",
    },
    {
      front: "Why can't you distinguish prefix from postfix by return type alone?",
      back:
        "Overload resolution ignores the return type; overloads must differ in their parameters — which is exactly why postfix carries the dummy int.",
    },

    // ── operator* and const ─────────────────────────────────────────────
    {
      front: "Why does ItDataType &operator*() const fail to compile when getData() returns by value?",
      back:
        "A by-value return is a temporary, and binding a non-const lvalue reference to it would mean returning a reference to something already destroyed.",
    },
    {
      front: "In operator*() const, what exactly is the const applying to?",
      back: "The Iterator object itself (*this) — not the data the iterator returns.",
    },
    {
      front: "Inside a const member function of an iterator, what is the type of the current data member?",
      back:
        "DNode<T> *const — a const pointer to a non-const node. The pointer is frozen; what it points at is not.",
    },
    {
      front: "Why can a const-qualified operator* still return a non-const, writable reference?",
      back:
        "const freezes the iterator, not the nodes it points at. The pointee stays non-const, so the element is still writable through it.",
    },
    {
      front: "What must DNode::getData()'s signature be for *it = 5; to compile?",
      back: "DataType &getData();",
    },
    {
      front: "Why is DataType getData() const; and const DataType &getData() const; an illegal overload pair?",
      back:
        "They differ only in return type — identical parameter lists, identical const qualifier — and the return type is not part of the signature.",
    },
    {
      front: "What difference in signature makes const DataType &getData() const; and DataType &getData(); a legal pair?",
      back:
        "The trailing const on the member function. cv-qualification is part of the signature, so these are two distinct overloads.",
    },
    {
      front: "Which overload does the compiler pick when calling getData() through a const DNode*?",
      back: "The const-qualified one: const DataType &getData() const;",
    },

    // ── const_iterator vs. const iterator ───────────────────────────────
    {
      front: "What is the difference between const DList<int>::iterator and DList<int>::const_iterator?",
      back:
        "const iterator: the iterator is frozen, the elements are writable. const_iterator: the iterator moves freely, the elements are read-only.",
    },
    {
      front: "const DList<int>::iterator vs DList<int>::const_iterator — which can you still increment?",
      back: "const_iterator.",
    },
    {
      front: "const DList<int>::iterator vs DList<int>::const_iterator — which can you write through?",
      back: "const DList<int>::iterator — the elements it points at are still non-const.",
    },
    {
      front: "Why does ConstIterator store const DNode<T> *current rather than DNode<T> *const current?",
      back:
        "Pointer-to-const protects the node's data while leaving the pointer free to move. A const pointer does the opposite — it freezes the walk and leaves the data writable.",
    },
    {
      front: "What return type must ConstIterator::operator* have, and why?",
      back:
        "const ItDataType & — so the element can be read through the iterator but never assigned to.",
    },

    // ── Categories and traits ───────────────────────────────────────────
    {
      front: "Name the five iterator category tags in order of increasing capability.",
      back:
        "input_iterator_tag / output_iterator_tag, then forward_iterator_tag, bidirectional_iterator_tag, random_access_iterator_tag. (Input and output are peers, not ranked against each other.)",
    },
    {
      front: "What operations does bidirectional_iterator_tag promise that forward_iterator_tag does not?",
      back: "Decrement — --it and it--.",
    },
    {
      front: "What breaks if an iterator declares forward_iterator_tag but implements operator--?",
      back:
        "Nothing inside the class — but algorithms dispatch on the tag, so anything requiring a bidirectional iterator still rejects it.",
    },
    {
      front: "What is difference_type used for?",
      back:
        "The step count between two iterators — the type std::distance returns. (it2 - it1 exists only at the random-access tier, so not for a list iterator.)",
    },
    {
      front: "Why is difference_type ptrdiff_t rather than size_t?",
      back: "Distances can run backwards, so the type has to be signed. size_t is unsigned.",
    },
    {
      front: "Why can a linked-list iterator never be random_access_iterator_tag?",
      back:
        "Nodes are not contiguous — reaching element i means walking i links, while random access requires constant-time it + n.",
    },
    {
      front: "Which category does std::sort require, and why does that exclude std::list?",
      back:
        "Random access. std::list's iterators are only bidirectional, which is why list ships its own member sort.",
    },

    // ── begin / end / ranges ────────────────────────────────────────────
    {
      front: "What node does end() point to in a null-terminated linked list?",
      back: "No node at all — it holds nullptr, standing for one position past the last element.",
    },
    {
      front: "Why is the STL range half-open ([begin, end)) rather than closed?",
      back:
        "So an empty sequence has a representation: begin == end. A closed range has no way to say 'no elements'.",
    },
    {
      front: "What does begin() == end() indicate?",
      back: "The container is empty.",
    },
    {
      front: "Why does *it when it == end() cause a segfault in a hand-written list iterator?",
      back: "end() holds nullptr, so operator* runs current->getData() on a null pointer.",
    },
    {
      front: "What does --end() have to return for a container to satisfy the bidirectional requirements?",
      back: "An iterator to the last element.",
    },
    {
      front: "Why is --end() hard to implement when the end iterator holds nullptr?",
      back: "nullptr carries no link back — there is no node to step backwards from.",
    },
    {
      front: "What extra member does an iterator usually need so that --end() can reach the tail?",
      back:
        "A pointer to the owning list (or straight to its tail node), so a null current can still be resolved to the last node.",
    },

    // ── Comparison and equality ─────────────────────────────────────────
    {
      front: "What does operator== compare in a node-based iterator?",
      back:
        "The stored node pointers — current == other.current. It is identity of position, not a comparison of the stored values.",
    },
    {
      front: "Why should operator== take its parameter by const& rather than by value?",
      back:
        "By value copies the whole iterator on every comparison — including once per iteration in it != end().",
    },
    {
      front: "Why must operator!= be defined even though operator== exists (in C++11)?",
      back:
        "C++11 does not synthesise != from ==; that rewriting only arrives in C++20. Without it, it != end() will not compile.",
    },

    // ── Invalidation ────────────────────────────────────────────────────
    {
      front: "What happens to an iterator pointing at a node that is then passed to deleteNode?",
      back:
        "It dangles — current still holds the freed address, so dereferencing or advancing it is undefined behavior.",
    },
    {
      front: "Why does inserting into a std::vector invalidate iterators while inserting into a std::list does not?",
      back:
        "vector, two ways: reallocation can move every element, and even with no reallocation, insertion shifts everything at or after the insertion point. List nodes never move — only the links between them change.",
    },
    {
      front: "Is an iterator to a node still valid after headInsert on a linked list — and why?",
      back:
        "Yes — headInsert allocates a new node and repoints head. Every existing node stays exactly where it was.",
    },

    // ── Nested template mechanics ───────────────────────────────────────
    {
      front: "Does a nested Iterator need its own template parameter inside DList<DataType> — and why?",
      back:
        "No. A nested class already sees the enclosing DataType. Its own parameter only buys an Iterator that can be named and instantiated independently of one DList instantiation.",
    },
    {
      front: "Inside DList<DataType>, can the bare name Iterator be used as a type — and why?",
      back: "No — there it names the class template, so it needs arguments: Iterator<DataType>.",
    },
    {
      front: "Where does the bare name Iterator mean a complete type, with no arguments?",
      back:
        "Inside Iterator's own body — the injected-class-name, standing for the current instantiation.",
    },
    {
      front: "What does using iterator = Iterator<DataType>; inside the class accomplish?",
      back:
        "It gives DList the STL-standard member type name, so callers can write DList<int>::iterator.",
    },
    {
      front: "Why must a templated class's implementation be #included at the bottom of the header?",
      back:
        "The compiler needs the full definition in the same translation unit to instantiate the template for each type actually used.",
    },
    {
      front: "What linker error appears when a template's definitions live in a separately compiled .cpp?",
      back:
        "'undefined reference' (GCC/Clang) or LNK2019 unresolved external symbol (MSVC) — no instantiation was ever emitted.",
    },
  ],
};
