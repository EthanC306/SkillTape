// ─────────────────── c++ · 07.1 Trees ───────────────────
// Text is original; the code snippets and the example trees are the deck's own.
// Source: sources/cpp/trees.md (cpp-slides-07.1-trees).
//
// The deck's diagrams are transcribed as monospace trees rather than images.
// items/ cannot carry a figure (no columns for one), and the traversal drills
// are exactly the ones worth putting in Drill, so one representation that
// works in Learn, Quiz and Drill beats two that have to stay in sync.
import { FORMATS, ITEM_ORIGIN, makeItem } from "../../itemSchema.js";

// Slide 20/23/25's tree. Used by the traversal card and reused by the
// questions below so every traversal answer is checked against one shape.
const EXAMPLE_TREE = [
  "        50",
  "      /    \\",
  "    40      60",
  "   /  \\    /  \\",
  "  35  45  55  70",
  " /              \\",
  "10              80",
].join("\n");

// What a BST becomes when it is fed sorted input. Shared by the complexity
// card and the trees-35 diagram item so the two cannot disagree.
const DEGENERATE_TREE = [
  "10",
  "  \\",
  "   35",
  "     \\",
  "      40",
  "        \\",
  "         45",
  "           \\",
  "            50",
  "              \\",
  "               55",
  "                 \\",
  "                  60",
  "                    \\",
  "                     70",
  "                       \\",
  "                        80",
].join("\n");

const SOURCE_ID = "cpp-slides-07.1-trees";
const CITATION = "Lecture Deck 07.1";

/**
 * makeItem with this topic's constants filled in, so each entry below carries
 * only what actually differs. `anchor`, `page` and `excerpt` are lifted up out
 * of `provenance` because every item sets all three and nothing else in the
 * object varies.
 */
function item({ anchor, page, excerpt, ...rest }) {
  return makeItem({
    topicId: "trees",
    origin: ITEM_ORIGIN.MANUAL,
    verifiedByHuman: true,
    provenance: { sourceId: SOURCE_ID, anchor, excerpt, citation: CITATION, page },
    ...rest,
  });
}

export default {
  id: "trees",
  title: "Trees",
  subtitle: "c++ nodes, traversals & binary search trees",
  course: "cpp",
  showChart: false,
  // examWeight (ROADMAP.md A0): default until the deck says otherwise.
  examWeight: 1.0,

  cards: [
    {
      heading: "The cost of ordered data",
      body:
        "When a data structure holds a lot of ordered data, three operations decide whether it is any good: **insert**, **remove**, and **search**. An array searches quickly at **O(log2n)** but pays for it on every insert and remove, which run in **O(n)** because the structure requires resizing and copying. A linked list never resizes and never copies, but it is slow: all three operations are **O(n)**.",
    },
    {
      heading: "What a binary tree is",
      body:
        "A tree is a **nonlinear** structure. In a binary tree there is exactly one special node called the **root**, and each node may be associated with up to **two** other nodes, called its **left child** and **right child**. If a node `c` is a child of a node `p`, then we say p is c's **parent**. Each node reaches its children through two pointers: the `left` pointer points to the left child, and the `right` pointer points to the right child.",
      // Slide 4's tree. Indentation is load-bearing — it must start at column 0.
      art: `        20
      /    \\
    10      30
   /  \\    /  \\
  7   15  25  40
 / \\
5   8`,
    },
    {
      heading: "Parents, siblings, leaves, and subtrees",
      body:
        "A binary tree is a collection of nodes where each node holds a **unique id/key**. Every node except the root has exactly **one parent**. Two nodes are **siblings** if they have the same parent, and a node with no children is a **leaf**. For any node, the nodes beginning with its left child and below are its **left subtree**, and the nodes beginning with its right child and below are its **right subtree**. In the tree above, 5 and 8 are siblings, 8 is a leaf, and everything under 10 is 20's left subtree.",
    },
    {
      heading: "Depth, and the two heights",
      body:
        "The **depth of a node** is how far it is from the root, counted as the number of steps it takes to reach that node. The root has a depth of **0**, the root's children have a depth of 1, and so on. Slide 7 then gives two definitions of a tree's height that do not agree. First, height is the **maximum depth** of any leaf, which is **3** for the tree above. Then, height is the **number of levels** in the tree, which is **4**. They differ by exactly one and both are on the same slide. Max depth of a leaf is the one that follows from the depth rule, so prefer it, and ask which he wants before the exam.",
    },
    {
      heading: "Full binary trees",
      body:
        "A tree is a **Full Binary Tree** when every leaf has the **same depth** and every non-leaf has **two children**. Both halves have to hold. Neither example tree in this deck qualifies: their leaves sit at **different depths**, and several nodes have only one child.",
    },
    {
      heading: "The node structure",
      body:
        "A tree node is a template `struct` holding **one value** and **two pointers**. Its constructor takes defaults for all three, so `BNode<int> n;` gives you a node whose `data` is `DataType()` and whose `left` and `right` are both **nullptr**. That default matters: a node built with no children is already a **leaf**, with nothing extra to set.",
      code:
        "template <typename DataType>\nstruct BNode {\n    BNode(DataType newData = DataType(),\n          BNode* newLeft = nullptr, BNode* newRight = nullptr){\n        data = newData;\n        left = newLeft;\n        right = newRight;\n    }\n    DataType data;\n    BNode* left;\n    BNode* right;\n};",
    },
    {
      heading: "The class and its private helpers",
      body:
        "The class keeps one member, `BNode<DataType>* root`, and navigates the tree with **recursion**. Recursion is the reason the class is split in two: a recursive call has to descend to a **different node** each time, so it needs the current subtree's root **passed in as a parameter**, which the public functions cannot do because a caller has no business seeing node pointers. So each public function is a **one-line wrapper** that calls a **private** function with `root`.",
      code:
        "public:\n    BSTree() { root = nullptr; }\n    BNode<DataType>* search(DataType target)\n        { return treeSearch(root, target);}\n    void insert(DataType newData)\n        {treeInsert(root, newData);}\n    void print()\n        {printInorder(root);}\n    size_t size(){return treeSize(root);}",
    },
    {
      heading: "The remove that does not compile",
      body:
        "Slide 12 ends with a `remove` that was meant to be commented out, and only its **signature line** actually is. The body survives as a **stray block** sitting loose inside the class body, which is **illegal**, and it calls **treeRemove**, which is never declared anywhere in this deck. Copy slide 12 verbatim into a project and it **will not compile**. Comment out both lines, or delete them.",
      code: "    //void remove(DataType target)\n        {treeRemove(root, target);};",
    },
    {
      heading: "Three ways to walk a tree",
      body:
        "There are three traversals, and the names say **when the root is processed** relative to its subtrees. **Preorder** processes the root first, **inorder** processes it in the middle, and **postorder** processes it last. In all three the **left** subtree is always visited before the **right** one, so the only thing that ever moves is the root.",
    },
    {
      heading: "Preorder traversal, and slide 15's bug",
      body:
        "Each node is processed **before** its children. Process the **root**, then the nodes in the **left subtree** with a recursive call, then the nodes in the **right subtree** with a recursive call. The code below is slide 15's own, and it does not do that: both recursive calls go to `printInorder` instead of `printPreorder`. Only the top node gets preorder treatment and everything under it is walked inorder. It compiles and runs, which is what makes it dangerous. On the deck's example tree it actually prints **50 10 35 40 45 55 60 70 80**, close enough to sorted that it looks like it worked.",
      code:
        "template <typename DataType>\nvoid BSTree<DataType>::printPreorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        cout << root->data << endl;\n        printInorder(root->left);   // BUG: should be printPreorder\n        printInorder(root->right);  // BUG: should be printPreorder\n    }\n}",
    },
    {
      heading: "Preorder traversal, corrected",
      body:
        "The fix is one word, used twice: both recursive calls have to be `printPreorder`. With that change the same tree prints **50 40 35 10 45 60 55 70 80**, the **root first** and every subtree walked the same way. The guard `if (root != nullptr)` is the **base case**: an empty subtree prints nothing and returns.",
      code:
        "template <typename DataType>\nvoid BSTree<DataType>::printPreorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        cout << root->data << endl;\n        printPreorder(root->left);\n        printPreorder(root->right);\n    }\n}",
    },
    {
      heading: "Inorder traversal",
      body:
        "The left node is processed first, followed by the **parent**, then the right node. Process the nodes in the **left subtree** with a recursive call, then process the **root**, then process the nodes in the **right subtree** with a recursive call. On a binary search tree this is the traversal that prints the data in **sorted order**, which is why `print()` calls this one.",
      code:
        "template <typename DataType>\nvoid BSTree<DataType>::printInorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        printInorder(root->left);\n        cout << root->data << endl;\n        printInorder(root->right);\n    }\n}",
    },
    {
      heading: "Postorder traversal",
      body:
        "The left node is processed first, followed by the right node, then the **parent**. Process the nodes in the **left subtree** with a recursive call, then the nodes in the **right subtree** with a recursive call, then process the **root**. Because a node is handled only after both its children are done, this is the order you would use to **delete** a tree without orphaning anything.",
      code:
        "template <typename DataType>\nvoid BSTree<DataType>::printPostorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        printPostorder(root->left);\n        printPostorder(root->right);\n        cout << root->data << endl;\n    }\n}",
    },
    {
      heading: "Walking one tree three ways",
      body:
        "The deck's example tree makes the difference concrete. Preorder gives **50 40 35 10 45 60 55 70 80**, inorder gives **10 35 40 45 50 55 60 70 80**, and postorder gives **10 35 45 40 55 80 70 60 50**. Notice that the root, 50, comes first in preorder, middle in inorder, and last in postorder, and that inorder came out **sorted**.",
      code: EXAMPLE_TREE,
    },
    {
      heading: "Counting nodes recursively",
      body:
        "`treeSize` is the shape every recursive tree function takes. The base case returns **0** for an empty subtree, and the recursive case returns **1** for the current node plus the size of the **left** subtree plus the size of the **right** subtree. There is no loop and no counter variable: the sum is built out of the returns as the calls unwind.",
      code:
        "template <typename DataType>\nsize_t BSTree<DataType>::treeSize(BNode<DataType>* root) {\n    if(root == nullptr){\n        return 0;\n    }\n    return 1 + treeSize(root->left) + treeSize(root->right);\n}",
    },
    {
      heading: "Binary search tree storage rules",
      body:
        "A binary search tree is an ordinary binary tree with rules about where a value may sit. Every entry in the **left subtree** of a parent node is **smaller** than that parent's entry, and every entry in the **right subtree** is **larger**. Every node holds a **unique** value, so there are no duplicates to break the comparison. The **node structure is unchanged**: a BST is a promise about arrangement, not a different kind of node.",
      code: EXAMPLE_TREE,
    },
    {
      heading: "Inserting into a BST",
      body:
        "Insertion walks down until it falls off the tree. When the subtree root is **nullptr** the value belongs there, so a new node is allocated and the function returns. Otherwise it compares: if the new value is **smaller** it recurses **left**, if **larger** it recurses **right**. A value equal to the current node matches neither branch, so a duplicate is silently **ignored**.",
      code:
        "template <typename DataType>\nvoid BSTree<DataType>::treeInsert(\n        BNode<DataType>* &root, DataType newData){\n    if (root == nullptr) {\n        root = new BNode<DataType>(newData, nullptr, nullptr);\n        return;\n    }\n\n    if (newData < root->data){   //insert at the left subtree\n        treeInsert(root->left, newData);\n    }\n    else if (newData > root->data){ //insert at the right subtree\n        treeInsert(root->right, newData);\n    }\n    //else, already in the tree, ignore it\n}",
    },
    {
      heading: "Why treeInsert takes its root by reference",
      body:
        "The `&` in `BNode<DataType>* &root` is the most load-bearing character in the deck, and it is easy to read straight past. Drop it and the code still compiles, but the parameter becomes a **local copy** of the pointer: the assignment points that copy at the new node, the function returns, the copy dies, the node is **orphaned and leaked**, and the tree is **unchanged**. With the reference the parameter **is** the parent's own `left` or `right` member, so the assignment attaches the node in place. That is why insert never has to look back at the parent.",
      code:
        "void BSTree<DataType>::treeInsert(\n        BNode<DataType>* &root, DataType newData){\n    if (root == nullptr) {\n        root = new BNode<DataType>(newData, nullptr, nullptr);\n        return;\n    }",
    },
    {
      heading: "Searching a BST",
      body:
        "Search is the same walk, reporting instead of building. An empty subtree means the target is not there, so it returns **nullptr**. A node whose data **equals** the target is the hit, and the function returns that **node pointer**, not a bool, so the caller can read the data it found. Otherwise the comparison picks a side: **smaller** goes left, anything else goes right.",
      code:
        "template <typename DataType>\nBNode<DataType>* BSTree<DataType>::treeSearch(BNode<DataType>* &root,\n                        DataType target) {\n    if (root == nullptr){ //tree is empty\n        return nullptr;\n    }\n    if (target == root->data){ //found the target\n        return root;\n    }\n    if (target < root->data){ // search the left subtree\n        return treeSearch(root->left, target);\n    }\n    else { //search the right subtree\n        return treeSearch(root->right, target);\n    }\n}",
    },
    {
      heading: "What O(log2n) actually assumes",
      body:
        "Each comparison in `treeSearch` discards **half** of what is left, which is where **O(log2n)** comes from. `treeSize` gets none of that: it makes no comparison, so it prunes nothing and has to touch every node, which leaves it at **O(n)** on the very same tree. The halving also assumes a **reasonably balanced** tree. Insert sorted data and every value is larger than everything before it, so every node hangs off the right and the tree degenerates into the stick below, where insert, remove and search are all **O(n)**, worse than the array row on slide 28. **The deck never mentions balance anywhere**: no AVL, no red-black, no rotations.",
      code: DEGENERATE_TREE,
    },
    {
      heading: "What the tree buys you",
      body:
        "Back to the table this deck opened with. A binary search tree does insert, remove, and search all in **O(log2n)**, and like a linked list it needs **no resizing and no copying**. That beats the array on insert and remove and beats the linked list everywhere, **as long as the tree stays balanced**. The one caveat the deck itself lists is that a tree may **not be efficient** on a **small dataset**, where the overhead is not repaid.",
    },
  ],

  questions: [
    {
      id: "trees-q01",
      prompt: "On the deck's table of ordered data, which operation is an array already good at before trees are introduced?",
      choices: ["Search, at O(log2n)", "Insert, at O(n)", "Remove, at O(n)", "All three, at O(log2n)"],
      answer: 0,
      explanation: "An array can binary search in O(log2n); its weakness is insert and remove, which are O(n) because of resizing and copying.",
    },
    {
      id: "trees-q02",
      prompt: "What is the depth of the root of a binary tree?",
      choices: ["1", "0", "The number of levels in the tree", "Undefined until it has children"],
      answer: 1,
      explanation: "Depth counts the steps needed to reach a node from the root, and reaching the root takes no steps.",
    },
    {
      id: "trees-q03",
      prompt: "How many parents does the root have, and how many does every other node have?",
      choices: [
        "Zero, and exactly one",
        "One, and exactly one",
        "Zero, and at most two",
        "One, and at most two",
      ],
      answer: 0,
      explanation: "Exactly one parent per node with a single parentless root is what makes the structure a tree rather than a graph.",
    },
    {
      id: "trees-q04",
      prompt: "What makes a binary tree a Full Binary Tree?",
      choices: [
        "Every leaf has the same depth and every non-leaf has two children",
        "Every level except the last is completely filled",
        "Every node has a unique key",
        "Every node has either zero children or one child",
      ],
      answer: 0,
      explanation: "The deck's definition has two halves, and both must hold: uniform leaf depth and two children on every non-leaf.",
    },
    {
      id: "trees-q05",
      prompt: "In BNode's constructor, what are left and right set to if the caller supplies only a value?",
      code:
        "BNode(DataType newData = DataType(),\n      BNode* newLeft = nullptr, BNode* newRight = nullptr){\n    data = newData;\n    left = newLeft;\n    right = newRight;\n}",
      choices: [
        "Uninitialized, so they hold garbage",
        "Pointers to newly allocated empty nodes",
        "Both point back at the node itself",
        "Both nullptr, so the node is a leaf",
      ],
      answer: 3,
      explanation: "Both pointer parameters default to nullptr, so a node built from a value alone starts out with no children.",
    },
    {
      id: "trees-q06",
      prompt: "In `void insert(DataType newData) { treeInsert(root, newData); }`, which root is being passed?",
      choices: [
        "A fresh node allocated by the wrapper",
        "The private data member root, the one true root of the tree",
        "A copy of the subtree the caller wants to insert into",
        "Whichever node was last inserted",
      ],
      answer: 1,
      explanation: "Injecting the class's own root member is the wrapper's entire job, which is what keeps BNode pointers out of the public interface.",
    },
    {
      id: "trees-q07",
      prompt: "What does this traversal print for the deck's example tree?",
      code:
        "        50\n      /    \\\n    40      60\n   /  \\    /  \\\n  35  45  55  70\n /              \\\n10              80\n\nprintInorder(root->left);\ncout << root->data << endl;\nprintInorder(root->right);",
      choices: [
        "10 35 40 45 50 55 60 70 80",
        "50 40 35 10 45 60 55 70 80",
        "10 35 45 40 55 80 70 60 50",
        "80 70 60 55 50 45 40 35 10",
      ],
      answer: 0,
      explanation: "Left, then root, then right is an inorder walk, and on a binary search tree that visits the values in sorted order.",
    },
    {
      id: "trees-q08",
      prompt: "Which traversal prints the deck's example tree as 50 40 35 10 45 60 55 70 80?",
      choices: ["Postorder", "Inorder", "Preorder", "Level order"],
      answer: 2,
      explanation: "The root, 50, comes out first, which only happens when the root is processed before both of its subtrees.",
    },
    {
      id: "trees-q09",
      prompt: "In a postorder traversal, when is a node processed?",
      choices: [
        "After its left subtree but before its right",
        "After both of its subtrees",
        "Before both of its subtrees",
        "Only if it is a leaf",
      ],
      answer: 1,
      explanation: "Postorder does left, then right, then the root, which is why it is the safe order for deleting a tree.",
    },
    {
      id: "trees-q10",
      prompt: "What is treeSize's base case, and what does it return?",
      code:
        "size_t BSTree<DataType>::treeSize(BNode<DataType>* root) {\n    if(root == nullptr){\n        return 0;\n    }\n    return 1 + treeSize(root->left) + treeSize(root->right);\n}",
      choices: [
        "A leaf node, returning 1",
        "The root, returning the number of levels",
        "A node with one child, returning 1",
        "A nullptr subtree, returning 0",
      ],
      answer: 3,
      explanation: "An empty subtree contributes nothing to the count, so the recursion bottoms out at nullptr with 0.",
    },
    {
      id: "trees-q11",
      prompt: "Why is inorder on a BST guaranteed to print sorted order rather than happening to?",
      choices: [
        "Because insert sorts the values as it places them",
        "Because inorder visits the nodes by increasing depth",
        "Because inorder and the BST storage rule state the same ordering twice",
        "It is not guaranteed; it depends on the insertion order",
      ],
      answer: 2,
      explanation: "Inorder says left, me, right, and the storage rule says left is smaller and right is larger, so every node necessarily prints between everything smaller and everything larger.",
    },
    {
      id: "trees-q12",
      prompt: "Why is the second test written as `else if (newData > root->data)` rather than a bare `else`?",
      code:
        "if (newData < root->data){\n    treeInsert(root->left, newData);\n}\nelse if (newData > root->data){\n    treeInsert(root->right, newData);\n}\n//else, already in the tree, ignore it",
      choices: [
        "So an equal value matches neither branch and the duplicate is ignored",
        "Because a bare else would not compile after an if",
        "To keep the two branches symmetrical for readability",
        "Because DataType might not define operator<",
      ],
      answer: 0,
      explanation: "A bare else would send duplicates down the right subtree; the explicit > lets them fall through, which is how the unique-value rule is enforced.",
    },
    {
      id: "trees-q13",
      prompt: "You remove the & from treeInsert's `BNode<DataType>* &root`. It still compiles. What happens at runtime?",
      choices: [
        "The new node is attached, but the tree leaks its old root",
        "The new node is orphaned and leaked, and the tree is unchanged",
        "Infinite recursion, because the base case is never reached",
        "A segfault the first time an empty subtree is reached",
      ],
      answer: 1,
      explanation: "The assignment lands on a local copy of the pointer, which dies at the return, so nothing is ever hooked into the parent.",
    },
    {
      id: "trees-q14",
      prompt: "What is treeSize's time complexity?",
      code:
        "size_t BSTree<DataType>::treeSize(BNode<DataType>* root) {\n    if(root == nullptr){\n        return 0;\n    }\n    return 1 + treeSize(root->left) + treeSize(root->right);\n}",
      choices: [
        "O(log2n), like search on the same tree",
        "O(1), because size could be cached",
        "O(n), because every node must be visited",
        "O(n log2n), one traversal per level",
      ],
      answer: 2,
      explanation: "It makes no comparison, so it can never discard a subtree, and the O(log2n) figure only appears where a comparison halves the work.",
    },
    {
      id: "trees-q15",
      prompt: "On the deck's final table, what disadvantage does it list for binary search trees?",
      choices: [
        "They require resizing and copying",
        "Search degrades to O(n)",
        "They cannot store duplicate values",
        "They may not be efficient on a small dataset",
      ],
      answer: 3,
      explanation: "The tree's overhead is only repaid at scale, which is the one cost the deck puts against its O(log2n) row.",
    },
  ],

  flashcards: [
    { front: "Root", back: "The one special node a binary tree starts from. Depth 0, level 0, and the only node with no parent." },
    { front: "Leaf", back: "A node with no children. Both its left and right pointers are nullptr." },
    { front: "Siblings", back: "Two nodes with the same parent." },
    { front: "Left subtree", back: "For a given node, the nodes beginning with its left child and everything below them." },
    { front: "Depth of a node", back: "How far it is from the root, counted in steps. The root is 0, its children are 1." },
    { front: "Depth (height) of a tree", back: "The maximum depth of any of its leaves. Also the number of levels in the tree." },
    { front: "Full Binary Tree", back: "Every leaf has the same depth, and every non-leaf has two children." },
    { front: "Preorder", back: "Root, then left subtree, then right subtree. The root comes out first." },
    { front: "Inorder", back: "Left subtree, then root, then right subtree. On a BST this prints in sorted order." },
    { front: "Postorder", back: "Left subtree, then right subtree, then root. The root comes out last." },
    { front: "BST storage rules", back: "Left subtree is all smaller than the parent, right subtree is all larger, every node's value is unique." },
    { front: "treeSize base case", back: "root == nullptr returns 0. Otherwise 1 + treeSize(left) + treeSize(right)." },
    { front: "Inserting a duplicate into a BST", back: "Nothing happens. It is neither < nor > the node, so both branches are skipped and it is ignored." },
    { front: "treeSearch on a miss", back: "Returns nullptr. On a hit it returns the pointer to the node, not a bool." },
    { front: "BST insert / remove / search", back: "All O(log2n), with no resizing and no copying. May not be efficient on a small dataset." },
  ],

  items: [
    // ── Terminology ────────────────────────────────────────────────────────
    item({
      id: "trees-01",
      format: FORMATS.RECALL,
      prompt: "Define *leaf* and *siblings*, and say how many parents the root has versus every other node.",
      expected:
        "A leaf is a node with no children. Two nodes are siblings if they have the same parent. The root has zero parents; every other node has exactly one.",
      criteria: [
        "Leaf is a node with no children",
        "Siblings share the same parent",
        "Root has no parent, every other node has exactly one",
      ],
      anchor: "#binary-tree-terminology",
      page: 6,
      excerpt:
        "Each node, except the root, has exactly one parent\nTwo nodes are siblings if they have the same parent\nA leaf is a node with no children",
      difficulty: 1,
    }),
    item({
      id: "trees-02",
      format: FORMATS.RECALL,
      prompt: "What is the depth of a node, and what is the depth of the root?",
      expected:
        "The depth of a node is how far it is from the root, counted as the number of steps needed to reach it. The root has a depth of 0, its children have a depth of 1, and so on.",
      criteria: [
        "Depth is the number of steps from the root to that node",
        "The root has depth 0",
      ],
      anchor: "#binary-tree-terminology",
      page: 6,
      excerpt:
        "The depth of a node is how far it is from the root. The number of steps it takes to reach the node from the root. The root has a depth of 0.",
      difficulty: 1,
    }),
    item({
      id: "trees-03",
      format: FORMATS.RECALL,
      prompt: "State the deck's definition of a Full Binary Tree. Is the example tree on slide 20 full?",
      expected:
        "A Full Binary Tree is one where every leaf has the same depth and every non-leaf has two children. The slide 20 tree is not full: 35 has only a left child, 70 has only a right child, and the leaves sit at different depths.",
      criteria: [
        "Every leaf has the same depth",
        "Every non-leaf has two children",
        "Says the example tree is NOT full, with a reason",
      ],
      anchor: "#binary-tree-depth-height",
      page: 7,
      excerpt:
        "A Full Binary Tree is where every leaf has the same depth, and every non-leaf has two children.",
      difficulty: 2,
    }),
    item({
      id: "trees-04",
      format: FORMATS.RECALL,
      prompt:
        "Slide 7 gives two definitions of a tree's height that do not agree. State both, and give each one's value for the slide 20 tree.",
      expected:
        "Definition 1: height is the maximum depth of any leaf, which is 3 for the slide 20 tree (50 to 40 to 35 to 10). Definition 2: height is the number of levels in the tree, which is 4 (levels 0, 1, 2, 3). They differ by exactly one, and both are on slide 7. Max-depth-of-a-leaf is the one that follows from the depth definition on slide 6.",
      criteria: [
        "Height as the maximum depth of any leaf, giving 3",
        "Height as the number of levels, giving 4",
        "Notes the two differ by one and that both appear on the same slide",
      ],
      anchor: "#binary-tree-depth-height",
      page: 7,
      excerpt:
        "The depth of a tree, also called height, is the maximum depth of any of its leaves.\nThe root is at level 0, the roots children are at level 1, etc.\nThe height of a tree is the number of levels in the tree.",
      difficulty: 3,
    }),

    // ── Node and class structure ───────────────────────────────────────────
    item({
      id: "trees-05",
      format: FORMATS.WRITE,
      prompt: "Write the `BNode` template struct exactly as the deck defines it, including its constructor.",
      expected:
        "template <typename DataType>\nstruct BNode {\n    BNode(DataType newData = DataType(),\n          BNode* newLeft = nullptr, BNode* newRight = nullptr){\n        data = newData;\n        left = newLeft;\n        right = newRight;\n    }\n    DataType data;\n    BNode* left;\n    BNode* right;\n};",
      criteria: [
        "template <typename DataType> above a struct named BNode",
        "Constructor defaults all three parameters, with nullptr for both pointers",
        "Members are DataType data, BNode* left, BNode* right",
      ],
      anchor: "#bnode-struct",
      page: 8,
      excerpt:
        "template <typename DataType>\nstruct BNode {\n    BNode(DataType newData = DataType(),\n          BNode* newLeft = nullptr, BNode* newRight = nullptr){\n        data = newData;\n        left = newLeft;\n        right = newRight;\n    }\n    DataType data;\n    BNode* left;\n    BNode* right;\n};",
      difficulty: 2,
      timeBudgetSec: 150,
    }),
    item({
      id: "trees-06",
      format: FORMATS.RECALL,
      prompt:
        "Why is `BNode` declared as a `struct` rather than a `class`, and what does that change about how the tree functions reach its fields?",
      expected:
        "Struct members are public by default, so the tree code can write root->data, root->left and root->right directly instead of going through accessors. This is a deliberate break from the Node class used for linked lists: there are no getNext()-style accessors here to call.",
      criteria: [
        "Struct members are public by default",
        "Tree code accesses data/left/right directly rather than through accessors",
      ],
      anchor: "#bnode-struct",
      page: 8,
      excerpt:
        "template <typename DataType>\nstruct BNode {\n    BNode(DataType newData = DataType(),\n          BNode* newLeft = nullptr, BNode* newRight = nullptr){",
      difficulty: 2,
    }),
    item({
      id: "trees-07",
      format: FORMATS.RECALL,
      prompt:
        "In `BNode`'s constructor, what does `DataType newData = DataType()` produce when `DataType` is `int`? Why is it written that way instead of `= 0`?",
      expected:
        "int() value-initializes to 0. Writing DataType() calls the default constructor for whatever type the template is instantiated with, so it works for class types too. Hardcoding 0 would only be valid for numeric types.",
      criteria: [
        "int() value-initializes to 0",
        "DataType() calls the default constructor for any type, so the template stays generic",
      ],
      anchor: "#bnode-struct",
      page: 8,
      excerpt: "BNode(DataType newData = DataType(),",
      difficulty: 2,
    }),
    item({
      id: "trees-08",
      format: FORMATS.RECALL,
      prompt:
        "Why do `treeInsert`, `treeSearch` and the three print functions live in the private section with public one-line wrappers around them?",
      expected:
        "Recursion has to say run on the subtree starting here, so every helper takes a node pointer as a parameter. Node pointers are internal plumbing that a caller has no business holding, so each public wrapper injects the class's own root member and the caller just writes myTree.insert(5).",
      criteria: [
        "Recursive calls each work on a different node, so the node must be a parameter",
        "Public wrappers pass the private root member",
        "Keeps BNode pointers out of the public interface",
      ],
      anchor: "#bstree-class-recursion",
      page: 9,
      excerpt:
        "We will use recursion to navigate down the tree\nThis requires passing the root pointer to the functions\nUse private functions that use the root pointer",
      difficulty: 2,
    }),
    item({
      id: "trees-09",
      format: FORMATS.WRITE,
      prompt:
        "Write the public section of `BSTree`: the default constructor plus the `search`, `insert`, `print` and `size` wrappers.",
      expected:
        "public:\n    BSTree() { root = nullptr; }\n    BNode<DataType>* search(DataType target)\n        { return treeSearch(root, target);}\n    void insert(DataType newData)\n        {treeInsert(root, newData);}\n    void print()\n        {printInorder(root);}\n    size_t size(){return treeSize(root);}",
      criteria: [
        "Constructor sets root to nullptr",
        "Every wrapper forwards to its private helper passing root",
        "search returns BNode<DataType>* and print calls printInorder",
      ],
      anchor: "#bstree-public-interface",
      page: 12,
      excerpt:
        "public:\n    BSTree() { root = nullptr; }\n    BNode<DataType>* search(DataType target)\n        { return treeSearch(root, target);}\n    void insert(DataType newData)\n        {treeInsert(root, newData);}\n    void print()\n        {printInorder(root);}",
      difficulty: 2,
      timeBudgetSec: 150,
    }),
    item({
      id: "trees-10",
      format: FORMATS.ERROR,
      prompt:
        "Slide 12 ends with the lines below. Will the class compile as written? Name the problem precisely.",
      expected:
        "No. The // comments out only the signature line, so the body survives as a stray block sitting loose inside the class body, which is illegal. It also calls treeRemove, which is never declared anywhere in the deck. The fix is to comment out both lines or delete them.",
      criteria: [
        "Says it will not compile",
        "Identifies that only the signature is commented, leaving the body as a loose block in the class",
        "Notes treeRemove is never declared",
      ],
      anchor: "#bstree-public-interface",
      page: 12,
      excerpt: "    //void remove(DataType target)\n        {treeRemove(root, target);};",
      difficulty: 3,
      timeBudgetSec: 90,
    }),

    // ── Traversals ─────────────────────────────────────────────────────────
    item({
      id: "trees-11",
      format: FORMATS.RECALL,
      prompt: "Give all three traversals as a three-step ordering of root, left and right.",
      expected:
        "Preorder: root, left, right. Inorder: left, root, right. Postorder: left, right, root. Left always comes before right in all three; only the root moves.",
      criteria: [
        "Preorder is root, left, right",
        "Inorder is left, root, right",
        "Postorder is left, right, root",
      ],
      anchor: "#tree-traversal-kinds",
      page: 13,
      excerpt: "Preorder\nInorder\nPostorder",
      difficulty: 1,
    }),
    item({
      id: "trees-12",
      format: FORMATS.WRITE,
      prompt: "Write `printPreorder`. Write it correctly, not as the deck prints it.",
      expected:
        "template <typename DataType>\nvoid BSTree<DataType>::printPreorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        cout << root->data << endl;\n        printPreorder(root->left);\n        printPreorder(root->right);\n    }\n}",
      criteria: [
        "Guards with if (root != nullptr)",
        "Prints root->data BEFORE recursing",
        "Both recursive calls are to printPreorder, not printInorder",
      ],
      anchor: "#preorder-traversal-code",
      page: 15,
      excerpt:
        "void BSTree<DataType>::printPreorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        cout << root->data << endl;",
      difficulty: 2,
      timeBudgetSec: 120,
    }),
    item({
      id: "trees-13",
      format: FORMATS.WRITE,
      prompt: "Write `printInorder`.",
      expected:
        "template <typename DataType>\nvoid BSTree<DataType>::printInorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        printInorder(root->left);\n        cout << root->data << endl;\n        printInorder(root->right);\n    }\n}",
      criteria: [
        "Guards with if (root != nullptr)",
        "Recurses left, then prints root->data, then recurses right",
      ],
      anchor: "#inorder-traversal-code",
      page: 17,
      excerpt:
        "    if (root != nullptr){\n        printInorder(root->left);\n        cout << root->data << endl;\n        printInorder(root->right);\n    }",
      difficulty: 2,
      timeBudgetSec: 120,
    }),
    item({
      id: "trees-14",
      format: FORMATS.WRITE,
      prompt: "Write `printPostorder`.",
      expected:
        "template <typename DataType>\nvoid BSTree<DataType>::printPostorder(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        printPostorder(root->left);\n        printPostorder(root->right);\n        cout << root->data << endl;\n    }\n}",
      criteria: [
        "Guards with if (root != nullptr)",
        "Recurses left, then right, and prints root->data last",
      ],
      anchor: "#postorder-traversal-code",
      page: 19,
      excerpt:
        "    if (root != nullptr){\n        printPostorder(root->left);\n        printPostorder(root->right);\n        cout << root->data << endl;\n    }",
      difficulty: 2,
      timeBudgetSec: 120,
    }),
    item({
      id: "trees-15",
      format: FORMATS.ERROR,
      prompt:
        "Slide 15's `printPreorder` has a bug that still compiles and still runs. Find it, and say what the function actually prints for the slide 20 tree.",
      expected:
        "It prints the root correctly, then calls printInorder on both children instead of printPreorder. Only the top node gets preorder treatment; everything below it is walked inorder. On the slide 20 tree it prints 50 10 35 40 45 55 60 70 80, which is close enough to sorted order to look like it worked.",
      criteria: [
        "Identifies that the recursive calls go to printInorder instead of printPreorder",
        "Notes it compiles and runs, so the bug is silent",
        "Gives the actual output 50 10 35 40 45 55 60 70 80",
      ],
      anchor: "#preorder-traversal-code",
      page: 15,
      excerpt: "        printInorder(root->left);\n        printInorder(root->right);",
      difficulty: 3,
      timeBudgetSec: 120,
    }),
    item({
      id: "trees-16",
      format: FORMATS.TRACE,
      prompt: `Give the preorder output for this tree.\n\n${EXAMPLE_TREE}`,
      expected: "50 40 35 10 45 60 55 70 80",
      criteria: ["Starts at 50", "Exact sequence 50 40 35 10 45 60 55 70 80"],
      anchor: "#traversal-example-tree",
      page: 20,
      excerpt: "Binary Trees Traversal",
      difficulty: 2,
    }),
    item({
      id: "trees-17",
      format: FORMATS.TRACE,
      prompt: `Give the inorder output for this tree, and say what is special about it.\n\n${EXAMPLE_TREE}`,
      expected:
        "10 35 40 45 50 55 60 70 80. It comes out in ascending sorted order, because the tree is a binary search tree.",
      criteria: [
        "Exact sequence 10 35 40 45 50 55 60 70 80",
        "Notes it is sorted because this is a BST",
      ],
      anchor: "#traversal-example-tree",
      page: 20,
      excerpt: "Binary Trees Traversal",
      difficulty: 2,
    }),
    item({
      id: "trees-18",
      format: FORMATS.TRACE,
      prompt: `Give the postorder output for this tree.\n\n${EXAMPLE_TREE}`,
      expected: "10 35 45 40 55 80 70 60 50",
      criteria: ["Ends at 50", "Exact sequence 10 35 45 40 55 80 70 60 50"],
      anchor: "#traversal-example-tree",
      page: 20,
      excerpt: "Binary Trees Traversal",
      difficulty: 2,
    }),
    item({
      id: "trees-19",
      format: FORMATS.RECALL,
      prompt:
        "Why is inorder on a BST guaranteed to print ascending order, rather than that being a coincidence of the example?",
      expected:
        "Inorder and the BST storage rule are the same statement twice. Inorder says all of the left subtree, then me, then all of the right subtree. The storage rule says everything left is smaller and everything right is larger. Together they force every node to print after everything smaller than it and before everything larger.",
      criteria: [
        "States the inorder ordering (left, root, right)",
        "States the BST rule (left smaller, right larger)",
        "Connects the two to show every node prints in its sorted position",
      ],
      anchor: "#bst-storage-rules",
      page: 22,
      excerpt:
        "Every entry in left subtree of a parent node is smaller than the the parent's entry.\nEvery entry in right subtree of a parent node is larger than the the parent's entry.",
      difficulty: 3,
    }),
    item({
      id: "trees-20",
      format: FORMATS.WRITE,
      prompt: "Change `printInorder` so it prints a BST in descending order. What is the smallest edit that does it?",
      expected:
        "Swap the two recursive calls so the right subtree is visited first: right, root, left.\n\ntemplate <typename DataType>\nvoid BSTree<DataType>::printDescending(\n                            BNode<DataType>* root){\n    if (root != nullptr){\n        printDescending(root->right);\n        cout << root->data << endl;\n        printDescending(root->left);\n    }\n}",
      criteria: [
        "Recurses right before left",
        "Nothing else about the function changes",
      ],
      anchor: "#inorder-traversal-code",
      page: 17,
      excerpt:
        "        printInorder(root->left);\n        cout << root->data << endl;\n        printInorder(root->right);",
      difficulty: 2,
      timeBudgetSec: 90,
    }),
    item({
      id: "trees-21",
      format: FORMATS.COMPARE,
      prompt:
        "A destructor needs to delete every node. Which traversal must it use, and what specifically goes wrong with preorder?",
      expected:
        "Postorder. A node is processed only after both of its children are finished, so children are deleted before their parent. With preorder you would delete the parent first, and the very next line dereferences root->left on freed memory to keep recursing. That is a use-after-free: undefined behaviour that often appears to work in testing.",
      criteria: [
        "Postorder is the answer",
        "Postorder finishes both children before the parent",
        "Preorder deletes the parent then dereferences its freed child pointers (use-after-free)",
      ],
      anchor: "#postorder-traversal-rules",
      page: 18,
      excerpt:
        "The left node is processed first, followed by the right node, then the parent.",
      difficulty: 3,
    }),
    item({
      id: "trees-22",
      format: FORMATS.COMPARE,
      prompt:
        "You want to copy a tree so the copy has the identical shape. Which traversal, and why not inorder?",
      expected:
        "Preorder. It hands you the parent before its children, so you can create the parent node and then attach the children you build next. Inorder gives the data in sorted order, and re-inserting sorted data builds a degenerate one-sided stick rather than the original shape.",
      criteria: [
        "Preorder is the answer",
        "Preorder gives the parent before its children, so the parent exists to attach to",
        "Inorder yields sorted data, which rebuilds a degenerate tree instead of the shape",
      ],
      anchor: "#preorder-traversal-rules",
      page: 14,
      excerpt: "Each node is processed before its children.",
      difficulty: 3,
    }),
    item({
      id: "trees-23",
      format: FORMATS.COMPARE,
      prompt:
        "Given only the preorder output of a BST, can you rebuild the exact tree? Given only the inorder output? Explain the difference.",
      expected:
        "Preorder: yes. The first value is the root, and every value after it is either smaller (left subtree) or larger (right subtree), which is enough to place all of them. Inorder: no. Inorder of any BST over the same values is the same sorted list, so it cannot tell the slide 20 tree apart from a degenerate stick. Inorder discards all the shape information.",
      criteria: [
        "Preorder yes, because the first value is the root and comparisons place the rest",
        "Inorder no",
        "Explains that every BST over the same values has the same inorder, so shape is lost",
      ],
      anchor: "#traversal-example-tree",
      page: 20,
      excerpt: "Binary Trees Traversal",
      difficulty: 3,
    }),
    item({
      id: "trees-24",
      format: FORMATS.RECALL,
      prompt:
        "Every traversal opens with `if (root != nullptr)`. What two jobs does that guard do, and what does it replace from the linked-list world?",
      expected:
        "It is the base case that stops the recursion, and it is the null check that stops you dereferencing a null child pointer. It is the recursive equivalent of while (cursor != nullptr) from the linked-list cursor idiom.",
      criteria: [
        "It is the recursion's base case",
        "It prevents dereferencing a null child",
        "It replaces the linked-list while (cursor != nullptr) loop",
      ],
      anchor: "#preorder-traversal-code",
      page: 15,
      excerpt: "    if (root != nullptr){",
      difficulty: 2,
    }),

    // ── treeSize and its variants ──────────────────────────────────────────
    item({
      id: "trees-25",
      format: FORMATS.WRITE,
      prompt: "Write `treeSize`.",
      expected:
        "template <typename DataType>\nsize_t BSTree<DataType>::treeSize(BNode<DataType>* root) {\n    if(root == nullptr){\n        return 0;\n    }\n    return 1 + treeSize(root->left) + treeSize(root->right);\n}",
      criteria: [
        "Base case returns 0 for a nullptr subtree",
        "Returns 1 + treeSize(left) + treeSize(right)",
      ],
      anchor: "#tree-size-code",
      page: 21,
      excerpt:
        "    if(root == nullptr){\n        return 0;\n    }\n    return 1 + treeSize(root->left) + treeSize(root->right);",
      difficulty: 2,
      timeBudgetSec: 120,
    }),
    item({
      id: "trees-26",
      format: FORMATS.RECALL,
      prompt: "In `treeSize`, why does the base case return 0 rather than 1, and what is the `1 +` counting?",
      expected:
        "An empty subtree contains zero nodes, so returning 1 would count every nullptr as a node and roughly double the answer. The 1 + counts the current node itself: me, plus everyone below me on the left, plus everyone below me on the right.",
      criteria: [
        "nullptr means an empty subtree, which contributes 0 nodes",
        "Returning 1 would count null pointers as nodes",
        "The 1 + is the current node",
      ],
      anchor: "#tree-size-code",
      page: 21,
      excerpt: "    if(root == nullptr){\n        return 0;\n    }",
      difficulty: 2,
    }),
    item({
      id: "trees-27",
      format: FORMATS.COMPLEXITY,
      prompt: "What is `treeSize`'s time complexity? Is it O(log2n) like search? Justify it.",
      expected:
        "O(n). treeSize has to touch every node, because it makes no comparison and so can never discard a subtree. The O(log2n) figure only appears when a comparison lets you throw away half the tree, which is what search and insert do and what size does not.",
      criteria: [
        "O(n), not O(log2n)",
        "Every node must be visited",
        "No comparison is made, so no subtree can be pruned",
      ],
      anchor: "#tree-size-code",
      page: 21,
      excerpt: "    return 1 + treeSize(root->left) + treeSize(root->right);",
      difficulty: 3,
    }),
    item({
      id: "trees-28",
      format: FORMATS.WRITE,
      prompt: "Turn `treeSize` into `treeHeight`. What are the two changes?",
      expected:
        "Take the max of the two sides instead of summing them, and return -1 from the base case so a single-node tree comes out as height 0.\n\ntemplate <typename DataType>\nint BSTree<DataType>::treeHeight(BNode<DataType>* root) {\n    if (root == nullptr) {\n        return -1;\n    }\n    return 1 + max(treeHeight(root->left), treeHeight(root->right));\n}",
      criteria: [
        "Uses max of the two subtrees instead of adding them",
        "Base case returns -1 so a one-node tree has height 0",
        "Still 1 + the recursive result",
      ],
      anchor: "#tree-size-code",
      page: 21,
      excerpt: "    return 1 + treeSize(root->left) + treeSize(root->right);",
      difficulty: 3,
      timeBudgetSec: 150,
    }),
    item({
      id: "trees-29",
      format: FORMATS.WRITE,
      prompt: "Turn `treeSize` into `countLeaves`. Where does the base case have to move, and why?",
      expected:
        "You need a second base case, because a leaf is not a null pointer. Null still returns 0, and a node with two null children returns 1. The 1 + disappears, since internal nodes contribute nothing.\n\ntemplate <typename DataType>\nsize_t BSTree<DataType>::countLeaves(BNode<DataType>* root) {\n    if (root == nullptr) {\n        return 0;\n    }\n    if (root->left == nullptr && root->right == nullptr) {\n        return 1;\n    }\n    return countLeaves(root->left) + countLeaves(root->right);\n}",
      criteria: [
        "Keeps the nullptr base case returning 0",
        "Adds a second base case: both children null returns 1",
        "Drops the 1 + so internal nodes contribute nothing",
      ],
      anchor: "#tree-size-code",
      page: 21,
      excerpt: "    return 1 + treeSize(root->left) + treeSize(root->right);",
      difficulty: 3,
      timeBudgetSec: 180,
    }),

    // ── BST rules, insert, search ──────────────────────────────────────────
    item({
      id: "trees-30",
      format: FORMATS.RECALL,
      prompt: "State the three BST storage rules from slide 22.",
      expected:
        "Every entry in the left subtree of a parent is smaller than the parent's entry. Every entry in the right subtree is larger. Every node has a unique value. The node structure itself is unchanged from a regular binary tree.",
      criteria: [
        "Left subtree is smaller than the parent",
        "Right subtree is larger than the parent",
        "Every node's value is unique",
      ],
      anchor: "#bst-storage-rules",
      page: 22,
      excerpt:
        "Every entry in left subtree of a parent node is smaller than the the parent's entry.\nEvery entry in right subtree of a parent node is larger than the the parent's entry.\nEvery node has a unique value",
      difficulty: 1,
    }),
    item({
      id: "trees-31",
      format: FORMATS.WRITE,
      prompt: "Write the recursive `treeInsert`, including its parameter list.",
      expected:
        "template <typename DataType>\nvoid BSTree<DataType>::treeInsert(\n        BNode<DataType>* &root, DataType newData){\n    if (root == nullptr) {\n        root = new BNode<DataType>(newData, nullptr, nullptr);\n        return;\n    }\n\n    if (newData < root->data){\n        treeInsert(root->left, newData);\n    }\n    else if (newData > root->data){\n        treeInsert(root->right, newData);\n    }\n    //else, already in the tree, ignore it\n}",
      criteria: [
        "Takes the root parameter by reference: BNode<DataType>* &root",
        "Allocates and returns when root is nullptr",
        "Recurses left when smaller and right when larger, with no final else",
      ],
      anchor: "#bst-insert-code",
      page: 26,
      excerpt:
        "    if (root == nullptr) {\n        root = new BNode<DataType>(newData, nullptr, nullptr);\n        return;\n    }",
      difficulty: 3,
      timeBudgetSec: 240,
    }),
    item({
      id: "trees-32",
      format: FORMATS.ERROR,
      prompt:
        "`treeInsert` takes `BNode<DataType>* &root`. Someone drops the `&`. The code still compiles. What exactly breaks, and why does this mean insert never has to look back at the parent?",
      expected:
        "Without the reference, root is a local copy of the pointer. On reaching the empty spot, root = new BNode... points only the local copy at the new node; the function returns, the copy dies, the node is orphaned and leaked, and the tree is unchanged. With the reference the parameter IS the parent's actual left or right member, so the assignment attaches the node in place. That is why insert never needs a parent pointer.",
      criteria: [
        "Without & the parameter is a copy of the pointer",
        "The new node is orphaned and leaked; the tree is unmodified",
        "With & the parameter aliases the parent's own left/right member",
      ],
      anchor: "#bst-insert-code",
      page: 26,
      excerpt: "        BNode<DataType>* &root, DataType newData){",
      difficulty: 3,
      timeBudgetSec: 120,
    }),
    item({
      id: "trees-33",
      format: FORMATS.RECALL,
      prompt:
        "Slide 26 has an `if` and an `else if` and no final `else`. What happens when you insert a value already in the tree, and is that deliberate?",
      expected:
        "Nothing. The value is neither less than nor greater than the current node, so it falls past both branches and the function returns silently. It is deliberate: the comment on slide 26 says so, and it is how the every node has a unique value rule from slide 22 is enforced. It is also the only reason the second test is written as > rather than a bare else.",
      criteria: [
        "The duplicate is ignored, nothing is inserted",
        "Deliberate, and enforces the unique-value rule",
      ],
      anchor: "#bst-insert-code",
      page: 26,
      excerpt: "    //else, already in the tree, ignore it",
      difficulty: 2,
    }),
    item({
      id: "trees-34",
      format: FORMATS.DIAGRAM,
      prompt:
        "Insert 50, 40, 60, 35, 45, 55, 70, 10, 80 into an empty BST, in that order. Draw the result.",
      expected: EXAMPLE_TREE,
      criteria: [
        "50 is the root, with 40 on the left and 60 on the right",
        "40's children are 35 and 45; 60's children are 55 and 70",
        "10 hangs left of 35, and 80 hangs right of 70",
      ],
      anchor: "#bst-insert-code",
      page: 26,
      excerpt:
        "    if (newData < root->data){   //insert at the left subtree\n        treeInsert(root->left, newData);\n    }\n    else if (newData > root->data){ //insert at the right subtree\n        treeInsert(root->right, newData);",
      difficulty: 3,
    }),
    item({
      id: "trees-35",
      format: FORMATS.DIAGRAM,
      prompt:
        "Insert 10, 35, 40, 45, 50, 55, 60, 70, 80 into an empty BST, in that order. Draw the result and say what its search cost is.",
      expected: `${DEGENERATE_TREE}\n\nEvery insert is larger than everything before it, so every node hangs off the right. This is a linked list wearing a tree costume, and search costs O(n).`,
      criteria: [
        "Every node is the right child of the one before it, a single descending chain",
        "Names the search cost as O(n)",
        "Recognizes it degenerates into a linked list",
      ],
      anchor: "#bst-storage-rules",
      page: 22,
      excerpt: "Every entry in right subtree of a parent node is larger than the the parent's entry.",
      difficulty: 3,
    }),
    item({
      id: "trees-36",
      format: FORMATS.WRITE,
      prompt: "Write the recursive `treeSearch`.",
      expected:
        "template <typename DataType>\nBNode<DataType>* BSTree<DataType>::treeSearch(BNode<DataType>* &root,\n                        DataType target) {\n    if (root == nullptr){\n        return nullptr;\n    }\n    if (target == root->data){\n        return root;\n    }\n    if (target < root->data){\n        return treeSearch(root->left, target);\n    }\n    else {\n        return treeSearch(root->right, target);\n    }\n}",
      criteria: [
        "Returns nullptr on an empty subtree",
        "Returns root when target == root->data",
        "Recurses left when smaller, right otherwise, returning the recursive result",
      ],
      anchor: "#bst-search-code",
      page: 27,
      excerpt:
        "    if (root == nullptr){ //tree is empty\n        return nullptr;\n    }\n    if (target == root->data){ //found the target\n        return root;\n    }",
      difficulty: 3,
      timeBudgetSec: 240,
    }),
    item({
      id: "trees-37",
      format: FORMATS.RECALL,
      prompt:
        "`treeSearch` also takes its root by reference. Does it need to? And what does returning `BNode<DataType>*` buy the caller over returning `bool`?",
      expected:
        "It does not need the reference: treeSearch never assigns to root, so a plain pointer parameter would behave identically. It is inconsistent rather than wrong, most likely copied from the insert signature. Returning the pointer lets the caller read and modify the found node's data rather than merely learn it exists, and it collapses two return values into one: a real pointer means found, nullptr means absent. A bool would force a second lookup to do anything with the result.",
      criteria: [
        "The reference is unnecessary because treeSearch never assigns to root",
        "The pointer lets the caller read or modify the node's data",
        "nullptr doubles as the not-found signal",
      ],
      anchor: "#bst-search-code",
      page: 27,
      excerpt: "BNode<DataType>* BSTree<DataType>::treeSearch(BNode<DataType>* &root,",
      difficulty: 3,
    }),

    // ── Complexity and the closing table ───────────────────────────────────
    item({
      id: "trees-38",
      format: FORMATS.COMPLEXITY,
      prompt:
        "Slide 28 gives BST search as O(log2n). Under what condition is that claim false, and does the deck ever mention that condition?",
      expected:
        "It holds only for a reasonably balanced tree. Sorted input produces a degenerate one-sided tree in which insert, remove and search all degrade to O(n), which is worse than the array row on the same slide. The deck never mentions balance anywhere: no AVL, no red-black, no rotations. Slide 28 states O(log2n) as if it were unconditional.",
      criteria: [
        "The claim assumes a reasonably balanced tree",
        "Sorted input degenerates the tree and all operations become O(n)",
        "The deck never mentions balancing at all",
      ],
      anchor: "#ordered-data-with-bst",
      page: 28,
      excerpt: "| Binary Search Trees | O(log2n) | O(log2n) | O(log2n) |",
      difficulty: 3,
    }),
    item({
      id: "trees-39",
      format: FORMATS.COMPLEXITY,
      prompt:
        "Slide 3 lists array search as O(log2n) but array insert as O(n). Explain each number in one sentence.",
      expected:
        "Search is O(log2n) because a sorted array supports binary search, where one comparison discards half the remaining range, the same halving a BST gets from its ordering rule. Insert is O(n) because keeping the array sorted means shifting every element after the insertion point over by one.",
      criteria: [
        "Search: binary search on a sorted array halves the range per comparison",
        "Insert: every element after the insertion point must shift",
      ],
      anchor: "#ordered-data-array-list",
      page: 3,
      excerpt: "| Array | O(n) | O(n) | O(log2n) | Fast | Requires resizing and copying |",
      difficulty: 2,
    }),
    item({
      id: "trees-40",
      format: FORMATS.RECALL,
      prompt:
        "Slide 28 lists BST remove as O(log2n), but `treeRemove` is never shown. Why is remove the hardest of the three to write?",
      expected:
        "Insert and search always stop at a nullptr or at the target. Remove has to handle a node with two children, which cannot simply be unhooked: something must be promoted into the hole, and only two values preserve the BST rule, the largest in the left subtree or the smallest in the right. The leaf and one-child cases are easy; the two-child case is the whole problem, and it is why the function is commented out on slide 12.",
      criteria: [
        "Insert and search terminate at nullptr or the target; remove leaves a hole",
        "The two-child case is the hard one",
        "The replacement must be the left subtree's maximum or the right subtree's minimum",
      ],
      anchor: "#ordered-data-with-bst",
      page: 28,
      excerpt: "| Binary Search Trees | O(log2n) | O(log2n) | O(log2n) |",
      difficulty: 3,
    }),
  ],
};
