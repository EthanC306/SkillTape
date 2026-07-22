// ─────────────────────── CS3000 · §1.4 The Language of Graphs ───────────────────────
// Content authored from Epp, "Discrete Mathematics with Applications" 5e, §1.4.
// Text is original; the figure images are the section slides' own diagrams, reused
// for study. showChart is false — the Big-O visuals don't apply to this material.
export default {
  id: "discrete-1-4-graphs",
  title: "1.4 The Language of Graphs",
  subtitle: "CS3000 — §1.4",
  course: "discrete",
  showChart: false,
  cards: [
    {
      heading: "What a graph is",
      body:
        "A **graph** is a picture of connections: a set of **vertices** (the dots) joined by a set of **edges** (the line segments). Each edge links a vertex either to another vertex or back to itself; the lines may be straight or curved, and it's fine for two of them to **cross** at a point that is not a vertex. Careful — this is a completely different idea from the “**graph of an equation**” you plot on axes. Here a graph is just dots-and-lines, used to model *which things are connected to which*.",
      figure: {
        src: "/figures/discrete/graph-terminology.png",
        alt: "A graph whose features are labeled: parallel edges e2 and e3, a loop e5 at vertex v4, and an isolated vertex v5.",
        caption: "Vertices and edges — with a loop, parallel edges, and an isolated vertex called out",
      },
    },
    {
      heading: "How a graph is specified",
      body:
        "To pin a graph down exactly, you give three things: the **vertex set** (all the dots), the **edge set** (all the edges), and an **edge-endpoint function** that says, for each edge, **which vertex or vertices it connects**. The endpoints are written as a set: an ordinary edge joining v₁ and v₂ has endpoint set {v₁, v₂}. Because the drawing itself doesn't matter — only *what connects to what* — the **same graph can be drawn many different ways**, and two very different-looking pictures can represent the identical graph.",
      figure: {
        src: "/figures/discrete/graph-example.png",
        alt: "A graph with vertices v1 through v6 and edges e1 through e7, including parallel edges, two loops, and an isolated vertex.",
        caption: "A graph given by its vertex set, edge set, and edge-endpoint function",
      },
    },
    {
      heading: "Loops, parallel edges, isolated vertices",
      body:
        "Three special features get their own names. A **loop** is an edge that joins a vertex **to itself**. Two edges are **parallel** when they connect the **same pair** of vertices — two different roads between the same two towns. And a vertex with **no edge at all** touching it is **isolated**. A graph is allowed to have any mix of these; none of them is illegal. Spotting them quickly is the first skill in reading a graph.",
    },
    {
      heading: "Incidence and adjacency",
      body:
        "Two relationship words tie it all together. An edge is **incident on** each of its endpoints — so edge e with endpoints {v₁, v₂} is incident on v₁ and on v₂. Two **vertices** that are joined by an edge are **adjacent**. Two **edges** that share a common endpoint are adjacent to each other. And a vertex joined to itself by a loop counts as **adjacent to itself**. These terms are how you'll describe graphs precisely instead of pointing at the picture.",
    },
    {
      heading: "Directed graphs (digraphs)",
      body:
        "In a **directed graph**, or **digraph**, every edge carries a **direction**: it's associated with an **ordered pair** (v, w) rather than an unordered set, and is drawn as an **arrow** going *from* v *to* w. Order now matters — an arrow from v to w is not the same as one from w to v, exactly like the ordered pairs from §1.2. Digraphs model one-way relationships: one-way streets, “follows” on social media, or the “is-a” links below.",
    },
    {
      heading: "Graphs as models: networks",
      body:
        "Graphs shine at modeling **networks**. Telephone lines, power grids, gas pipelines, airline routes, and computer networks up to the whole **Internet** are all naturally drawn as graphs — vertices for the hubs, edges for the connections. A common design is the **hub-and-spoke** model, where many local vertices feed into a few central hubs. Framing a system as a graph turns real questions (minimize cost, keep everything connected) into graph questions you can actually solve.",
      figure: {
        src: "/figures/discrete/network-graph.png",
        alt: "An airline-style hub-and-spoke network graph connecting cities such as San Francisco, Denver, Chicago, New York, and Boston.",
        caption: "A hub-and-spoke network drawn as a graph",
      },
    },
    {
      heading: "Graphs as models: knowledge",
      body:
        "A **directed graph** can also store **knowledge**. Vertices are concepts; labeled arrows record facts like “**is-a**” and “**instance-of**.” The payoff is **inference**: a program can chase arrows to derive facts nobody typed in. If “*New York Times* → big-city daily” (instance-of), “big-city daily → newspaper” (is-a), and “newspaper → matte” (paper-finish), then following the chain lets you conclude the *New York Times* uses a **matte** finish — new knowledge built from stored links.",
      figure: {
        src: "/figures/discrete/knowledge-graph.png",
        alt: "A directed graph knowledge base about periodicals, with is-a, instance-of, contains, and paper-finish arrows linking concepts like Newspaper, Big-city daily, and Matte.",
        caption: "Figure 1.4.2 — a knowledge base as a directed graph",
      },
    },
    {
      heading: "Degree of a vertex",
      body:
        "The **degree** of a vertex is the **number of edge-ends** meeting at it — count every edge touching the vertex. An **isolated** vertex has degree **0**. The one trap: a **loop adds 2** to a vertex's degree, because *both* of its ends attach there. So a vertex with two ordinary edges plus one loop has degree 2 + 2 = **4**. (A neat consequence: adding up the degrees of all vertices always gives an even number — twice the number of edges.)",
      figure: {
        src: "/figures/discrete/graph-degree.png",
        alt: "A graph with an isolated vertex v1, a vertex v2 of degree 2, and a vertex v3 with two edges plus a loop giving degree 4.",
        caption: "Degrees: deg(v₁)=0, deg(v₂)=2, deg(v₃)=4 (the loop counts twice)",
      },
    },
    {
      heading: "Application: coloring a map",
      body:
        "Here's graph modeling in action. To color a map so **no two adjacent countries share a color**, notice that only *adjacency* matters — not sizes or shapes. So build a graph: one **vertex per country**, an **edge between vertices whose countries touch**. Coloring the map now means **coloring the vertices** so adjacent vertices differ. A good strategy is to keep coloring the **uncolored vertex of highest degree** first. This is the famous graph-coloring problem — the same idea used to schedule exams or assign radio frequencies.",
      figure: {
        src: "/figures/discrete/map-coloring.png",
        alt: "A map divided into regions labeled A through J, to be colored so no two adjacent regions share a color.",
        caption: "Figure 1.4.3 — a map A–J, modeled as a graph to color",
      },
    },
  ],
  questions: [
    {
      prompt: "In a graph, what are the dots and the line segments called?",
      choices: [
        "Nodes and links",
        "Vertices and edges",
        "Points and curves",
        "Endpoints and loops",
      ],
      answer: 1,
      explanation:
        "A graph is a set of vertices (the dots) joined by edges (the segments). “Nodes/links” is informal; the textbook terms are vertices and edges.",
    },
    {
      prompt: "What is a loop in a graph?",
      choices: [
        "An edge that connects a vertex to itself",
        "Two edges joining the same pair of vertices",
        "A vertex with no edges",
        "A path that returns to its start",
      ],
      answer: 0,
      explanation:
        "A loop is an edge whose two endpoints are the same vertex — it joins that vertex to itself.",
    },
    {
      prompt: "Two edges that connect the very same pair of vertices are called…",
      choices: ["adjacent", "incident", "parallel", "isolated"],
      answer: 2,
      explanation:
        "Edges connecting the same pair of vertices are parallel. (Adjacent edges merely share one endpoint; incident relates an edge to its endpoints.)",
    },
    {
      prompt: "A vertex that has no edge connected to it is described as…",
      choices: ["parallel", "isolated", "a loop", "adjacent"],
      answer: 1,
      explanation:
        "A vertex touched by no edge is isolated. Its degree is 0.",
    },
    {
      prompt:
        "Edge e₁ has endpoints {v₁, v₂}. Which statement uses the terminology correctly?",
      choices: [
        "v₁ and v₂ are parallel",
        "e₁ is incident on v₁ and v₂, and v₁ and v₂ are adjacent",
        "e₁ is isolated",
        "v₁ is a loop of v₂",
      ],
      answer: 1,
      explanation:
        "An edge is incident on each of its endpoints, and two vertices joined by an edge are adjacent. So e₁ is incident on v₁ and v₂, which are adjacent.",
    },
    {
      prompt: "What makes a directed graph (digraph) different from an ordinary graph?",
      choices: [
        "Its edges may be curved",
        "Each edge is an ordered pair of vertices, drawn as an arrow",
        "It cannot contain loops",
        "Its vertices must be numbered",
      ],
      answer: 1,
      explanation:
        "In a digraph each edge is associated with an ordered pair (v, w) and drawn as an arrow from v to w, so direction matters.",
    },
    {
      prompt:
        "Vertex v₃ has two ordinary edges plus one loop attached to it. What is deg(v₃)?",
      figure: {
        src: "/figures/discrete/graph-degree.png",
        alt: "A graph in which vertex v3 has two edges and one loop.",
        caption: "Find deg(v₃)",
      },
      choices: ["2", "3", "4", "6"],
      answer: 2,
      explanation:
        "Each ordinary edge contributes 1 and the loop contributes 2 (both its ends attach here): 1 + 1 + 2 = 4.",
    },
    {
      prompt: "What is the degree of an isolated vertex?",
      choices: ["0", "1", "2", "Undefined"],
      answer: 0,
      explanation:
        "An isolated vertex has no edges touching it, so its degree is 0.",
    },
    {
      prompt:
        "In the periodicals knowledge base: “New York Times → big-city daily,” “big-city daily → newspaper,” and “newspaper → matte (paper-finish).” What paper finish does the New York Times use?",
      choices: ["Glossy", "Matte", "It cannot be determined", "Both"],
      answer: 1,
      explanation:
        "Following the arrows, the New York Times is a big-city daily, which is a newspaper, whose paper-finish is matte — so the finish is matte. This is inference along a directed graph.",
    },
    {
      prompt:
        "You want to color a map so no two adjacent countries share a color. How do you model it as a graph?",
      choices: [
        "One vertex per country; an edge between countries that share a border",
        "One vertex per color; edges between colors",
        "One vertex per border; edges between borders",
        "Vertices for the largest countries only",
      ],
      answer: 0,
      explanation:
        "Make each country a vertex and join two vertices with an edge exactly when their countries are adjacent. Coloring the map becomes coloring the vertices so adjacent ones differ.",
    },
    {
      prompt:
        "Two drawings look different but have the same vertex set, edge set, and edge-endpoint function. What can you conclude?",
      choices: [
        "They are different graphs because they look different",
        "They represent the same graph",
        "One of them must contain an error",
        "Only if neither has a loop",
      ],
      answer: 1,
      explanation:
        "A graph is determined by its vertices, edges, and endpoints — not by how it's drawn. Same three pieces ⇒ same graph, regardless of the picture.",
    },
    {
      prompt:
        "When coloring a graph's vertices, a good strategy at each step is to color…",
      choices: [
        "the uncolored vertex of highest degree",
        "the vertex with the fewest edges",
        "any isolated vertex first",
        "vertices in alphabetical order",
      ],
      answer: 0,
      explanation:
        "Focusing on the uncolored vertex of maximum degree — the one connected to the most others — is an efficient heuristic for graph coloring.",
    },
  ],
};
