// ─────────────────── c++ · 05.3 Derived Classes ───────────────────
// Text is original; the code snippets are the deck's own.
import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

export default {
  id: "derived-classes",
  title: "Derived Classes",
  subtitle: "inheritance, virtual functions, polymorphism",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0, 2026-08-01): default — not covered by the
  // diagnostic quiz or self-reported struggle list, not "known easy."
  examWeight: 1.0,
  cards: [
    {
      heading: "Inheritance",
      body:
        "**Inheritance** is a relation between a general class and a more specialized class. The general class is called the **base class**, and the specialized class is called the **derived class**. The derived class **inherits** all the characteristics — data and functions — of the base class, and it adds more data and functions that aren't in the base class.",
    },
    {
      heading: "The is-a relationship",
      body:
        "All basketball players are athletes, but not all athletes are basketball players — that asymmetry is described with the relation **is-a**: a basketball player is-an athlete. In this example, **Athlete** is the base class, and **BasketballPlayer** and **BaseballPlayer** are the derived classes.",
    },
    {
      heading: "Planning the classes",
      body:
        "The Athlete class has a **name** and an **age**, a constructor to initialize them, getters and setters, and a function that **displays** the member data. BasketballPlayer includes all of Athlete's data and functions and adds **ppg** — points per game. BaseballPlayer does the same, adding **battingAverage** instead.",
    },
    {
      heading: "The Athlete base class",
      body:
        "Athlete's constructor takes a name and an age; getName, getAge, setName, and setAge are simple one-liners; **display** is only declared here, defined separately. **name** and **age** stay **private**.",
      code:
        "class Athlete {\npublic:\nAthlete(string newName, size_t newAge);\nstring getName() {return name;}\nsize_t getAge() {return age;}\nvoid setName(string newName){name = newName;}\nvoid setAge(size_t newAge){age = newAge;}\nvoid display();\nprivate:\nstring name;\nsize_t age;\n};",
    },
    {
      heading: "Athlete's constructor and display",
      body:
        "The constructor just copies its two parameters into the two data members. display prints **Name** and **Age**, each on its own line, using **cout** and **endl**.",
      code:
        "Athlete::Athlete(string newName, size_t newAge){\nname = newName;\nage = newAge;\n}\nvoid Athlete::display(){\ncout << \"Name: \" << name << endl;\ncout << \"Age: \" << age << endl;\n}",
    },
    {
      heading: "Declaring the BasketballPlayer class",
      body:
        "Inheritance is written with a colon and the base class name at the class definition: class BasketballPlayer **: public Athlete** { ... };. This says BasketballPlayer **inherits from** Athlete, so it has all of Athlete's properties and functions automatically, plus its own new member, **ppg**, and its own **display**.",
      code:
        "class BasketballPlayer : public Athlete{\npublic:\nBasketballPlayer(string newName, size_t newAge, double newPpg);\ndouble getPpg() {return ppg;}\nvoid setPpg(double newPpg){ppg = newPpg;}\nvoid display();\nprivate:\ndouble ppg;\n};",
    },
    {
      heading: "public vs. private inheritance",
      body:
        "Inheriting with the **private** keyword restricts things sharply: you can't call a base member function on a derived object from outside, and the derived class still can't touch the base's private members. Inheriting with **public** fixes both — it lets a derived class access the base's private data through its interface, and lets outside code call the base's public functions through a derived object. The rule of thumb: **always use public inheritance**.",
    },
    {
      heading: "Calling the base constructor",
      body:
        "A derived class's constructor has to initialize the base part of the object too, so it calls the base constructor in its **initializer list**: BasketballPlayer::BasketballPlayer(...) **: Athlete(newName, newAge)** { ppg = newPpg; }. The base constructor runs **first**, then the derived body sets the new member.",
      code:
        "BasketballPlayer::BasketballPlayer(string newName, size_t newAge, double newPpg)\n:Athlete(newName, newAge){\nppg = newPpg;\n}",
    },
    {
      heading: "Calling a base class function",
      body:
        "To call a specific base class version of a function, use the notation **BaseClassName::function()** — for example, **Athlete::display()**. BasketballPlayer's own display calls Athlete::display() **first**, to print name and age, then prints **PPG** itself — so the base and derived logic each handle their own part instead of duplicating code.",
      code:
        "void BasketballPlayer::display(){\nAthlete::display(); //call Athlete's display()\ncout << \"PPG: \" << ppg << endl;\n}",
    },
    {
      heading: "BaseballPlayer, symmetrically",
      body:
        "BaseballPlayer follows the exact same pattern as BasketballPlayer: it adds **battingAverage**, its constructor calls Athlete(newName, newAge) in its initializer list, and its display calls **Athlete::display()** before printing its own **Batting average** line.",
      code:
        "class BaseballPlayer : public Athlete{\npublic:\nBaseballPlayer(string newName, size_t newAge, double newBattingAverage);\ndouble getBattingAverage() {return battingAverage;}\nvoid setBattingAverage(double newBattingAverage){battingAverage = newBattingAverage;}\nvoid display();\nprivate:\ndouble battingAverage;\n};\n\nBaseballPlayer::BaseballPlayer(string newName, size_t newAge, double newBattingAverage)\n:Athlete(newName, newAge){\nbattingAverage = newBattingAverage;\n}\nvoid BaseballPlayer::display(){\nAthlete::display(); //call Athlete's display()\ncout << \"Batting average: \" << battingAverage << endl;\n}",
    },
    {
      heading: "The problem with non-virtual display",
      body:
        "A basketball player **is-an** athlete, so a single **Athlete* players[]** array can store a mix of Athlete, BasketballPlayer, and BaseballPlayer objects. But looping over it and calling **players[i]->display()** calls **Athlete's display** for every element regardless of what each pointer actually points to — the compiler picks which display to run based on the pointer's **declared type**, not the object's actual type.",
      code:
        "Athlete* players[5];\nplayers[0] = player1;\nplayers[1] = player2;\nplayers[2] = player3;\nfor (size_t i = 0; i < 3; i++){\nplayers[i]->display();\n}",
    },
    {
      heading: "Virtual functions fix it",
      body:
        "Marking display **virtual** in the base class — **virtual void display();** — tells the compiler to look for a **native implementation** in the object's actual class first, falling back to the base's version only if the derived class doesn't override it. virtual is only needed on the **base class's declaration**; every overriding display in a derived class is virtual **by default**.",
    },
    {
      heading: "Polymorphism",
      body:
        "**Polymorphism** is Greek for **having multiple forms**. Once display is virtual, the same players[i]->display() loop produces different output per object — Athlete's Name/Age, BasketballPlayer's added PPG line, BaseballPlayer's added Batting average line. A collection like this, where the same call resolves differently per object, is called **polymorphic**.",
    },
  ],
  questions: [
    {
      prompt: "What is the relationship between a base class and a derived class?",
      choices: [
        "The derived class is a more general version of the base class, and the base class supplies the specifics",
        "The base class and derived class share no data or functions",
        "The base class inherits from the derived class",
        "The derived class inherits the base class's data and functions, then adds its own",
      ],
      answer: 3,
      explanation:
        "Inheritance flows from base to derived: the derived class gets everything the base class has, plus whatever new members it defines itself.",
    },
    {
      prompt: "In the Athlete / BasketballPlayer / BaseballPlayer example, which is the base class?",
      choices: ["BasketballPlayer", "BaseballPlayer", "Athlete", "All three are base classes"],
      answer: 2,
      explanation:
        "Athlete is the general class both BasketballPlayer and BaseballPlayer specialize, making it the base class.",
    },
    {
      prompt: "What does \"a basketball player is-an athlete\" mean here?",
      choices: [
        "is-a denotes inheritance — BasketballPlayer is derived from Athlete",
        "BasketballPlayer and Athlete are unrelated classes",
        "Athlete is derived from BasketballPlayer",
        "Athlete and BasketballPlayer must be the same class, since is-a makes them interchangeable",
      ],
      answer: 0,
      explanation:
        "is-a is the standard way to describe an inheritance relationship: the more specialized class is-a instance of the general one.",
    },
    {
      prompt: "How do you declare that BasketballPlayer inherits from Athlete?",
      code: "class BasketballPlayer : public Athlete{\n....\n};",
      choices: [
        "class BasketballPlayer extends Athlete { ... };",
        "class BasketballPlayer : public Athlete{ ... };",
        "class BasketballPlayer(Athlete) { ... };",
        "class Athlete : public BasketballPlayer{ ... };",
      ],
      answer: 1,
      explanation:
        "C++ denotes inheritance with a colon and the access specifier before the base class name at the class definition.",
    },
    {
      prompt: "What is the difference between public and private inheritance?",
      choices: [
        "private inheritance blocks outside code from calling the base's public functions through a derived object",
        "public inheritance is only for structs, private only for classes",
        "There is no difference; both behave identically",
        "private inheritance gives the derived class access to more of the base than public inheritance does, including its private members",
      ],
      answer: 0,
      explanation:
        "Private inheritance hides the base's public interface from outside code accessing it through a derived object; public inheritance keeps it accessible, which is why public inheritance should always be used.",
    },
    {
      prompt: "Why does BasketballPlayer's constructor write \":Athlete(newName, newAge)\" before its body?",
      code:
        "BasketballPlayer::BasketballPlayer(string newName, size_t newAge, double newPpg)\n:Athlete(newName, newAge){\nppg = newPpg;\n}",
      choices: [
        "It's a comment explaining the parameters",
        "It declares newName and newAge as local variables",
        "It calls the Athlete base constructor to initialize the inherited name and age",
        "It's required syntax with no functional effect — the compiler ignores anything written after the colon",
      ],
      answer: 2,
      explanation:
        "The initializer list is how a derived class constructor runs the base class constructor first, so the inherited part of the object is properly set up before the derived body executes.",
    },
    {
      prompt: "What does the call to Athlete::display() inside BasketballPlayer::display() do?",
      code:
        "void BasketballPlayer::display(){\nAthlete::display(); //call Athlete's display()\ncout << \"PPG: \" << ppg << endl;\n}",
      choices: [
        "It recompiles Athlete's display for BasketballPlayer so the inherited members print in the right order",
        "It does nothing since display is overridden",
        "It causes infinite recursion",
        "It prints Name and Age using Athlete's own display logic, before PPG is printed",
      ],
      answer: 3,
      explanation:
        "BaseClassName::function() explicitly invokes the base class's version, letting BasketballPlayer reuse Athlete's Name/Age printing instead of duplicating it.",
    },
    {
      prompt:
        "Before virtual is added, why does players[i]->display() call Athlete's display for every element, even when players[i] actually points to a BasketballPlayer?",
      code:
        "Athlete* players[5];\nplayers[0] = player1;\nplayers[1] = player2;\nplayers[2] = player3;\nfor (size_t i = 0; i < 3; i++){\nplayers[i]->display();\n}",
      choices: [
        "Because BasketballPlayer inherits display() from Athlete instead of defining a version of its own",
        "Because without virtual the compiler binds display() to the pointer's declared type, Athlete*",
        "Because arrays of pointers can't call member functions at all",
        "Because display() is private in Athlete",
      ],
      answer: 1,
      explanation:
        "Without virtual, function calls through a pointer resolve at compile time based on the pointer's declared type, so an Athlete* always calls Athlete's version regardless of what it actually points to.",
    },
    {
      prompt: "What does declaring \"virtual void display();\" in Athlete change?",
      choices: [
        "It makes display() run faster by letting the compiler resolve every call at compile time instead of at run time",
        "It makes display() private",
        "It tells the compiler to use the actual object's own display() first, falling back to Athlete's if it has none",
        "It deletes Athlete's own display function",
      ],
      answer: 2,
      explanation:
        "virtual switches display() to resolve based on the object's actual runtime type instead of the pointer's declared type.",
    },
    {
      prompt: "Do BasketballPlayer's and BaseballPlayer's own display() overrides need to be marked virtual too?",
      choices: [
        "Yes, every override must repeat the virtual keyword or it won't work",
        "Only BaseballPlayer's needs it, not BasketballPlayer's",
        "virtual can only be used in the base class, and every derived override needs the override keyword instead",
        "No — an override is automatically virtual once the base declares it virtual",
      ],
      answer: 3,
      explanation:
        "The virtual keyword only needs to appear on the base class's declaration; every derived override of that function is virtual by default.",
    },
    {
      prompt: "What does \"polymorphism\" mean here?",
      choices: [
        "A compiler error caused by inheriting the same function from two different base classes",
        "Storing only one type of object in an array",
        "The same call through an Athlete pointer resolving differently per object's actual type",
        "A synonym for private inheritance",
      ],
      answer: 2,
      explanation:
        "Polymorphism (\"multiple forms\") is exactly this: one call site whose behavior varies by the actual object being called on.",
    },
    {
      prompt:
        "After adding virtual, what does the loop print for players[1], a BasketballPlayer named Jim with ppg 33.5?",
      code:
        "Name: Bob\nAge: 22\nName: Jim\nAge: 23\nPPG: 33.5\nName: John\nAge: 28\nBatting average: 0.257",
      choices: ["Name: Jim / Age: 23", "PPG: 33.5", "Name: Jim / Age: 23 / PPG: 33.5", "Name: Jim / Age: 23 / Batting average: 33.5"],
      answer: 2,
      explanation:
        "BasketballPlayer::display() calls Athlete::display() for Name/Age, then adds its own PPG line, so all three lines print together.",
    },
    {
      prompt: "Why can an Athlete* array legally hold BasketballPlayer and BaseballPlayer pointers?",
      choices: [
        "Because C++ allows any pointer type to hold any object",
        "Because BasketballPlayer and BaseballPlayer each is-a Athlete, so an Athlete pointer can hold either",
        "Because Athlete, BasketballPlayer, and BaseballPlayer all share the same memory layout by coincidence",
        "Because the array was declared with the auto keyword",
      ],
      answer: 1,
      explanation:
        "Since a BasketballPlayer is-an Athlete (and likewise for BaseballPlayer), an Athlete pointer is a compatible way to refer to either one.",
    },
  ],
  items: [
    makeItem({
      id: "derived-classes-01",
      topicId: "derived-classes",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "What is inheritance, and what does the is-a relationship mean, using the Athlete/BasketballPlayer/BaseballPlayer example?",
      expected:
        "Inheritance is a relation between a general class (the base class) and a more specialized class (the derived class) — the derived class inherits all the base class's data and functions and adds more of its own. is-a describes this relation: a basketball player is-an athlete, so Athlete is the base class and BasketballPlayer and BaseballPlayer are the derived classes.",
      criteria: [
        "States the base/derived class relationship and that the derived class inherits from and adds to the base",
        "States is-a denotes inheritance, with Athlete as the base and BasketballPlayer/BaseballPlayer as derived classes",
      ],
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#inheritance-concept",
        excerpt:
          "- In Object Oriented design inheritance is a relation between a general class and a more specialized class\n- The general class is called the base class\n- The specialized class is called the derived class\n- The derived class inherits all the characteristics (data & functions) of the base class\n- The derived class adds more data and functions that are not in the base class\n- All basketball players are athletes but not all athletes are basketball players\n- We can use the relation is-a to describe this relation\n- A basketball player is-an athlete\n- is-a denotes inheritance\n- Athlete is the base class\n- BasketballPlayer and BaseballPlayer are the derived classes",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-02",
      topicId: "derived-classes",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What is the difference between public and private inheritance?",
      expected:
        "With private inheritance, only the derived class itself can access the base's public functions — you can't call a base member function on a derived object from outside, and the derived class still can't access the base's private members. Public inheritance solves this: it lets a derived class access the base's private data through its interface, and lets outside code call the base's public functions through a derived object. You should always use public inheritance.",
      criteria: [
        "States private inheritance blocks outside code from calling the base's public functions through a derived object",
        "States public inheritance is the one that should always be used",
      ],
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#public-vs-private-inheritance",
        excerpt:
          "- When a class uses the private keyword to inherit from a base class,\n- Only the derived class can access the public functions of the base\n- For example, you can't call a base member function in a main program using a derived class object\n- A derived class can't access private members of the base class\n- Using the public keyword solves this issue\n- It allows a derived class to access a base class's private data\n- It allows public access to the base's class public functions\n- You should always use public inheritance",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-03",
      topicId: "derived-classes",
      format: FORMATS.WRITE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Write the BasketballPlayer constructor, given the base constructor Athlete(newName, newAge) and a ppg data member.",
      expected:
        "BasketballPlayer::BasketballPlayer(string newName, size_t newAge, double newPpg)\n:Athlete(newName, newAge){\nppg = newPpg;\n}",
      criteria: [
        "Calls the base constructor Athlete(newName, newAge) in the initializer list",
        "Sets ppg = newPpg in the constructor body",
      ],
      timeBudgetSec: 120,
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#basketballplayer-constructor",
        excerpt:
          "BasketballPlayer::BasketballPlayer(string newName, size_t newAge, double newPpg)\n:Athlete(newName, newAge){\nppg = newPpg;\n}",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-04",
      topicId: "derived-classes",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace this loop, assuming Athlete::display() is NOT declared virtual, and players[1] actually points to a BasketballPlayer object:\n```\nAthlete* players[5];\nplayers[0] = player1;\nplayers[1] = player2;\nplayers[2] = player3;\nfor (size_t i = 0; i < 3; i++){\nplayers[i]->display();\n}\n```\nWhich display() runs for players[1], and why?",
      expected:
        "Athlete::display() runs for every element, including players[1], even though players[1] actually points to a BasketballPlayer. Without virtual, the compiler resolves display() based on the pointer's declared type (Athlete*), not the object's actual runtime type, so BasketballPlayer's own display() — and its PPG line — never runs.",
      criteria: [
        "States Athlete's display runs for players[1], not BasketballPlayer's",
        "Explains this is because resolution is based on the declared pointer type (Athlete*), not the actual object type, without virtual",
      ],
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#array-of-athletes-problem",
        excerpt:
          "Athlete* players[5];\nplayers[0] = player1;\nplayers[1] = player2;\nplayers[2] = player3;\nfor (size_t i = 0; i < 3; i++){\nplayers[i]->display();\n}",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-05",
      topicId: "derived-classes",
      format: FORMATS.ERROR,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "This array-of-Athlete-pointers loop compiles and runs, but BasketballPlayer's PPG and BaseballPlayer's batting average never print — every element prints only Name and Age. What's the bug, and what's the fix?",
      expected:
        "The bug is that Athlete::display() is declared as an ordinary (non-virtual) function, so the compiler picks which display() to call based on each pointer's declared type (Athlete*) rather than the object it actually points to. The fix is to declare display() virtual in Athlete (virtual void display();) — then the call resolves to each object's own override at runtime, and derived overrides are virtual automatically.",
      criteria: [
        "Names the bug as display() not being declared virtual, so calls resolve by declared pointer type",
        "States the fix is adding virtual to Athlete's display() declaration",
      ],
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#array-of-athletes-problem",
        excerpt:
          "- There is a problem with the previous code. Each of the objects calls the Athlete's display function and not the one that belongs to it\n- How can we ensure that the appropriate display function is called?\n- We can achieve this by designating the display function as a virtual function",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-06",
      topicId: "derived-classes",
      format: FORMATS.RECALL,
      origin: ITEM_ORIGIN.GENERATED,
      prompt: "What does declaring a function virtual do, and do derived class overrides need the virtual keyword too?",
      expected:
        "Declaring a function virtual (e.g. virtual void display();) tells the compiler to look for a native implementation of that function in the object's actual class first, and only fall back to the base class's version if the derived class doesn't override it. virtual is only needed in the base class's declaration — by default, all overriding display() functions in derived classes are also virtual.",
      criteria: [
        "States virtual makes the compiler look for the actual object's own implementation, falling back to the base version otherwise",
        "States derived overrides are virtual by default and don't need to repeat the keyword",
      ],
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#virtual-functions",
        excerpt:
          "- We can designate a function as virtual by specifying the keyword virtual at the function declaration\n- This informs the designers of the derived classes that they should implement these functions\n- In the Athlete class: virtual void display();\n- The keyword virtual is only needed in the function's declaration\n- Be default, all display() functions in the derived classes are also virtual",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 1,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-07",
      topicId: "derived-classes",
      format: FORMATS.TRACE,
      origin: ITEM_ORIGIN.GENERATED,
      prompt:
        "Trace the SAME loop as before, now that Athlete::display() is declared virtual. What does it print for players[0..2] — an Athlete named Bob, a BasketballPlayer named Jim with ppg 33.5, and a BaseballPlayer named John with battingAverage 0.257?",
      expected:
        "Name: Bob / Age: 22 (Athlete's own display), then Name: Jim / Age: 23 / PPG: 33.5 (BasketballPlayer's display, which calls Athlete::display() for the first two lines then adds PPG), then Name: John / Age: 28 / Batting average: 0.257 (BaseballPlayer's display, same pattern). Each pointer now calls its own object's actual override — this is polymorphism.",
      criteria: [
        "States each element now prints its own type's fields (base fields plus the derived-only field), not just Name/Age",
        "Identifies this behavior as polymorphism — the call resolving differently per actual object type",
      ],
      provenance: {
        sourceId: "cpp-slides-05.3-derived-classes",
        anchor: "#virtual-output",
        excerpt: "Name: Bob\nAge: 22\nName: Jim\nAge: 23\nPPG: 33.5\nName: John\nAge: 28\nBatting average: 0.257",
        citation: "Lecture Deck 05.3",
      },
      generationMeta: {
        model: "claude-sonnet-5",
        generatedAt: "2026-08-03",
        promptedFrom: "sources/cpp/derived-classes.md",
      },
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-mcq-01",
      topicId: "derived-classes",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What is the relationship between a base class and a derived class?",
      choices: [
        "The derived class is a more general version of the base class, and the base class supplies the specifics",
        "The base class and derived class share no data or functions",
        "The base class inherits from the derived class",
        "The derived class inherits the base class's data and functions, then adds its own",
      ],
      answerIndex: 3,
      expected: "The derived class inherits the base class's data and functions, then adds its own",
      criteria: [
        "Inheritance flows from base to derived: the derived class gets everything the base class has, plus whatever new members it defines itself.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-mcq-02",
      topicId: "derived-classes",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What does \"a basketball player is-an athlete\" mean here?",
      choices: [
        "is-a denotes inheritance — BasketballPlayer is derived from Athlete",
        "BasketballPlayer and Athlete are unrelated classes",
        "Athlete is derived from BasketballPlayer",
        "Athlete and BasketballPlayer must be the same class, since is-a makes them interchangeable",
      ],
      answerIndex: 0,
      expected: "is-a denotes inheritance — BasketballPlayer is derived from Athlete",
      criteria: [
        "is-a is the standard way to describe an inheritance relationship: the more specialized class is-a instance of the general one.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-mcq-03",
      topicId: "derived-classes",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "How do you declare that BasketballPlayer inherits from Athlete?\n```\nclass BasketballPlayer : public Athlete{\n....\n};\n```",
      choices: [
        "class BasketballPlayer extends Athlete { ... };",
        "class BasketballPlayer : public Athlete{ ... };",
        "class BasketballPlayer(Athlete) { ... };",
        "class Athlete : public BasketballPlayer{ ... };",
      ],
      answerIndex: 1,
      expected: "class BasketballPlayer : public Athlete{ ... };",
      criteria: [
        "C++ denotes inheritance with a colon and the access specifier before the base class name at the class definition.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-mcq-04",
      topicId: "derived-classes",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "Before virtual is added, why does players[i]->display() call Athlete's display for every element, even when players[i] actually points to a BasketballPlayer?\n```\nAthlete* players[5];\nplayers[0] = player1;\nplayers[1] = player2;\nplayers[2] = player3;\nfor (size_t i = 0; i < 3; i++){\nplayers[i]->display();\n}\n```",
      choices: [
        "Because BasketballPlayer inherits display() from Athlete instead of defining a version of its own",
        "Because without virtual the compiler binds display() to the pointer's declared type, Athlete*",
        "Because arrays of pointers can't call member functions at all",
        "Because display() is private in Athlete",
      ],
      answerIndex: 1,
      expected: "Because without virtual the compiler binds display() to the pointer's declared type, Athlete*",
      criteria: [
        "Without virtual, function calls through a pointer resolve at compile time based on the pointer's declared type, so an Athlete* always calls Athlete's version regardless of what it actually points to.",
      ],
      // Hand-authored course question promoted from this topic's legacy
      // questions[]. No source excerpt exists to cite, so provenance stays
      // null rather than being invented — see migrateLegacyQuestion.
      provenance: null,
      difficulty: 2,
      verifiedByHuman: true,
    }),
    makeItem({
      id: "derived-classes-mcq-05",
      topicId: "derived-classes",
      format: FORMATS.MCQ,
      origin: ITEM_ORIGIN.MANUAL,
      prompt: "What does declaring \"virtual void display();\" in Athlete change?",
      choices: [
        "It makes display() run faster by letting the compiler resolve every call at compile time instead of at run time",
        "It makes display() private",
        "It tells the compiler to use the actual object's own display() first, falling back to Athlete's if it has none",
        "It deletes Athlete's own display function",
      ],
      answerIndex: 2,
      expected: "It tells the compiler to use the actual object's own display() first, falling back to Athlete's if it has none",
      criteria: [
        "virtual switches display() to resolve based on the object's actual runtime type instead of the pointer's declared type.",
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
