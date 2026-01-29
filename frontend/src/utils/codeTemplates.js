export const getTemplate = (language, functionName = "solution") => {
    switch (language) {
        case "python":
            return {
                functionSignature: `def ${functionName}(a, b):`,
                boilerplate: `def ${functionName}(a, b):
    # Write your code here
    return a + b`,
                mainBlock: `if __name__ == '__main__':
    import sys
    input = sys.stdin.read
    data = input().split()
    if len(data) >= 2:
        a = int(data[0])
        b = int(data[1])
        print(${functionName}(a, b))`
            };

        case "javascript":
            return {
                functionSignature: `function ${functionName}(a, b) {`,
                boilerplate: `function ${functionName}(a, b) {
    // Write your code here
    return a + b;
}`,
                mainBlock: `// Hidden Main Block
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length >= 2) {
    const a = parseInt(input[0]);
    const b = parseInt(input[1]);
    console.log(${functionName}(a, b));
}`
            };

        case "cpp":
            return {
                functionSignature: `int ${functionName}(int a, int b)`,
                boilerplate: `#include <iostream>
using namespace std;

int ${functionName}(int a, int b) {
    // Write your code here
    return a + b;
}`,
                mainBlock: `int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << ${functionName}(a, b) << endl;
    }
    return 0;
}`
            };

        case "java":
            return {
                functionSignature: `public static int ${functionName}(int a, int b)`,
                boilerplate: `import java.util.Scanner;

public class Solution {
    public static int ${functionName}(int a, int b) {
        // Write your code here
        return a + b;
    }
}`,
                mainBlock: `    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int a = scanner.nextInt();
            int b = scanner.nextInt();
            System.out.println(${functionName}(a, b));
        }
    }
}`
            };

        case "c":
            return {
                functionSignature: `int ${functionName}(int a, int b)`,
                boilerplate: `#include <stdio.h>

int ${functionName}(int a, int b) {
    // Write your code here
    return a + b;
}`,
                mainBlock: `int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", ${functionName}(a, b));
    }
    return 0;
}`
            };

        default:
            return {
                functionSignature: "",
                boilerplate: "",
                mainBlock: ""
            };
    }
};
