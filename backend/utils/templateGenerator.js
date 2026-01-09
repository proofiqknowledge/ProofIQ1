/**
 * Template Generator
 * Dynamically generates boilerplate code based on input schema
 */

const dataStructures = require('./dataStructures');

function generateTemplate({ language, problemType, inputSchema, outputType, functionName }) {
    const lang = language.toLowerCase();

    // Generate based on language
    switch (lang) {
        case 'python':
        case 'python3':
            return generatePythonTemplate({ problemType, inputSchema, outputType, functionName });
        case 'javascript':
            return generateJavaScriptTemplate({ problemType, inputSchema, outputType, functionName });
        case 'java':
            return generateJavaTemplate({ problemType, inputSchema, outputType, functionName });
        case 'cpp':
            return generateCppTemplate({ problemType, inputSchema, outputType, functionName });
        case 'c':
            return generateCTemplate({ problemType, inputSchema, outputType, functionName });
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

// ===== PYTHON TEMPLATE GENERATION =====
function generatePythonTemplate({ problemType, inputSchema, outputType, functionName }) {
    let dataStructureDefs = '';
    let helperFunctions = '';
    let inputParsing = '';
    let outputFormatting = '';

    // Determine which data structures are needed
    const needsLinkedList = inputSchema.some(p => p.type === 'linkedlist') || outputType.type === 'linkedlist';
    const needsDoublyLinkedList = inputSchema.some(p => p.type === 'doublylinkedlist') || outputType.type === 'doublylinkedlist';
    const needsTree = inputSchema.some(p => p.type === 'tree') || outputType.type === 'tree';
    const needsGraph = inputSchema.some(p => p.type === 'graph') || outputType.type === 'graph';

    // Add data structure definitions
    if (needsLinkedList) {
        dataStructureDefs += dataStructures.python.ListNode + '\n\n';
        helperFunctions += dataStructures.python.arrayToLinkedList + '\n\n';
        helperFunctions += dataStructures.python.linkedListToArray + '\n\n';
    }

    if (needsDoublyLinkedList) {
        dataStructureDefs += dataStructures.python.DoublyListNode + '\n\n';
        helperFunctions += dataStructures.python.arrayToDoublyLinkedList + '\n\n';
        helperFunctions += dataStructures.python.doublyLinkedListToArray + '\n\n';
    }

    if (needsTree) {
        dataStructureDefs += dataStructures.python.TreeNode + '\n\n';
        helperFunctions += dataStructures.python.arrayToTree + '\n\n';
        helperFunctions += dataStructures.python.treeToArray + '\n\n';
    }

    // ✅ FIX: Decode HTML entities in parameter types (< becomes &lt;, > becomes &gt;)
    // This happens when data is passed through HTML forms
    inputSchema = inputSchema.map(param => ({
        ...param,
        type: param.type
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
    }));

    // Generate input parsing
    // Check if all parameters are simple types (int, float, string, bool)
    const allSimpleTypes = inputSchema.every(p =>
        ['int', 'float', 'string', 'bool'].includes(p.type)
    );

    if (allSimpleTypes && inputSchema.length > 1) {
        // Multiple simple parameters - read from single line, space-separated
        inputParsing += `    inputs = input().split()\n`;
        inputSchema.forEach((param, index) => {
            if (param.type === 'int') {
                inputParsing += `    ${param.name} = int(inputs[${index}])\n`;
            } else if (param.type === 'float') {
                inputParsing += `    ${param.name} = float(inputs[${index}])\n`;
            } else if (param.type === 'string') {
                inputParsing += `    ${param.name} = inputs[${index}]\n`;
            } else if (param.type === 'bool') {
                inputParsing += `    ${param.name} = inputs[${index}].lower() == 'true'\n`;
            }
        });
    } else {
        // Complex types or single parameter - read line by line
        inputSchema.forEach((param, index) => {
            if (param.type === 'int') {
                inputParsing += `    ${param.name} = int(input())\n`;
            } else if (param.type === 'float') {
                inputParsing += `    ${param.name} = float(input())\n`;
            } else if (param.type === 'string') {
                inputParsing += `    ${param.name} = input().strip()\n`;
            } else if (param.type === 'bool') {
                inputParsing += `    ${param.name} = input().strip().lower() == 'true'\n`;
            } else if (param.type === 'array<int>') {
                inputParsing += `    ${param.name} = list(map(int, input().split()))\n`;
            } else if (param.type === 'array<string>') {
                inputParsing += `    ${param.name} = input().split()\n`;
            } else if (param.type === 'linkedlist') {
                inputParsing += `    ${param.name}_arr = list(map(int, input().split()))\n`;
                inputParsing += `    ${param.name} = arrayToLinkedList(${param.name}_arr)\n`;
            } else if (param.type === 'doublylinkedlist') {
                inputParsing += `    ${param.name}_arr = list(map(int, input().split()))\n`;
                inputParsing += `    ${param.name} = arrayToDoublyLinkedList(${param.name}_arr)\n`;
            } else if (param.type === 'tree') {
                inputParsing += `    ${param.name}_arr = input().split()\n`;
                inputParsing += `    ${param.name}_arr = [int(x) if x != 'null' else None for x in ${param.name}_arr]\n`;
                inputParsing += `    ${param.name} = arrayToTree(${param.name}_arr)\n`;
            }
        });
    }

    // Generate output formatting
    if (outputType.type === 'linkedlist') {
        outputFormatting = `    result_arr = linkedListToArray(result)\n    print(' '.join(map(str, result_arr)))`;
    } else if (outputType.type === 'doublylinkedlist') {
        outputFormatting = `    result_arr = doublyLinkedListToArray(result)\n    print(' '.join(map(str, result_arr)))`;
    } else if (outputType.type === 'tree') {
        outputFormatting = `    result_arr = treeToArray(result)\n    print(' '.join([str(x) if x is not None else 'null' for x in result_arr]))`;
    } else if (outputType.type === 'array<int>' || outputType.type === 'array<string>') {
        outputFormatting = `    print(' '.join(map(str, result)))`;
    } else {
        outputFormatting = `    print(result)`;
    }

    // Generate function signature
    const params = inputSchema.map(p => p.name).join(', ');
    const functionSignature = `def ${functionName}(${params}):`;

    // Generate starter code
    const starterCode = `${dataStructureDefs}${functionSignature}
    # Write your code here
    pass`;

    // Generate hidden main block
    const hiddenMainBlock = `${helperFunctions}if __name__ == '__main__':
${inputParsing}    result = ${functionName}(${params})
${outputFormatting}`;

    console.log('=== TEMPLATE GENERATION DEBUG ===');
    console.log('Input Schema:', JSON.stringify(inputSchema, null, 2));
    console.log('Input Parsing:', inputParsing);
    console.log('Hidden Main Block:', hiddenMainBlock);
    console.log('================================');

    return {
        starterCode,
        hiddenMainBlock,
        dataStructureDefinitions: dataStructureDefs,
        functionSignature
    };
}

// ===== JAVASCRIPT TEMPLATE GENERATION =====
function generateJavaScriptTemplate({ problemType, inputSchema, outputType, functionName }) {
    let dataStructureDefs = '';
    let helperFunctions = '';
    let inputParsing = '';
    let outputFormatting = '';

    // Determine which data structures are needed
    const needsLinkedList = inputSchema.some(p => p.type === 'linkedlist') || outputType.type === 'linkedlist';
    const needsDoublyLinkedList = inputSchema.some(p => p.type === 'doublylinkedlist') || outputType.type === 'doublylinkedlist';
    const needsTree = inputSchema.some(p => p.type === 'tree') || outputType.type === 'tree';

    // Add data structure definitions
    if (needsLinkedList) {
        dataStructureDefs += dataStructures.javascript.ListNode + '\n\n';
        helperFunctions += dataStructures.javascript.arrayToLinkedList + '\n\n';
        helperFunctions += dataStructures.javascript.linkedListToArray + '\n\n';
    }

    if (needsDoublyLinkedList) {
        dataStructureDefs += dataStructures.javascript.DoublyListNode + '\n\n';
        helperFunctions += dataStructures.javascript.arrayToDoublyLinkedList + '\n\n';
        helperFunctions += dataStructures.javascript.doublyLinkedListToArray + '\n\n';
    }

    if (needsTree) {
        dataStructureDefs += dataStructures.javascript.TreeNode + '\n\n';
        helperFunctions += dataStructures.javascript.arrayToTree + '\n\n';
        helperFunctions += dataStructures.javascript.treeToArray + '\n\n';
    }

    // Generate input parsing
    let lineIndex = 0;
    inputSchema.forEach((param) => {
        if (param.type === 'int') {
            inputParsing += `const ${param.name} = parseInt(lines[${lineIndex}]);\n`;
            lineIndex++;
        } else if (param.type === 'float') {
            inputParsing += `const ${param.name} = parseFloat(lines[${lineIndex}]);\n`;
            lineIndex++;
        } else if (param.type === 'string') {
            inputParsing += `const ${param.name} = lines[${lineIndex}].trim();\n`;
            lineIndex++;
        } else if (param.type === 'bool') {
            inputParsing += `const ${param.name} = lines[${lineIndex}].trim().toLowerCase() === 'true';\n`;
            lineIndex++;
        } else if (param.type === 'array<int>') {
            inputParsing += `const ${param.name} = lines[${lineIndex}].split(' ').map(Number);\n`;
            lineIndex++;
        } else if (param.type === 'array<string>') {
            inputParsing += `const ${param.name} = lines[${lineIndex}].split(' ');\n`;
            lineIndex++;
        } else if (param.type === 'linkedlist') {
            inputParsing += `const ${param.name}_arr = lines[${lineIndex}].split(' ').map(Number);\n`;
            inputParsing += `const ${param.name} = arrayToLinkedList(${param.name}_arr);\n`;
            lineIndex++;
        } else if (param.type === 'doublylinkedlist') {
            inputParsing += `const ${param.name}_arr = lines[${lineIndex}].split(' ').map(Number);\n`;
            inputParsing += `const ${param.name} = arrayToDoublyLinkedList(${param.name}_arr);\n`;
            lineIndex++;
        } else if (param.type === 'tree') {
            inputParsing += `const ${param.name}_arr = lines[${lineIndex}].split(' ').map(x => x === 'null' ? null : parseInt(x));\n`;
            inputParsing += `const ${param.name} = arrayToTree(${param.name}_arr);\n`;
            lineIndex++;
        }
    });

    // Generate output formatting
    if (outputType.type === 'linkedlist') {
        outputFormatting = `const resultArr = linkedListToArray(result);\nconsole.log(resultArr.join(' '));`;
    } else if (outputType.type === 'doublylinkedlist') {
        outputFormatting = `const resultArr = doublyLinkedListToArray(result);\nconsole.log(resultArr.join(' '));`;
    } else if (outputType.type === 'tree') {
        outputFormatting = `const resultArr = treeToArray(result);\nconsole.log(resultArr.map(x => x === null ? 'null' : x).join(' '));`;
    } else if (outputType.type === 'array<int>' || outputType.type === 'array<string>') {
        outputFormatting = `console.log(result.join(' '));`;
    } else {
        outputFormatting = `console.log(result);`;
    }

    // Generate function signature
    const params = inputSchema.map(p => p.name).join(', ');
    const functionSignature = `function ${functionName}(${params}) {`;

    // Generate starter code
    const starterCode = `${dataStructureDefs}${functionSignature}
    // Write your code here
}`;

    // Generate hidden main block
    const hiddenMainBlock = `${helperFunctions}const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const lines = [];
rl.on('line', (line) => {
    lines.push(line);
}).on('close', () => {
    ${inputParsing}const result = ${functionName}(${params});
    ${outputFormatting}
});`;

    return {
        starterCode,
        hiddenMainBlock,
        dataStructureDefinitions: dataStructureDefs,
        functionSignature
    };
}

// ===== JAVA TEMPLATE GENERATION (Basic) =====
function generateJavaTemplate({ problemType, inputSchema, outputType, functionName }) {
    const params = inputSchema.map(p => `int ${p.name}`).join(', ');
    const functionSignature = `public static int ${functionName}(${params}) {`;

    const starterCode = `${functionSignature}
        // Write your code here
        return 0;
    }`;

    const hiddenMainBlock = `import java.util.*;

public class Main {
    ${starterCode}

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Add input parsing here
        scanner.close();
    }
}`;

    return {
        starterCode,
        hiddenMainBlock,
        dataStructureDefinitions: '',
        functionSignature
    };
}

// ===== C++ TEMPLATE GENERATION =====
function generateCppTemplate({ problemType, inputSchema, outputType, functionName }) {
    let dataStructureDefs = '';
    let commentedDataStructureDefs = '';
    let helperFunctions = '';
    let inputParsing = '';
    let outputFormatting = '';

    // Determine which data structures are needed
    const needsLinkedList = inputSchema.some(p => p.type === 'linkedlist') || outputType.type === 'linkedlist';
    // NEW: Check for Doubly Linked List
    const needsDoublyLinkedList = inputSchema.some(p => p.type === 'doublylinkedlist') || outputType.type === 'doublylinkedlist';
    const needsTree = inputSchema.some(p => p.type === 'tree') || outputType.type === 'tree';

    // Add data structure definitions
    if (needsLinkedList) {
        dataStructureDefs += dataStructures.cpp.ListNode + '\n\n';
        commentedDataStructureDefs += '/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\n\n';
        helperFunctions += dataStructures.cpp.arrayToLinkedList + '\n\n';
        helperFunctions += dataStructures.cpp.linkedListToArray + '\n\n';
    }

    if (needsDoublyLinkedList) {
        dataStructureDefs += `struct DoublyListNode {
    int val;
    DoublyListNode *next;
    DoublyListNode *prev;
    DoublyListNode() : val(0), next(nullptr), prev(nullptr) {}
    DoublyListNode(int x) : val(x), next(nullptr), prev(nullptr) {}
    DoublyListNode(int x, DoublyListNode *next, DoublyListNode *prev) : val(x), next(next), prev(prev) {}
};\n\n`;

        commentedDataStructureDefs += `/**
 * Definition for doubly-linked list.
 * struct DoublyListNode {
 *     int val;
 *     DoublyListNode *next;
 *     DoublyListNode *prev;
 *     DoublyListNode() : val(0), next(nullptr), prev(nullptr) {}
 *     DoublyListNode(int x) : val(x), next(nullptr), prev(nullptr) {}
 *     DoublyListNode(int x, DoublyListNode *next, DoublyListNode *prev) : val(x), next(next), prev(prev) {}
 * };
 */\n\n`;

        helperFunctions += `DoublyListNode* arrayToDoublyLinkedList(vector<int>& arr) {
    if (arr.empty()) return nullptr;
    DoublyListNode* head = new DoublyListNode(arr[0]);
    DoublyListNode* current = head;
    for (size_t i = 1; i < arr.size(); i++) {
        DoublyListNode* newNode = new DoublyListNode(arr[i]);
        current->next = newNode;
        newNode->prev = current;
        current = newNode;
    }
    return head;
}

vector<int> doublyLinkedListToArray(DoublyListNode* head) {
    vector<int> result;
    while (head) {
        result.push_back(head->val);
        head = head->next;
    }
    return result;
}\n\n`;
    }

    if (needsTree) {
        dataStructureDefs += dataStructures.cpp.TreeNode + '\n\n';
        commentedDataStructureDefs += '/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\n\n';
        helperFunctions += dataStructures.cpp.arrayToTree + '\n\n';
        helperFunctions += dataStructures.cpp.treeToArray + '\n\n';
    }

    // Generate input parsing
    inputSchema.forEach((param) => {
        if (param.type === 'int') {
            inputParsing += `    int ${param.name};\n    cin >> ${param.name};\n`;
        } else if (param.type === 'float') {
            inputParsing += `    double ${param.name};\n    cin >> ${param.name};\n`;
        } else if (param.type === 'string') {
            inputParsing += `    string ${param.name};\n    cin >> ${param.name};\n`;
        } else if (param.type === 'array<int>') {
            inputParsing += `    vector<int> ${param.name};\n    int num;\n    while (cin >> num) {\n        ${param.name}.push_back(num);\n        if (cin.peek() == '\\n') break;\n    }\n`;
        } else if (param.type === 'array<string>') {
            inputParsing += `    vector<string> ${param.name};\n    string str;\n    while (cin >> str) {\n        ${param.name}.push_back(str);\n        if (cin.peek() == '\\n') break;\n    }\n`;
        } else if (param.type === 'linkedlist') {
            inputParsing += `    vector<int> ${param.name}_arr;\n    int num;\n    while (cin >> num) {\n        ${param.name}_arr.push_back(num);\n        if (cin.peek() == '\\n') break;\n    }\n    ListNode* ${param.name} = arrayToLinkedList(${param.name}_arr);\n`;
        } else if (param.type === 'doublylinkedlist') {
            inputParsing += `    vector<int> ${param.name}_arr;\n    int num;\n    while (cin >> num) {\n        ${param.name}_arr.push_back(num);\n        if (cin.peek() == '\\n') break;\n    }\n    DoublyListNode* ${param.name} = arrayToDoublyLinkedList(${param.name}_arr);\n`;
        } else if (param.type === 'tree') {
            inputParsing += `    vector<string> ${param.name}_arr;\n    string str;\n    while (cin >> str) {\n        ${param.name}_arr.push_back(str);\n        if (cin.peek() == '\\n') break;\n    }\n    TreeNode* ${param.name} = arrayToTree(${param.name}_arr);\n`;
        }
    });

    // Generate output formatting
    if (outputType.type === 'linkedlist') {
        outputFormatting = `    vector<int> result_arr = linkedListToArray(result);\n    for (int i = 0; i < result_arr.size(); i++) {\n        cout << result_arr[i];\n        if (i < result_arr.size() - 1) cout << " ";\n    }\n    cout << endl;`;
    } else if (outputType.type === 'doublylinkedlist') {
        outputFormatting = `    vector<int> result_arr = doublyLinkedListToArray(result);\n    for (size_t i = 0; i < result_arr.size(); i++) {\n        cout << result_arr[i];\n        if (i < result_arr.size() - 1) cout << " ";\n    }\n    cout << endl;`;
    } else if (outputType.type === 'tree') {
        outputFormatting = `    vector<string> result_arr = treeToArray(result);\n    for (int i = 0; i < result_arr.size(); i++) {\n        cout << result_arr[i];\n        if (i < result_arr.size() - 1) cout << " ";\n    }\n    cout << endl;`;
    } else if (outputType.type === 'array<int>' || outputType.type === 'array<string>') {
        outputFormatting = `    for (int i = 0; i < result.size(); i++) {\n        cout << result[i];\n        if (i < result.size() - 1) cout << " ";\n    }\n    cout << endl;`;
    } else {
        outputFormatting = `    cout << result << endl;`;
    }

    // Determine return type
    let returnType = 'int';
    if (outputType.type === 'linkedlist') returnType = 'ListNode*';
    else if (outputType.type === 'doublylinkedlist') returnType = 'DoublyListNode*';
    else if (outputType.type === 'tree') returnType = 'TreeNode*';
    else if (outputType.type === 'array<int>') returnType = 'vector<int>';
    else if (outputType.type === 'array<string>') returnType = 'vector<string>';
    else if (outputType.type === 'string') returnType = 'string';
    else if (outputType.type === 'float') returnType = 'double';
    else if (outputType.type === 'bool') returnType = 'bool';

    // Generate function parameters
    const params = inputSchema.map(p => {
        if (p.type === 'linkedlist') return `ListNode* ${p.name}`;
        else if (p.type === 'doublylinkedlist') return `DoublyListNode* ${p.name}`;
        else if (p.type === 'tree') return `TreeNode* ${p.name}`;
        else if (p.type === 'array<int>') return `vector<int>& ${p.name}`;
        else if (p.type === 'array<string>') return `vector<string>& ${p.name}`;
        else if (p.type === 'string') return `string ${p.name}`;
        else if (p.type === 'float') return `double ${p.name}`;
        else if (p.type === 'bool') return `bool ${p.name}`;
        else return `int ${p.name}`;
    }).join(', ');

    const functionSignature = `${returnType} ${functionName}(${params})`;

    // Generate starter code
    const defaultReturn = returnType === 'ListNode*' || returnType === 'TreeNode*' || returnType === 'DoublyListNode*' ? 'nullptr' :
        returnType.startsWith('vector') ? '{}' :
            returnType === 'string' ? '""' :
                returnType === 'bool' ? 'false' : '0';

    const starterCode = `${commentedDataStructureDefs}${functionSignature} {
    // Write your code here
    return ${defaultReturn};
}`;

    // Generate C++ includes based on what's needed
    let includes = '#include <iostream>\n#include <vector>\n#include <string>\n';
    if (needsTree || needsLinkedList || needsDoublyLinkedList) {
        includes += '#include <queue>\n';
    }
    includes += 'using namespace std;\n\n';

    // Generate hidden main block
    const hiddenMainBlock = `${includes}${dataStructureDefs}${helperFunctions}${functionSignature};\n\nint main() {
${inputParsing}    ${returnType} result = ${functionName}(${inputSchema.map(p => p.name).join(', ')});
${outputFormatting}    return 0;
}`;

    return {
        starterCode,
        hiddenMainBlock,
        dataStructureDefinitions: dataStructureDefs,
        functionSignature
    };
}

// ===== C TEMPLATE GENERATION =====
function generateCTemplate({ problemType, inputSchema, outputType, functionName }) {
    let dataStructureDefs = '';
    let helperFunctions = '';
    let inputParsing = '';
    let outputFormatting = '';

    // Determine which data structures are needed
    const needsLinkedList = inputSchema.some(p => p.type === 'linkedlist') || outputType.type === 'linkedlist';
    // NEW: Check for Doubly Linked List
    const needsDoublyLinkedList = inputSchema.some(p => p.type === 'doublylinkedlist') || outputType.type === 'doublylinkedlist';
    const needsTree = inputSchema.some(p => p.type === 'tree') || outputType.type === 'tree';

    // Add data structure definitions (C uses struct keyword)
    if (needsLinkedList) {
        dataStructureDefs += 'struct ListNode {\n' +
            '    int val;\n' +
            '    struct ListNode *next;\n' +
            '};\n' +
            '\n' +
            'struct ListNode* createNode(int val) {\n' +
            '    struct ListNode* node = (struct ListNode*)malloc(sizeof(struct ListNode));\n' +
            '    node->val = val;\n' +
            '    node->next = NULL;\n' +
            '    return node;\n' +
            '}\n' +
            '\n';

        helperFunctions += 'struct ListNode* arrayToLinkedList(int* arr, int size) {\n' +
            '    if (size == 0) return NULL;\n' +
            '    struct ListNode* head = createNode(arr[0]);\n' +
            '    struct ListNode* curr = head;\n' +
            '    for (int i = 1; i < size; i++) {\n' +
            '        curr->next = createNode(arr[i]);\n' +
            '        curr = curr->next;\n' +
            '    }\n' +
            '    return head;\n' +
            '}\n' +
            '\n' +
            'void printLinkedList(struct ListNode* head) {\n' +
            '    while (head) {\n' +
            '        printf("%d", head->val);\n' +
            '        if (head->next) printf(" ");\n' +
            '        head = head->next;\n' +
            '    }\n' +
            '    printf("\\n");\n' +
            '}\n' +
            '\n';
    }

    if (needsDoublyLinkedList) {
        dataStructureDefs += 'struct DoublyListNode {\n' +
            '    int val;\n' +
            '    struct DoublyListNode *next;\n' +
            '    struct DoublyListNode *prev;\n' +
            '};\n' +
            '\n' +
            'struct DoublyListNode* createDoublyNode(int val) {\n' +
            '    struct DoublyListNode* node = (struct DoublyListNode*)malloc(sizeof(struct DoublyListNode));\n' +
            '    node->val = val;\n' +
            '    node->next = NULL;\n' +
            '    node->prev = NULL;\n' +
            '    return node;\n' +
            '}\n' +
            '\n';

        helperFunctions += 'struct DoublyListNode* arrayToDoublyLinkedList(int* arr, int size) {\n' +
            '    if (size == 0) return NULL;\n' +
            '    struct DoublyListNode* head = createDoublyNode(arr[0]);\n' +
            '    struct DoublyListNode* curr = head;\n' +
            '    for (int i = 1; i < size; i++) {\n' +
            '        struct DoublyListNode* newNode = createDoublyNode(arr[i]);\n' +
            '        curr->next = newNode;\n' +
            '        newNode->prev = curr;\n' +
            '        curr = curr->next;\n' +
            '    }\n' +
            '    return head;\n' +
            '}\n' +
            '\n' +
            'void printDoublyLinkedList(struct DoublyListNode* head) {\n' +
            '    while (head) {\n' +
            '        printf("%d", head->val);\n' +
            '        if (head->next) printf(" ");\n' +
            '        head = head->next;\n' +
            '    }\n' +
            '    printf("\\n");\n' +
            '}\n' +
            '\n';
    }

    if (needsTree) {
        dataStructureDefs += `struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};

struct TreeNode* createTreeNode(int val) {
    struct TreeNode* node = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    node->val = val;
    node->left = NULL;
    node->right = NULL;
    return node;
}

struct TreeNode* arrayToTree(char** arr, int size) {
    if (size == 0 || strcmp(arr[0], "null") == 0) return NULL;
    
    struct TreeNode* root = createTreeNode(atoi(arr[0]));
    struct TreeNode** queue = (struct TreeNode**)malloc(size * sizeof(struct TreeNode*));
    int front = 0, rear = 0;
    queue[rear++] = root;
    
    int i = 1;
    while (front < rear && i < size) {
        struct TreeNode* node = queue[front++];
        
        // Left child
        if (i < size && strcmp(arr[i], "null") != 0) {
            node->left = createTreeNode(atoi(arr[i]));
            queue[rear++] = node->left;
        }
        i++;
        
        // Right child
        if (i < size && strcmp(arr[i], "null") != 0) {
            node->right = createTreeNode(atoi(arr[i]));
            queue[rear++] = node->right;
        }
        i++;
    }
    
    free(queue);
    return root;
}

`;
    }

    // Generate input parsing for C
    let needsLineBuffer = false;

    // Check if we need a line buffer (for array, linkedlist, tree, graph, grid, or matrix types)
    inputSchema.forEach((param) => {
        if (param.type === 'array<int>' || param.type === 'linkedlist' || param.type === 'doublylinkedlist' || param.type === 'tree' ||
            param.type === 'graph' || param.type === 'grid' || param.type === 'matrix') {
            needsLineBuffer = true;
        }
    });

    // Declare line buffer once if needed
    if (needsLineBuffer) {
        inputParsing += '    char line[10000];\n';
    }

    inputSchema.forEach((param) => {
        if (param.type === 'int') {
            inputParsing += '    int ' + param.name + ';\n    scanf("%d", &' + param.name + ');\n';
        } else if (param.type === 'float') {
            inputParsing += '    double ' + param.name + ';\n    scanf("%lf", &' + param.name + ');\n';
        } else if (param.type === 'string') {
            inputParsing += '    char ' + param.name + '[1000];\n    scanf("%s", ' + param.name + ');\n';
        } else if (param.type === 'array<int>') {
            inputParsing += '    int ' + param.name + '[1000], ' + param.name + '_size = 0;\n' +
                '    if (fgets(line, sizeof(line), stdin)) {\n' +
                '        char *token = strtok(line, " ");\n' +
                '        while (token != NULL) {\n' +
                '            ' + param.name + '[' + param.name + '_size++] = atoi(token);\n' +
                '            token = strtok(NULL, " ");\n' +
                '        }\n' +
                '    }\n';
        } else if (param.type === 'linkedlist') {
            inputParsing += '    int ' + param.name + '_arr[1000], ' + param.name + '_size = 0;\n' +
                '    if (fgets(line, sizeof(line), stdin)) {\n' +
                '        char *token = strtok(line, " ");\n' +
                '        while (token != NULL) {\n' +
                '            ' + param.name + '_arr[' + param.name + '_size++] = atoi(token);\n' +
                '            token = strtok(NULL, " ");\n' +
                '        }\n' +
                '    }\n' +
                '    struct ListNode* ' + param.name + ' = arrayToLinkedList(' + param.name + '_arr, ' + param.name + '_size);\n';
        } else if (param.type === 'doublylinkedlist') {
            inputParsing += '    int ' + param.name + '_arr[1000], ' + param.name + '_size = 0;\n' +
                '    if (fgets(line, sizeof(line), stdin)) {\n' +
                '        char *token = strtok(line, " ");\n' +
                '        while (token != NULL) {\n' +
                '            ' + param.name + '_arr[' + param.name + '_size++] = atoi(token);\n' +
                '            token = strtok(NULL, " ");\n' +
                '        }\n' +
                '    }\n' +
                '    struct DoublyListNode* ' + param.name + ' = arrayToDoublyLinkedList(' + param.name + '_arr, ' + param.name + '_size);\n';
        } else if (param.type === 'tree') {
            inputParsing += '    char* ' + param.name + '_arr[1000];\n' +
                '    int ' + param.name + '_size = 0;\n' +
                '    if (fgets(line, sizeof(line), stdin)) {\n' +
                '        char *token = strtok(line, " ");\n' +
                '        while (token != NULL) {\n' +
                '            ' + param.name + '_arr[' + param.name + '_size] = (char*)malloc(strlen(token) + 1);\n' +
                '            strcpy(' + param.name + '_arr[' + param.name + '_size], token);\n' +
                '            ' + param.name + '_size++;\n' +
                '            token = strtok(NULL, " ");\n' +
                '        }\n' +
                '    }\n' +
                '    struct TreeNode* ' + param.name + ' = arrayToTree(' + param.name + '_arr, ' + param.name + '_size);\n';
        } else if (param.type === 'grid' || param.type === 'matrix' || param.type === 'graph') {
            // 2D array support for grids/matrices/graphs
            // Expects: rows cols on first line, then rows lines of cols integers each
            inputParsing += '    int ' + param.name + '_rows, ' + param.name + '_cols;\n' +
                '    scanf("%d %d", &' + param.name + '_rows, &' + param.name + '_cols);\n' +
                '    getchar(); // consume newline\n' +
                '    int** ' + param.name + ' = (int**)malloc(' + param.name + '_rows * sizeof(int*));\n' +
                '    for (int i = 0; i < ' + param.name + '_rows; i++) {\n' +
                '        ' + param.name + '[i] = (int*)malloc(' + param.name + '_cols * sizeof(int));\n' +
                '        if (fgets(line, sizeof(line), stdin)) {\n' +
                '            char *token = strtok(line, " ");\n' +
                '            for (int j = 0; j < ' + param.name + '_cols && token != NULL; j++) {\n' +
                '                ' + param.name + '[i][j] = atoi(token);\n' +
                '                token = strtok(NULL, " ");\n' +
                '            }\n' +
                '        }\n' +
                '    }\n';
        }
    });

    // Generate output formatting for C
    if (outputType.type === 'linkedlist') {
        outputFormatting = `    printLinkedList(result);`;
    } else if (outputType.type === 'doublylinkedlist') {
        outputFormatting = `    printDoublyLinkedList(result);`;
    } else if (outputType.type === 'array<int>') {
        outputFormatting = `    for (int i = 0; i < result_size; i++) {\n        printf("%d", result[i]);\n        if (i < result_size - 1) printf(" ");\n    }\n    printf("\\n");`;
    } else {
        outputFormatting = `    printf("%d\\n", result);`;
    }

    // Determine return type for C
    let returnType = 'int';
    if (outputType.type === 'linkedlist') returnType = 'struct ListNode*';
    else if (outputType.type === 'doublylinkedlist') returnType = 'struct DoublyListNode*';
    else if (outputType.type === 'tree') returnType = 'struct TreeNode*';
    else if (outputType.type === 'array<int>') returnType = 'int*';
    else if (outputType.type === 'string') returnType = 'char*';
    else if (outputType.type === 'float') returnType = 'double';

    // Generate function parameters for C
    const params = inputSchema.map(p => {
        if (p.type === 'linkedlist') return `struct ListNode* ${p.name}`;
        else if (p.type === 'doublylinkedlist') return `struct DoublyListNode* ${p.name}`;
        else if (p.type === 'tree') return `struct TreeNode* ${p.name}`;
        else if (p.type === 'array<int>') return `int* ${p.name}, int ${p.name}_size`;
        else if (p.type === 'grid' || p.type === 'matrix' || p.type === 'graph') return `int** ${p.name}, int ${p.name}_rows, int ${p.name}_cols`;
        else if (p.type === 'string') return `char* ${p.name}`;
        else if (p.type === 'float') return `double ${p.name}`;
        else return `int ${p.name}`;
    }).join(', ');

    const functionSignature = `${returnType} ${functionName}(${params})`;

    // Generate starter code for C (WITHOUT struct definitions - they're in hidden main block)
    const defaultReturn = returnType === 'struct ListNode*' || returnType === 'struct TreeNode*' || returnType === 'struct DoublyListNode*' ? 'NULL' :
        returnType === 'int*' || returnType === 'char*' ? 'NULL' :
            returnType === 'int*' || returnType === 'char*' ? 'NULL' :
                returnType === 'double' ? '0.0' : '0';

    const starterCode = functionSignature + ' {\n' +
        '    // Write your code here\n' +
        '    return ' + defaultReturn + ';\n' +
        '}';

    // Generate C includes
    let includes = '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n';

    // Generate hidden main block for C (WITH struct definitions at the top)
    const callParams = inputSchema.map(p => {
        if (p.type === 'array<int>') return p.name + ', ' + p.name + '_size';
        else if (p.type === 'grid' || p.type === 'matrix' || p.type === 'graph') return p.name + ', ' + p.name + '_rows, ' + p.name + '_cols';
        return p.name;
    }).join(', ');

    const hiddenMainBlock = includes + dataStructureDefs + helperFunctions + functionSignature + ';\n\nint main() {\n' +
        inputParsing +
        '    ' + returnType + ' result = ' + functionName + '(' + callParams + ');\n' +
        outputFormatting +
        '    return 0;\n' +
        '}';

    return {
        starterCode,
        hiddenMainBlock,
        dataStructureDefinitions: dataStructureDefs,
        functionSignature
    };
}

/**
 * Generate full executable code by combining student code with main block
 * Used by auto-execute logic in resultController.js
 */
function generateFullCode({ userCode, mainBlock, language }) {
    if (!userCode) return '';

    // If no main block provided, return user code as-is
    if (!mainBlock || !mainBlock.trim()) {
        return userCode;
    }

    const lang = language.toLowerCase();

    // For C/C++, we need special handling to ensure struct definitions come before student code
    if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
        // Extract includes and struct definitions from main block
        const mainBlockLines = mainBlock.split('\n');
        let includes = '';
        let structDefs = '';
        let restOfMain = '';
        let inStructDef = false;
        let structBraceCount = 0;

        for (let i = 0; i < mainBlockLines.length; i++) {
            const line = mainBlockLines[i];

            // Collect includes
            if (line.trim().startsWith('#include')) {
                includes += line + '\n';
                continue;
            }

            // Detect start of struct definition
            if (line.includes('struct ') && line.includes('{')) {
                inStructDef = true;
                structDefs += line + '\n';
                structBraceCount = 1;
                continue;
            }

            // Inside struct definition
            if (inStructDef) {
                structDefs += line + '\n';
                structBraceCount += (line.match(/{/g) || []).length;
                structBraceCount -= (line.match(/}/g) || []).length;

                if (structBraceCount === 0) {
                    inStructDef = false;
                }
                continue;
            }

            // Everything else (helper functions, main function)
            restOfMain += line + '\n';
        }

        // Combine: includes + struct definitions + student code + rest of main
        return includes + structDefs + userCode + '\n\n' + restOfMain;
    }

    // For other languages (Python, JavaScript, Java), simply append user code before main block
    return userCode + '\n\n' + mainBlock;
}

module.exports = {
    generateTemplate,
    generateFullCode
};
