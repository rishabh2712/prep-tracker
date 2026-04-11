export type MockInterviewQuestionConfig = {
  id: string;
  title: string;
  slug?: string;
  leetcodeId?: number;
  difficulty: "Easy" | "Medium" | "Hard";
  patterns: string[];
  timeboxMinutes: number;
  problemStatement: string;
  requirements: string[];
  constraints?: string[];
  exampleMarkdown: string;
  followUps: string[];
  hints?: string[];
  linkedBankId?: string;
};

const DEFAULT_TIMEBOX_MINUTES = 30;

function question(config: Omit<MockInterviewQuestionConfig, "timeboxMinutes">): MockInterviewQuestionConfig {
  return {
    ...config,
    timeboxMinutes: DEFAULT_TIMEBOX_MINUTES,
  };
}

export const UBER_DSA_MOCK_QUESTIONS: MockInterviewQuestionConfig[] = [
  question({
    id: "mock-dsa-bus-routes",
    title: "Bus Routes",
    slug: "bus-routes",
    leetcodeId: 815,
    difficulty: "Hard",
    patterns: ["Graphs", "BFS", "Modeling"],
    linkedBankId: "DX-02",
    problemStatement:
      "You are given a list of bus routes where each route repeats forever. Return the minimum number of buses you must ride to travel from a source stop to a target stop. If it is impossible, return `-1`.",
    requirements: [
      "Model the transit system cleanly instead of simulating every possible ride path.",
      "Optimize for minimum number of buses taken, not minimum number of stops traveled.",
      "Handle shared stops across multiple routes correctly.",
      "Short-circuit when `source === target`.",
    ],
    constraints: [
      "A route may contain many stops and different routes may overlap heavily.",
      "The interviewer expects a graph/BFS model, not brute-force route chaining.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- routes = [[1, 2, 7], [3, 6, 7]]\n- source = 1\n- target = 6\n\n**Output**\n\n\`2\`\n\n**Explanation**\n\nRide the first bus from stop 1 to stop 7, then transfer to the second bus and reach stop 6.`,
    followUps: [
      "What is the graph here: stops or routes? Why?",
      "How would you reconstruct the actual transfer path, not just the count?",
      "What breaks if you only track visited stops and not visited routes?",
    ],
    hints: [
      "A BFS layer can represent taking one more bus.",
      "The stop-to-routes index is usually the key preprocessing step.",
    ],
  }),
  question({
    id: "mock-dsa-longest-continuous-subarray",
    title: "Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit",
    slug: "longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit",
    leetcodeId: 1438,
    difficulty: "Medium",
    patterns: ["Sliding Window", "Monotonic Queue"],
    linkedBankId: "D-13",
    problemStatement:
      "Given an array of integers and an integer `limit`, return the length of the longest non-empty subarray such that the absolute difference between any two elements in that subarray is less than or equal to `limit`.",
    requirements: [
      "Use an approach that works in linear or near-linear time.",
      "Maintain the current window minimum and maximum efficiently while the window expands and shrinks.",
      "Avoid recomputing min/max by scanning the window repeatedly.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- nums = [8, 2, 4, 7]\n- limit = 4\n\n**Output**\n\n\`2\`\n\n**Explanation**\n\nThe longest valid subarrays are [2, 4] and [4, 7].`,
    followUps: [
      "Why are two monotonic deques better than a heap here?",
      "What invariant do the deques maintain?",
      "How would you explain the amortized O(n) bound to the interviewer?",
    ],
    hints: [
      "One deque tracks decreasing values for the maximum, another increasing values for the minimum.",
    ],
  }),
  question({
    id: "mock-dsa-alien-dictionary",
    title: "Alien Dictionary",
    slug: "alien-dictionary",
    leetcodeId: 269,
    difficulty: "Hard",
    patterns: ["Graphs", "Topological Sort"],
    linkedBankId: "D-12",
    problemStatement:
      "You are given a sorted list of words from an unknown language. Derive one valid character ordering for that language. If no valid ordering exists, return an empty string.",
    requirements: [
      "Construct ordering constraints from adjacent words only.",
      "Detect invalid prefix cases such as a longer word appearing before its prefix.",
      "Return a valid topological ordering if one exists.",
      "Return an empty string if the graph contains a cycle or the ordering is invalid.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- words = ["wrt", "wrf", "er", "ett", "rftt"]\n\n**Output**\n\n\`"wertf"\`\n\nAny valid ordering that respects the constraints is acceptable.`,
    followUps: [
      "Why do you compare adjacent words instead of all pairs?",
      "How do you ensure isolated characters still appear in the answer?",
      "Would you choose DFS topo sort or Kahn's algorithm here, and why?",
    ],
    hints: [
      "The first differing character between adjacent words gives you an edge.",
    ],
  }),
  question({
    id: "mock-dsa-number-of-islands",
    title: "Number of Islands",
    slug: "number-of-islands",
    leetcodeId: 200,
    difficulty: "Medium",
    patterns: ["Graphs", "DFS", "BFS", "Grid Traversal"],
    problemStatement:
      "Given a 2D grid of `'1'` and `'0'` cells, return the number of connected components of land. Cells are connected horizontally or vertically.",
    requirements: [
      "Count each island exactly once.",
      "Do not double-count land that has already been visited.",
      "Use DFS, BFS, or Union-Find with clear reasoning.",
    ],
    constraints: [
      "Cells connect only vertically and horizontally.",
      "Mutating the input grid is allowed only if you state that assumption clearly.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\ngrid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]\n\n**Output**\n\n\`3\``,
    followUps: [
      "How would the solution change if diagonal adjacency also counted?",
      "When would you prefer Union-Find over DFS/BFS?",
    ],
    hints: ["The problem is fundamentally connected-component counting on a grid."],
  }),
  question({
    id: "mock-dsa-islands-ii",
    title: "Dynamic Grid Connectivity (Islands II)",
    slug: "number-of-islands-ii",
    leetcodeId: 305,
    difficulty: "Hard",
    patterns: ["Union-Find", "Dynamic Connectivity", "Graphs"],
    linkedBankId: "D-09",
    problemStatement:
      "You are given an initially empty `m x n` grid and a sequence of positions where land is added one cell at a time. After each addition, return the current number of islands.",
    requirements: [
      "Return an answer after every land addition.",
      "Avoid re-running a full flood fill after each query.",
      "Use a Disjoint Set Union / Union-Find based approach with path compression and union by rank or size.",
      "Handle duplicate land additions safely.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- m = 3, n = 3\n- positions = [[0,0],[0,1],[1,2],[2,1],[1,1]]\n\n**Output**\n\n\`[1,1,2,3,1]\``,
    followUps: [
      "Why does DFS-after-each-update fail the interview bar here?",
      "How do you map 2D coordinates to a 1D Union-Find parent array?",
      "What happens when the same position is added twice?",
    ],
    hints: [
      "Track a running island count and decrement it when two components merge.",
    ],
  }),
  question({
    id: "mock-dsa-lru-cache",
    title: "LRU Cache",
    slug: "lru-cache",
    leetcodeId: 146,
    difficulty: "Medium",
    patterns: ["Design", "Hash Map", "Doubly Linked List"],
    linkedBankId: "D-11",
    problemStatement:
      "Design a data structure that supports `get(key)` and `put(key, value)` in O(1) average time and evicts the least recently used key when capacity is exceeded.",
    requirements: [
      "Implement the `LRUCache` class with a fixed capacity.",
      "`get` should return `-1` when the key is missing.",
      "`put` should update existing keys and refresh recency.",
      "Eviction must target the least recently used entry.",
    ],
    exampleMarkdown: `### Example\n\n\`\`\`javascript\nconst cache = new LRUCache(2);\ncache.put(1, 1);\ncache.put(2, 2);\ncache.get(1);    // 1\ncache.put(3, 3); // evicts key 2\ncache.get(2);    // -1\n\`\`\``,
    followUps: [
      "Why is a hash map alone insufficient?",
      "What pointers do you update when moving a node to the front?",
      "How would you test the recency invariant directly?",
    ],
    hints: ["The standard answer is hash map plus doubly linked list."],
  }),
  question({
    id: "mock-dsa-course-schedule-ii",
    title: "Course Schedule II",
    slug: "course-schedule-ii",
    leetcodeId: 210,
    difficulty: "Medium",
    patterns: ["Graphs", "Topological Sort"],
    linkedBankId: "D-07",
    problemStatement:
      "There are `numCourses` labeled from `0` to `numCourses - 1` and a list of prerequisite pairs. Return one valid ordering of courses you can take to finish everything, or an empty array if it is impossible.",
    requirements: [
      "Return a valid topological ordering when one exists.",
      "Return an empty array when the dependency graph contains a cycle.",
      "Choose either Kahn's algorithm or DFS-based cycle detection and explain the tradeoff.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- numCourses = 4\n- prerequisites = [[1,0],[2,0],[3,1],[3,2]]\n\n**Output**\n\nOne valid answer is \`[0,1,2,3]\`.`,
    followUps: [
      "How does this differ from Course Schedule I?",
      "Why does the count of processed nodes detect cycles in Kahn's algorithm?",
    ],
    hints: ["Think indegree plus queue if you want the cleanest ordering construction."],
  }),
  question({
    id: "mock-dsa-course-schedule",
    title: "Course Schedule",
    slug: "course-schedule",
    leetcodeId: 207,
    difficulty: "Medium",
    patterns: ["Graphs", "Cycle Detection"],
    linkedBankId: "D-06",
    problemStatement:
      "Given `numCourses` and prerequisite pairs, return `true` if you can finish all courses and `false` otherwise.",
    requirements: [
      "Detect cycles in the prerequisite graph.",
      "Use either DFS state coloring or Kahn's algorithm.",
      "Avoid re-processing the same node unnecessarily.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- numCourses = 2\n- prerequisites = [[1,0],[0,1]]\n\n**Output**\n\n\`false\``,
    followUps: [
      "What node states do you track in DFS cycle detection?",
      "When does this naturally extend into Course Schedule II?",
    ],
    hints: ["The core of the problem is cycle detection in a directed graph."],
  }),
  question({
    id: "mock-dsa-network-delay-time",
    title: "Network Delay Time",
    slug: "network-delay-time",
    leetcodeId: 743,
    difficulty: "Medium",
    patterns: ["Graphs", "Shortest Path", "Dijkstra"],
    linkedBankId: "D-08",
    problemStatement:
      "You are given a directed weighted graph with `n` nodes and a starting node `k`. Return the time it takes for all nodes to receive the signal. If any node is unreachable, return `-1`.",
    requirements: [
      "Model the graph using an adjacency list.",
      "Use a shortest-path strategy appropriate for non-negative weights.",
      "Return the maximum shortest-path distance among all reachable nodes.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- times = [[2,1,1],[2,3,1],[3,4,1]]\n- n = 4\n- k = 2\n\n**Output**\n\n\`2\``,
    followUps: [
      "Why is BFS insufficient here?",
      "What would change if some edges had negative weights?",
    ],
    hints: ["The graph is weighted and all weights are non-negative."],
  }),
  question({
    id: "mock-dsa-cheapest-flights-k-stops",
    title: "Cheapest Flights Within K Stops",
    slug: "cheapest-flights-within-k-stops",
    leetcodeId: 787,
    difficulty: "Hard",
    patterns: ["Graphs", "Shortest Path", "Bounded Stops"],
    linkedBankId: "DX-01",
    problemStatement:
      "You are given `n` cities, a list of directed flights with prices, a source city, a destination city, and an integer `k`. Return the cheapest price from source to destination using at most `k` stops. If no such route exists, return `-1`.",
    requirements: [
      "Respect the stop constraint exactly; a cheaper path with too many stops is invalid.",
      "Use a graph traversal strategy that tracks both cost and remaining stops or edges used.",
      "Avoid pruning states too aggressively if they differ by stop budget.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- n = 4\n- flights = [[0,1,100],[1,2,100],[2,3,100],[0,3,500]]\n- src = 0, dst = 3, k = 1\n\n**Output**\n\n\`500\`\n\nThe cheaper 0→1→2→3 path is invalid because it exceeds the stop limit.`,
    followUps: [
      "Why can a plain Dijkstra implementation be wrong here?",
      "What state do you store in the priority queue or BFS frontier?",
      "How do you explain the difference between stops and edges?",
    ],
    hints: ["The stop budget is part of the state, not just a final filter."],
  }),
  question({
    id: "mock-dsa-sliding-window-maximum",
    title: "Sliding Window Maximum",
    slug: "sliding-window-maximum",
    leetcodeId: 239,
    difficulty: "Medium",
    patterns: ["Sliding Window", "Monotonic Deque"],
    linkedBankId: "D-04",
    problemStatement:
      "Given an array of integers and a window size `k`, return an array containing the maximum value in each sliding window as it moves from left to right.",
    requirements: [
      "Produce all window maxima in overall O(n) time.",
      "Do not sort or rescan every window.",
      "Use a monotonic deque and explain the invariant clearly.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- nums = [1,3,-1,-3,5,3,6,7]\n- k = 3\n\n**Output**\n\n\`[3,3,5,5,6,7]\``,
    followUps: [
      "Why do you store indices instead of values?",
      "When exactly do elements leave the deque?",
    ],
    hints: ["The deque should stay decreasing by value."],
  }),
  question({
    id: "mock-dsa-longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    slug: "longest-consecutive-sequence",
    leetcodeId: 128,
    difficulty: "Medium",
    patterns: ["Hash Set", "Arrays"],
    linkedBankId: "D-05",
    problemStatement:
      "Given an unsorted array of integers, return the length of the longest sequence of consecutive values.",
    requirements: [
      "Target O(n) expected time.",
      "Avoid sorting as the main solution.",
      "Use set membership to detect sequence starts cleanly.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- nums = [100,4,200,1,3,2]\n\n**Output**\n\n\`4\`\n\nThe longest sequence is [1, 2, 3, 4].`,
    followUps: [
      "Why is it enough to start counting only from numbers whose predecessor is missing?",
      "What is the tradeoff versus sorting?",
    ],
    hints: ["The key optimization is to avoid expanding every number twice."],
  }),
  question({
    id: "mock-dsa-merge-intervals",
    title: "Merge Intervals",
    slug: "merge-intervals",
    leetcodeId: 56,
    difficulty: "Medium",
    patterns: ["Intervals", "Sorting"],
    linkedBankId: "D-02",
    problemStatement:
      "Given a collection of intervals, merge all overlapping intervals and return the condensed result.",
    requirements: [
      "Sort appropriately before merging.",
      "Treat touching and overlapping intervals correctly according to the closed interval interpretation.",
      "Return the intervals in sorted order.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- intervals = [[1,3],[2,6],[8,10],[15,18]]\n\n**Output**\n\n\`[[1,6],[8,10],[15,18]]\``,
    followUps: [
      "What changes if the intervals arrive as a stream?",
      "How would you explain why sorting by start is enough?",
    ],
    hints: ["Keep a current merged interval and extend it while overlaps continue."],
  }),
  question({
    id: "mock-dsa-kth-largest",
    title: "Kth Largest Element in an Array",
    slug: "kth-largest-element-in-an-array",
    leetcodeId: 215,
    difficulty: "Medium",
    patterns: ["Heap", "Quickselect"],
    linkedBankId: "D-03",
    problemStatement:
      "Given an array and an integer `k`, return the kth largest element in the array.",
    requirements: [
      "Do not fully sort unless you explicitly justify the tradeoff.",
      "Provide either a min-heap-of-size-k solution or explain quickselect clearly.",
      "Handle duplicates correctly.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- nums = [3,2,1,5,6,4]\n- k = 2\n\n**Output**\n\n\`5\``,
    followUps: [
      "When would you prefer heap over quickselect in an interview?",
      "How do duplicates affect the answer?",
    ],
    hints: ["A min-heap of size k keeps only the k largest values seen so far."],
  }),
  question({
    id: "mock-dsa-lca-binary-tree",
    title: "Lowest Common Ancestor of a Binary Tree",
    slug: "lowest-common-ancestor-of-a-binary-tree",
    leetcodeId: 236,
    difficulty: "Medium",
    patterns: ["Trees", "DFS", "Recursion"],
    linkedBankId: "D-10",
    problemStatement:
      "Given the root of a binary tree and two nodes `p` and `q`, return their lowest common ancestor.",
    requirements: [
      "Work for a general binary tree, not a BST-specific shortcut.",
      "Use recursion or an explicit stack cleanly.",
      "Define the base cases precisely.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- root = [3,5,1,6,2,0,8,null,null,7,4]\n- p = 5\n- q = 1\n\n**Output**\n\n\`3\`\n\n**Explanation**\n\nNode 3 is the first node whose subtree contains both 5 and 1.`,
    followUps: [
      "How would the solution differ for a BST?",
      "What if one of the nodes might not exist in the tree?",
    ],
    hints: ["The recursive return value usually means: found p, found q, or found the ancestor."],
  }),
  question({
    id: "mock-dsa-word-search",
    title: "Word Search",
    slug: "word-search",
    leetcodeId: 79,
    difficulty: "Medium",
    patterns: ["Backtracking", "DFS", "Grid Traversal"],
    problemStatement:
      "Given a 2D board of characters and a target word, return `true` if the word can be formed by sequentially adjacent cells. A cell may be used at most once.",
    requirements: [
      "Search using DFS/backtracking.",
      "Prevent revisiting a cell within the same candidate path.",
      "Short-circuit as soon as a valid path is found.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\nboard = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\nword = "ABCCED"\n\n**Output**\n\n\`true\``,
    followUps: [
      "How do you mark a cell as visited without allocating a fresh matrix at every recursion level?",
      "What pruning opportunities can you mention before coding?",
    ],
    hints: ["Backtrack immediately when the current cell or character does not match."],
  }),
  question({
    id: "mock-dsa-word-search-ii",
    title: "Word Search II",
    slug: "word-search-ii",
    leetcodeId: 212,
    difficulty: "Hard",
    patterns: ["Backtracking", "Trie", "DFS"],
    problemStatement:
      "Given a board of characters and a list of words, return all words that can be formed on the board. A cell may be used at most once per word.",
    requirements: [
      "Avoid running an independent full DFS for every word if a better shared-prefix strategy exists.",
      "Return each found word at most once.",
      "Use a Trie plus board DFS for a strong interview answer.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]\n- words = ["oath","pea","eat","rain"]\n\n**Output**\n\n\`["oath","eat"]\``,
    followUps: [
      "How does the Trie help compared with searching each word independently?",
      "How do you avoid returning the same word twice?",
    ],
    hints: ["The board DFS should stop as soon as the Trie has no matching child for the next character."],
  }),
  question({
    id: "mock-dsa-meeting-rooms-ii",
    title: "Meeting Rooms II",
    slug: "meeting-rooms-ii",
    leetcodeId: 253,
    difficulty: "Medium",
    patterns: ["Intervals", "Heap", "Sweep Line"],
    problemStatement:
      "Given a list of meeting time intervals, return the minimum number of conference rooms required to host all meetings.",
    requirements: [
      "Count simultaneous overlaps correctly.",
      "Use either a min-heap or a sorted two-array sweep technique.",
      "Handle meetings that end exactly when another starts.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- intervals = [[0,30],[5,10],[15,20]]\n\n**Output**\n\n\`2\``,
    followUps: [
      "How do you decide whether end time equals start time needs a new room?",
      "Why is a min-heap a good fit here?",
    ],
    hints: ["The earliest finishing active meeting is the only one you need to compare against next."],
  }),
  question({
    id: "mock-dsa-fixed-bounds",
    title: "Count Subarrays With Fixed Bounds",
    slug: "count-subarrays-with-fixed-bounds",
    leetcodeId: 2444,
    difficulty: "Hard",
    patterns: ["Sliding Window", "Index Tracking"],
    problemStatement:
      "Given an integer array and two integers `minK` and `maxK`, return the number of subarrays where the minimum value equals `minK` and the maximum value equals `maxK`.",
    requirements: [
      "Count valid subarrays in linear time.",
      "Track the most recent positions of `minK`, `maxK`, and the most recent invalid value.",
      "Do not enumerate all subarrays.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- nums = [1,3,5,2,7,5]\n- minK = 1\n- maxK = 5\n\n**Output**\n\n\`2\``,
    followUps: [
      "Why does the contribution at each index depend on the minimum of the last-seen minK and maxK?",
      "What counts as an invalid value?",
    ],
    hints: ["Think in terms of how many valid subarrays end at index i."],
  }),
  question({
    id: "mock-dsa-evaluate-division",
    title: "Evaluate Division",
    slug: "evaluate-division",
    leetcodeId: 399,
    difficulty: "Medium",
    patterns: ["Graphs", "Weighted Graph", "DFS"],
    problemStatement:
      "You are given equations like `a / b = 2.0` and queries asking for ratios such as `a / c`. Return the value of each query or `-1.0` if it cannot be determined.",
    requirements: [
      "Model variables and equations as a weighted graph.",
      "Answer each query by searching for a path and multiplying edge weights along it.",
      "Return `-1.0` when variables are disconnected or unknown.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- equations = [["a","b"],["b","c"]]\n- values = [2.0, 3.0]\n- queries = [["a","c"],["b","a"],["a","e"]]\n\n**Output**\n\n\`[6.0,0.5,-1.0]\``,
    followUps: [
      "Would Union-Find with weights also work here?",
      "How do you avoid cycles during DFS?",
    ],
    hints: ["Each equation gives you two directed edges with reciprocal weights."],
  }),
  question({
    id: "mock-dsa-min-cost-grid-path",
    title: "Grid Traversal with Directional Arrows",
    slug: "minimum-cost-to-make-at-least-one-valid-path-in-a-grid",
    leetcodeId: 1368,
    difficulty: "Hard",
    patterns: ["0-1 BFS", "Graphs", "Grid Traversal"],
    problemStatement:
      "You are given an `m x n` grid where each cell contains an arrow pointing right, left, down, or up. Traveling in the arrow's direction costs `0`; changing direction costs `1`. Return the minimum cost to travel from the top-left cell to the bottom-right cell.",
    requirements: [
      "Treat each move as either weight 0 or weight 1.",
      "Use an algorithm that exploits 0/1 edge weights efficiently.",
      "Handle out-of-bounds arrow directions safely when exploring neighbors.",
    ],
    constraints: [
      "Every move is either cost 0 or cost 1.",
      "The interviewer expects you to recognize 0-1 BFS explicitly.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- grid = [[1,1,3],[3,2,2],[1,1,4]]\n\nInterpretation:\n- 1 = right\n- 2 = left\n- 3 = down\n- 4 = up\n\n**Output**\n\n\`0\`\n\n**Explanation**\n\nThere is already a valid path from the top-left cell to the bottom-right cell by following existing arrows, so no edits are needed.`,
    followUps: [
      "Why is 0-1 BFS a better fit than plain BFS?",
      "Could Dijkstra also solve it? What tradeoff would you mention?",
    ],
    hints: ["Use a deque: 0-cost moves go to the front, 1-cost moves go to the back."],
  }),
  question({
    id: "mock-dsa-next-greater-palindrome",
    title: "Next Greater Palindrome",
    difficulty: "Hard",
    patterns: ["Strings", "Math", "Carry Propagation"],
    problemStatement:
      "Given a non-negative integer represented as a string, return the smallest palindrome strictly greater than the given number.",
    requirements: [
      "Do not brute-force by incrementing the number repeatedly.",
      "Use a mirror-and-carry strategy that works in linear time.",
      "Handle all-9s inputs correctly.",
      "Preserve leading structure correctly for odd and even lengths.",
    ],
    constraints: [
      "Treat the input as a string to avoid integer overflow issues.",
      "Return the smallest palindrome strictly greater than the original value.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- num = "12321"\n\n**Output**\n\n\`"12421"\`\n\n### Edge Case\n\n**Input**\n\n- num = "999"\n\n**Output**\n\n\`"1001"\``,
    followUps: [
      "How do you decide whether simple mirroring is already enough?",
      "What changes between even and odd lengths during carry propagation?",
      "Why is the all-9s case special?",
    ],
    hints: ["Mirror first, compare, then decide whether the middle needs to be incremented."],
  }),
  question({
    id: "mock-dsa-furthest-building",
    title: "Furthest Building You Can Reach",
    slug: "furthest-building-you-can-reach",
    leetcodeId: 1642,
    difficulty: "Medium",
    patterns: ["Heap", "Greedy"],
    problemStatement:
      "You are given building heights plus limited numbers of bricks and ladders. Starting at index 0, return the furthest building index you can reach by moving right one building at a time.",
    requirements: [
      "Use ladders for the most expensive climbs whenever that is optimal.",
      "Use a min-heap to decide which climbs should consume ladders versus bricks.",
      "Return the last reachable index when resources run out.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- heights = [4,2,7,6,9,14,12]\n- bricks = 5\n- ladders = 1\n\n**Output**\n\n\`4\``,
    followUps: [
      "Why is a min-heap the right heap orientation here?",
      "What if JavaScript does not have a built-in priority queue?",
    ],
    hints: ["Think of ladders as reserved for the largest climbs seen so far."],
  }),
  question({
    id: "mock-dsa-max-points-cards",
    title: "Maximum Points You Can Obtain from Cards",
    slug: "maximum-points-you-can-obtain-from-cards",
    leetcodeId: 1423,
    difficulty: "Medium",
    patterns: ["Sliding Window", "Prefix/Suffix"],
    problemStatement:
      "You are given an array of card points and an integer `k`. You must take exactly `k` cards from either the beginning or the end. Return the maximum score you can obtain.",
    requirements: [
      "Avoid brute-forcing all left/right splits naively if you can do better.",
      "Recognize the complement subarray interpretation or use a rolling window over chosen edges.",
      "Handle the case where `k` equals the full array length.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- cardPoints = [1,2,3,4,5,6,1]\n- k = 3\n\n**Output**\n\n\`12\``,
    followUps: [
      "Why can this be reframed as finding a minimum-sum middle window?",
      "How would you explain the O(n) solution from first principles?",
    ],
    hints: ["Picking k cards from the ends is equivalent to leaving n-k contiguous cards in the middle."],
  }),
  question({
    id: "mock-dsa-kth-smallest-bst",
    title: "Kth Smallest Element in a BST",
    slug: "kth-smallest-element-in-a-bst",
    leetcodeId: 230,
    difficulty: "Medium",
    patterns: ["Trees", "Inorder Traversal", "BST"],
    problemStatement:
      "Given the root of a binary search tree and an integer `k`, return the kth smallest value stored in the tree.",
    requirements: [
      "Use the BST inorder property intentionally.",
      "Stop early once the kth element is reached if your traversal style supports it.",
      "Explain the tradeoff between recursive and iterative inorder traversal.",
    ],
    exampleMarkdown: `### Example\n\n**Input**\n\n- root = [3,1,4,null,2]\n- k = 1\n\n**Output**\n\n\`1\`\n\n**Explanation**\n\nAn inorder traversal visits the BST in sorted order: [1, 2, 3, 4].`,
    followUps: [
      "What changes if the tree is mutated frequently and kth queries are common?",
      "How would you augment the tree to answer repeated queries faster?",
    ],
    hints: ["The inorder ordering property is the whole point of the BST here."],
  }),
  question({
    id: "mock-dsa-design-hit-counter",
    title: "Design Hit Counter",
    slug: "design-hit-counter",
    leetcodeId: 362,
    difficulty: "Medium",
    patterns: ["Queues", "Design", "Rolling Window"],
    problemStatement:
      "Design a hit counter that records hits at integer timestamps and returns the number of hits received in the past 5 minutes.",
    requirements: [
      "Implement `hit(timestamp)` and `getHits(timestamp)`.",
      "Count only hits in the trailing 300-second window.",
      "Keep memory bounded as timestamps advance.",
      "Assume timestamps are provided in non-decreasing order.",
    ],
    exampleMarkdown: `### Example\n\n\`\`\`javascript\ncounter.hit(1);\ncounter.hit(2);\ncounter.hit(3);\ncounter.getHits(4);   // 3\ncounter.hit(300);\ncounter.getHits(300); // 4\ncounter.getHits(301); // 3\n\`\`\``,
    followUps: [
      "What data structure would you choose if hit volume is extremely high?",
      "How would you compress repeated timestamps?",
    ],
    hints: ["A queue of timestamps works, but think about aggregation as an optimization."],
  }),
];

export const UBER_DSA_MOCK_QUESTION_IDS = new Set(UBER_DSA_MOCK_QUESTIONS.map((question) => question.id));
export const UBER_DSA_MOCK_DURATION_MINUTES = DEFAULT_TIMEBOX_MINUTES;
