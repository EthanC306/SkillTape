# C++ code conventions

The house style for this course's C++ code — what `/extract` and
the tutor skill both check generated `write`/`trace`/`error` items against.
Neither keeps a private copy of this list; if it needs to change, change it
here and both read the update.



## The conventions

- **C++11/14 only.** No C++17/20 features (`auto` return types beyond what
  11/14 already allow, structured bindings, `if constexpr`, etc.).
- **Type aliases via `using DataType = ...;`**, not `typedef`.
- **Full getter/setter interface** on classes — don't expose data members
  directly; pair every stored field with an accessor and mutator unless
  there's a specific reason not to.
- **Cursor traversal idiom** for linked structures: a named pointer (often
  literally `cursor` or `current`) walked node-to-node, not recursion or an
  index into something that isn't actually indexable.
- **Const-correctness.** Methods that don't mutate the object are `const`;
  parameters that aren't modified are passed `const &` (or by value for
  small types).
- **`nullptr`, never `NULL`.** `NULL` is a pre-C++11 macro; `nullptr` is the
  typed null pointer constant and is the only one that belongs in new code.
- **`using namespace std;`** is conventional in this course's code (unlike
  general production C++ style, which avoids it) — don't "fix" it away in
  generated items.
- **No `#include <string>`** — the course works with C-style strings
  (`char*`/`char[]`), not `std::string`, so pulling in `<string>` is a sign
  something drifted from the intended material.
- **Includes limited to** `<cstdlib>`, `<iomanip>`, `<iostream>`, `<fstream>`
  — anything outside this set in generated/extracted code is a red flag,
  not a stylistic choice.
- **Attached opening brace** (`int main() {`, not `int main()\n{`).
- **Closing-brace comments**: `} // main` on the function's closing brace,
  and `#endif` closers for header guards carry a matching comment.

## Who reads this file

- The tutor skill (when reviewing homework or answering questions about
  course code).
- `/extract` (A7) — when phrasing or transforming source material into
  `write`/`trace`/`error` items, generated code snippets should match this
  style so an item's `expected` doesn't teach a habit the course itself
  doesn't use.

Both read this file directly rather than keeping their own copy — a second
copy of a style guide is a style guide that's already started drifting.
