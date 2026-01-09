/**
 * Data Structures Library
 * Provides class definitions and helper functions for LinkedList, Tree, Graph
 * Supports Python, JavaScript, Java, and C++
 */

const dataStructures = {
    python: {
        ListNode: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next`,

        DoublyListNode: `class DoublyListNode:
    def __init__(self, val=0, next=None, prev=None):
        self.val = val
        self.next = next
        self.prev = prev`,

        TreeNode: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`,

        GraphNode: `class GraphNode:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []`,

        arrayToLinkedList: `def arrayToLinkedList(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for i in range(1, len(arr)):
        current.next = ListNode(arr[i])
        current = current.next
    return head`,

        linkedListToArray: `def linkedListToArray(head):
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result`,

        arrayToDoublyLinkedList: `def arrayToDoublyLinkedList(arr):
    if not arr:
        return None
    head = DoublyListNode(arr[0])
    current = head
    for i in range(1, len(arr)):
        new_node = DoublyListNode(arr[i])
        current.next = new_node
        new_node.prev = current
        current = new_node
    return head`,

        doublyLinkedListToArray: `def doublyLinkedListToArray(head):
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result`,

        arrayToTree: `def arrayToTree(arr):
    if not arr:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root`,

        treeToArray: `def treeToArray(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result`
    },

    javascript: {
        ListNode: `class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}`,

        DoublyListNode: `class DoublyListNode {
    constructor(val = 0, next = null, prev = null) {
        this.val = val;
        this.next = next;
        this.prev = prev;
    }
}`,

        TreeNode: `class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}`,

        GraphNode: `class GraphNode {
    constructor(val = 0, neighbors = []) {
        this.val = val;
        this.neighbors = neighbors;
    }
}`,

        arrayToLinkedList: `function arrayToLinkedList(arr) {
    if (!arr || arr.length === 0) return null;
    const head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}`,

        linkedListToArray: `function linkedListToArray(head) {
    const result = [];
    let current = head;
    while (current) {
        result.push(current.val);
        current = current.next;
    }
    return result;
}`,

        arrayToDoublyLinkedList: `function arrayToDoublyLinkedList(arr) {
    if (!arr || arr.length === 0) return null;
    const head = new DoublyListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        const newNode = new DoublyListNode(arr[i]);
        current.next = newNode;
        newNode.prev = current;
        current = newNode;
    }
    return head;
}`,

        doublyLinkedListToArray: `function doublyLinkedListToArray(head) {
    const result = [];
    let current = head;
    while (current) {
        result.push(current.val);
        current = current.next;
    }
    return result;
}`,

        arrayToTree: `function arrayToTree(arr) {
    if (!arr || arr.length === 0) return null;
    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;
    while (queue.length > 0 && i < arr.length) {
        const node = queue.shift();
        if (i < arr.length && arr[i] !== null) {
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null) {
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }
        i++;
    }
    return root;
}`,

        treeToArray: `function treeToArray(root) {
    if (!root) return [];
    const result = [];
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node) {
            result.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        } else {
            result.push(null);
        }
    }
    while (result.length > 0 && result[result.length - 1] === null) {
        result.pop();
    }
    return result;
}`
    },

    java: {
        ListNode: `class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}`,

        DoublyListNode: `class DoublyListNode {
    int val;
    DoublyListNode next;
    DoublyListNode prev;
    DoublyListNode() {}
    DoublyListNode(int val) { this.val = val; }
    DoublyListNode(int val, DoublyListNode next, DoublyListNode prev) {
        this.val = val;
        this.next = next;
        this.prev = prev;
    }
}`,

        TreeNode: `class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}`
    },

    cpp: {
        ListNode: `struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};`,

        DoublyListNode: `struct DoublyListNode {
    int val;
    DoublyListNode *next;
    DoublyListNode *prev;
    DoublyListNode() : val(0), next(nullptr), prev(nullptr) {}
    DoublyListNode(int x) : val(x), next(nullptr), prev(nullptr) {}
    DoublyListNode(int x, DoublyListNode *next, DoublyListNode *prev) : val(x), next(next), prev(prev) {}
};`,

        TreeNode: `struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};`,

        arrayToLinkedList: `ListNode* arrayToLinkedList(vector<int>& arr) {
    if (arr.empty()) return nullptr;
    ListNode* head = new ListNode(arr[0]);
    ListNode* current = head;
    for (int i = 1; i < arr.size(); i++) {
        current->next = new ListNode(arr[i]);
        current = current->next;
    }
    return head;
}`,

        linkedListToArray: `vector<int> linkedListToArray(ListNode* head) {
    vector<int> result;
    while (head) {
        result.push_back(head->val);
        head = head->next;
    }
    return result;
}`,

        arrayToDoublyLinkedList: `DoublyListNode* arrayToDoublyLinkedList(vector<int>& arr) {
    if (arr.empty()) return nullptr;
    DoublyListNode* head = new DoublyListNode(arr[0]);
    DoublyListNode* current = head;
    for (int i = 1; i < arr.size(); i++) {
        DoublyListNode* newNode = new DoublyListNode(arr[i]);
        current->next = newNode;
        newNode->prev = current;
        current = newNode;
    }
    return head;
}`,

        doublyLinkedListToArray: `vector<int> doublyLinkedListToArray(DoublyListNode* head) {
    vector<int> result;
    while (head) {
        result.push_back(head->val);
        head = head->next;
    }
    return result;
}`,

        arrayToTree: `TreeNode* arrayToTree(vector<string>& arr) {
    if (arr.empty() || arr[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(arr[0]));
    queue<TreeNode*> q;
    q.push(root);
    int i = 1;
    while (!q.empty() && i < arr.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < arr.size() && arr[i] != "null") {
            node->left = new TreeNode(stoi(arr[i]));
            q.push(node->left);
        }
        i++;
        if (i < arr.size() && arr[i] != "null") {
            node->right = new TreeNode(stoi(arr[i]));
            q.push(node->right);
        }
        i++;
    }
    return root;
}`,

        treeToArray: `vector<string> treeToArray(TreeNode* root) {
    vector<string> result;
    if (!root) return result;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (node) {
            result.push_back(to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        } else {
            result.push_back("null");
        }
    }
    while (!result.empty() && result.back() == "null") {
        result.pop_back();
    }
    return result;
}`
    }
};

module.exports = dataStructures;
