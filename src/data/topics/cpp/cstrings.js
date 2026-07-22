export default {
  id: "cstrings",
  title: "C-Style Strings",
  subtitle: "CS 2401 — <cstring>",
  course: "cpp",
  showChart: false,
  cards: [
    {
      heading: "What a C-string is",
      body:
        "A C-style string is just an **array of characters** with a special ending marker: the **null terminator** '\\0' (a byte equal to 0). The '\\0' tells the computer where the text stops, so the array can be bigger than the text inside it. Example: char s[100] = \"Hi\"; uses **3 slots** — 'H', 'i', and '\\0'. String functions look for that '\\0' to find the end.",
    },
    {
      heading: "Initializing safely",
      body:
        "When you set a string from text in quotes, the '\\0' is added for you. So char name[] = \"Smith\"; has **size 6** — five letters plus the terminator. But if you list the characters yourself, no '\\0' is added: char bad[] = {'S','m','i','t','h'}; is only five bytes and is **not a valid C-string**. Rule of thumb: always leave one extra slot for the '\\0'.",
    },
    {
      heading: "Reading input",
      body:
        "cin >> name skips spaces at the start, then stops at the next space — so it reads **only one word**. To read a whole line, spaces included, use **cin.getline(name, length)**. It reads up to length − 1 characters, or until you press Enter. You can also add a stop character, like cin.getline(name, 10, '!'), which stops when it reaches '!'.",
    },
    {
      heading: "Core <cstring> functions",
      body:
        "Add #include <cstring> to unlock these helpers. **strlen(s)** counts the characters, not counting '\\0' — so strlen(\"Smith\") is 5. **strncpy(dst, src, n)** copies up to n characters, and **strncat(dst, src, n)** tacks up to n characters onto the end. **strncmp(a, b, n)** compares the first n characters: it gives 0 if they match, a negative number if a is smaller, and a positive number if a is bigger.",
    },
    {
      heading: "Building a string by hand",
      body:
        "Say you read characters one at a time into name. When you're done, you must **add the '\\0' yourself**: name[i] = '\\0';. Skip that line and the array is just loose characters with **no end marker** — strlen or cout will run right past it into other memory. Remember: reading character-by-character never adds the '\\0' for you.",
    },
    {
      heading: "Why terminators matter",
      body:
        "The '\\0' is what keeps your code safe. Without it, strlen and cout keep reading memory until they *happen* to hit a zero byte — which can leak data or crash the program. Running past the end of an array like this is called a **buffer overflow**, and it's a classic security bug. That's why modern C++ prefers **std::string**, which keeps track of its own length for you.",
    },
    {
      heading: "The strncpy pitfall",
      body:
        "Watch out: **strncpy doesn't always add the '\\0'**. If the source text is n characters or longer, strncpy(dst, src, n) copies exactly n characters and stops — leaving dst with no terminator. The fix is to **add it yourself afterward**: dst[n - 1] = '\\0';. Forgetting this is a common cause of garbled output and overflow bugs.",
    },
  ],
  questions: [
    {
      prompt: "What marks the end of a C-style string?",
      choices: ["A semicolon", "The null character '\\0'", "A newline '\\n'", "The last index of the array"],
      answer: 1,
      explanation:
        "A C-string is a char array terminated by the null character '\\0' (ASCII 0). Library functions rely on it to know where the string stops.",
    },
    {
      prompt: "What is the size of the array name3?",
      code: 'char name3[] = "Smith";',
      choices: ["5", "6", "7", "Depends on the compiler"],
      answer: 1,
      explanation:
        '"Smith" is 5 characters, plus the \'\\0\' that string-literal initialization adds automatically → size 6.',
    },
    {
      prompt: "Which of these does NOT add a null terminator?",
      choices: [
        'char a[100] = "Smith";',
        'char b[] = "Smith";',
        "char c[] = {'S','m','i','t','h'};",
        "All of them add one automatically",
      ],
      answer: 2,
      explanation:
        "Brace-initializing with individual chars stores exactly those 5 characters with no '\\0'. Only string-literal initialization adds the terminator for you.",
    },
    {
      prompt: 'With the input "  hello world", what ends up in st?',
      code: "char st[100];\ncin >> st;",
      choices: ['"  hello"', '"hello world"', '"hello"', '"world"'],
      answer: 2,
      explanation:
        "operator>> skips leading whitespace, then reads until the next whitespace — so it stops at the space and stores \"hello\".",
    },
    {
      prompt: "You need to read a full line, spaces included, into a char array. Which call do you use?",
      choices: ["cin >> name;", "cin.getline(name, length);", "strlen(name);", "name = cin;"],
      answer: 1,
      explanation:
        "cin.getline(name, length) reads characters including whitespace until the newline (or length-1 chars). operator>> would stop at the first space.",
    },
    {
      prompt: "What does the third argument do here?",
      code: "cin.getline(name, 10, '!');",
      choices: [
        "Limits the line to 10 lines",
        "Reads until the delimiter '!' is reached",
        "Skips all '!' characters",
        "Pads the string with '!'",
      ],
      answer: 1,
      explanation:
        "The optional third argument is a delimiter — getline reads until it hits that character instead of the newline.",
    },
    {
      prompt: "After reading a string one character at a time into an array, what must you do?",
      code: "for (i = 0; i < 10; i++) {\n    cin >> name[i];\n}",
      choices: [
        "Nothing — it's automatic",
        "Manually set name[i] = '\\0'",
        "Call strlen(name)",
        "Reverse the array",
      ],
      answer: 1,
      explanation:
        "Reading char-by-char never adds a terminator, so you must append '\\0' yourself or the array isn't a valid C-string.",
    },
    {
      prompt: "What does strlen return for the string \"Smith\"?",
      choices: ["4", "5", "6", "It depends on the array size"],
      answer: 1,
      explanation:
        "strlen counts characters up to but not including the '\\0' terminator → 5.",
    },
    {
      prompt: "strncmp(str1, str2, limit) returns 0 when…",
      choices: [
        "the first limit characters are equal",
        "str1 is longer than str2",
        "str1 comes before str2 alphabetically",
        "an error occurs",
      ],
      answer: 0,
      explanation:
        "strncmp returns 0 when the strings match, a negative value if str1 < str2, and a positive value if str1 > str2.",
    },
    {
      prompt: "Which function copies at most a limited number of characters from one C-string into another?",
      choices: ["strlen", "strncpy", "strncat", "strncmp"],
      answer: 1,
      explanation:
        "strncpy(target, src, limit) copies at most limit characters. strncat appends, strncmp compares, strlen measures.",
    },
    {
      prompt: "In which header are atoi, atol, and atof defined?",
      choices: ["<cstring>", "<cstdlib>", "<string>", "<iostream>"],
      answer: 1,
      explanation:
        "The string-to-number converters atoi/atol/atof live in <cstdlib>, not <cstring>.",
    },
    {
      prompt: "How do you convert a std::string `name` into the C-string array `st`?",
      choices: [
        "char st[] = name;",
        "strncpy(st, name.c_str(), 100);",
        "st = name;",
        "atoi(name);",
      ],
      answer: 1,
      explanation:
        "Use name.c_str() to get the C-string view, then strncpy it into your char array. The reverse direction — C-string to std::string — is automatic.",
    },
  ],
};
