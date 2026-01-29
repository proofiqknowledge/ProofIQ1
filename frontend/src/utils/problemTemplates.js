/**
 * Problem Template Library
 * Pre-defined templates for common coding problems
 */

export const problemTemplates = {
    // ===== ARRAY PROBLEMS =====
    twoSum: {
        name: 'Two Sum',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.',
        problemType: 'array',
        functionName: 'twoSum',
        inputSchema: [
            { name: 'nums', type: 'array<int>', description: 'Array of integers' },
            { name: 'target', type: 'int', description: 'Target sum' }
        ],
        outputType: { type: 'array<int>', description: 'Indices of the two numbers' },
        sampleTestCase: {
            input: [[2, 7, 11, 15], 9],
            output: [0, 1]
        }
    },

    maxSubarray: {
        name: 'Maximum Subarray Sum',
        description: 'Find the contiguous subarray which has the largest sum and return its sum.',
        problemType: 'array',
        functionName: 'maxSubArray',
        inputSchema: [
            { name: 'nums', type: 'array<int>', description: 'Array of integers' }
        ],
        outputType: { type: 'int', description: 'Maximum sum' },
        sampleTestCase: {
            input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]],
            output: 6
        }
    },

    // ===== LINKED LIST PROBLEMS =====
    reverseLinkedList: {
        name: 'Reverse Linked List',
        description: 'Given the head of a singly linked list, reverse the list and return the reversed list.',
        problemType: 'linkedlist',
        functionName: 'reverseList',
        inputSchema: [
            { name: 'head', type: 'linkedlist', description: 'Head of the linked list' }
        ],
        outputType: { type: 'linkedlist', description: 'Head of the reversed list' },
        sampleTestCase: {
            input: [[1, 2, 3, 4, 5]],
            output: [5, 4, 3, 2, 1]
        }
    },

    mergeTwoLists: {
        name: 'Merge Two Sorted Lists',
        description: 'Merge two sorted linked lists and return it as a sorted list.',
        problemType: 'linkedlist',
        functionName: 'mergeTwoLists',
        inputSchema: [
            { name: 'list1', type: 'linkedlist', description: 'First sorted list' },
            { name: 'list2', type: 'linkedlist', description: 'Second sorted list' }
        ],
        outputType: { type: 'linkedlist', description: 'Merged sorted list' },
        sampleTestCase: {
            input: [[1, 2, 4], [1, 3, 4]],
            output: [1, 1, 2, 3, 4, 4]
        }
    },

    detectCycle: {
        name: 'Linked List Cycle Detection',
        description: 'Given head of a linked list, determine if the linked list has a cycle in it.',
        problemType: 'linkedlist',
        functionName: 'hasCycle',
        inputSchema: [
            { name: 'head', type: 'linkedlist', description: 'Head of the linked list' }
        ],
        outputType: { type: 'bool', description: 'True if cycle exists' },
        sampleTestCase: {
            input: [[3, 2, 0, -4]],
            output: false
        }
    },

    // ===== TREE PROBLEMS =====
    inorderTraversal: {
        name: 'Binary Tree Inorder Traversal',
        description: 'Given the root of a binary tree, return the inorder traversal of its nodes\' values.',
        problemType: 'tree',
        functionName: 'inorderTraversal',
        inputSchema: [
            { name: 'root', type: 'tree', description: 'Root of the binary tree' }
        ],
        outputType: { type: 'array<int>', description: 'Inorder traversal values' },
        sampleTestCase: {
            input: [[1, null, 2, 3]],
            output: [1, 3, 2]
        }
    },

    maxDepth: {
        name: 'Maximum Depth of Binary Tree',
        description: 'Given the root of a binary tree, return its maximum depth.',
        problemType: 'tree',
        functionName: 'maxDepth',
        inputSchema: [
            { name: 'root', type: 'tree', description: 'Root of the binary tree' }
        ],
        outputType: { type: 'int', description: 'Maximum depth' },
        sampleTestCase: {
            input: [[3, 9, 20, null, null, 15, 7]],
            output: 3
        }
    },

    isValidBST: {
        name: 'Validate Binary Search Tree',
        description: 'Given the root of a binary tree, determine if it is a valid binary search tree.',
        problemType: 'tree',
        functionName: 'isValidBST',
        inputSchema: [
            { name: 'root', type: 'tree', description: 'Root of the binary tree' }
        ],
        outputType: { type: 'bool', description: 'True if valid BST' },
        sampleTestCase: {
            input: [[2, 1, 3]],
            output: true
        }
    },

    // ===== ALGORITHM PROBLEMS =====
    cpuScheduling: {
        name: 'CPU Scheduling - FCFS',
        description: 'Implement First Come First Serve (FCFS) CPU scheduling algorithm. Return the average waiting time.',
        problemType: 'algorithm',
        functionName: 'fcfsScheduling',
        inputSchema: [
            { name: 'processes', type: 'array<int>', description: 'Process IDs' },
            { name: 'arrivalTimes', type: 'array<int>', description: 'Arrival times' },
            { name: 'burstTimes', type: 'array<int>', description: 'Burst times' }
        ],
        outputType: { type: 'float', description: 'Average waiting time' },
        sampleTestCase: {
            input: [[1, 2, 3], [0, 1, 2], [10, 5, 8]],
            output: 7.67
        }
    },

    longestIncreasingSubsequence: {
        name: 'Longest Increasing Subsequence',
        description: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
        problemType: 'algorithm',
        functionName: 'lengthOfLIS',
        inputSchema: [
            { name: 'nums', type: 'array<int>', description: 'Array of integers' }
        ],
        outputType: { type: 'int', description: 'Length of LIS' },
        sampleTestCase: {
            input: [[10, 9, 2, 5, 3, 7, 101, 18]],
            output: 4
        }
    },

    // ===== SIMPLE MULTI-PARAMETER =====
    findMax: {
        name: 'Find Maximum of Four Numbers',
        description: 'Given four integers, return the maximum value among them.',
        problemType: 'simple',
        functionName: 'findMax',
        inputSchema: [
            { name: 'a', type: 'int', description: 'First number' },
            { name: 'b', type: 'int', description: 'Second number' },
            { name: 'c', type: 'int', description: 'Third number' },
            { name: 'd', type: 'int', description: 'Fourth number' }
        ],
        outputType: { type: 'int', description: 'Maximum value' },
        sampleTestCase: {
            input: [5, 12, 3, 20],
            output: 20
        }
    }
};

/**
 * Get template by key
 */
export const getTemplate = (key) => {
    return problemTemplates[key] || null;
};

/**
 * Get all templates for a specific problem type
 */
export const getTemplatesByType = (problemType) => {
    return Object.values(problemTemplates).filter(t => t.problemType === problemType);
};

/**
 * Get all template names
 */
export const getTemplateNames = () => {
    return Object.keys(problemTemplates).map(key => ({
        key,
        name: problemTemplates[key].name
    }));
};
