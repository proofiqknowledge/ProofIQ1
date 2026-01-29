// services/instrumentation/cppInstrumenter.js

/**
 * Advanced C++ Instrumenter with Heap Visualization
 * - Recursive Deep Search
 * - Pointer/Array Visualization
 * - Robust Type Handling
 */

function instrumentCpp(code) {
    const lines = code.split('\n');
    let outputLines = [];

    // 1. Static Header (Generic Library)
    const header = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <map>
#include <set>
#include <type_traits>

// --- PT_TRACE_LIB_START ---

// Forward declarations
template <typename T> void __pt_try_dump(T val); 

// Catch-all SFINAE for unknown types
template<typename T>
class __pt_is_streamable {
    template<typename U>
    static auto test(int) -> decltype(std::declval<std::ostream&>() << std::declval<U>(), std::true_type());
    template<typename>
    static std::false_type test(...);
public:
    static const bool value = decltype(test<T>(0))::value;
};

// 1. Arithmetic Types (int, float, etc.)
template <typename T>
typename std::enable_if<std::is_arithmetic<T>::value, std::string>::type
__pt_to_json(const T& val) {
    std::stringstream ss;
    ss << val;
    return ss.str();
}

// 2. String Overloads
std::string __pt_to_json(const std::string& val) {
    return "\\"" + val + "\\"";
}
std::string __pt_to_json(const char* val) {
    if (!val) return "null";
    return "\\"" + std::string(val) + "\\"";
}
std::string __pt_to_json(char* val) {
    if (!val) return "null";
    return "\\"" + std::string(val) + "\\"";
}

// 3. Generic Pointers - THE FIX
// Allow T* for ANY type T, AS LONG AS T is not char (char* is string)
// We DO NOT use !is_arithmetic here, so int* works (prints address)
template <typename T>
typename std::enable_if<!std::is_same<typename std::remove_cv<T>::type, char>::value, std::string>::type
__pt_to_json(T* val) {
    if (val == nullptr) return "null";
    std::stringstream ss;
    ss << "\\"obj0x" << std::hex << (unsigned long long)val << "\\"";
    return ss.str();
}

// 4. Fallback for References/Objects (Non-pointer, Non-arithmetic, Non-string)
template <typename T>
typename std::enable_if<!std::is_arithmetic<T>::value && !std::is_pointer<T>::value && !std::is_same<T, std::string>::value, std::string>::type
__pt_to_json(const T& val) {
    // Attempt to print valid address if possible, else generic
    std::stringstream ss;
    ss << "\\"obj0x\\"" << std::hex << (unsigned long long)&val << "\\"\\"";
    return ss.str();
}

// 5. Array Overload (for static arrays)
template <typename T, size_t N>
std::string __pt_array_to_json(const T (&arr)[N]) {
    std::stringstream ss;
    ss << "[";
    for(size_t i=0; i<N; i++) {
        ss << __pt_to_json(arr[i]);
        if(i < N-1) ss << ",";
    }
    ss << "]";
    return ss.str();
}

// Trace helper for arrays
template <typename T, size_t N>
void __pt_dump_array(const char* name, const T (&arr)[N]) {
    std::cout << "PT_HEAP:obj_arr_" << name << ":{\\"type\\":\\"array\\",\\"value\\":" << __pt_array_to_json(arr) << "}" << std::endl;
    std::cout << "PT_VAR:" << name << ":\\"obj_arr_" << name << "\\"" << std::endl;
}

// Generic Dumper (Empty default)
template<typename T> void __pt_try_dump(T val) {}

// Trace logic
void __pt_trace_impl(int line) {
    std::cout << "PT_TRACE:" << line << std::endl;
}

template<typename T, typename... Args>
void __pt_trace_impl(int line, const char* name, const T& val, Args... args) {
    std::cout << "PT_VAR:" << name << ":" << __pt_to_json(val) << std::endl;
    __pt_trace_impl(line, args...);
}

template<typename... Args>
void __pt_trace(int line, Args... args) {
    __pt_trace_impl(line, args...);
}

// Recurse Field - Primary Templates
template <typename T>
void __pt_recurse_field(const T& val, std::set<const void*>& visited) {}

template <typename T>
void __pt_recurse_field(T* ptr, std::set<const void*>& visited) {}

// --- PT_TRACE_LIB_END ---
`;
    outputLines.push(header);

    // 2. Parsing loop
    let currentStructName = null;
    let currentStructFields = [];

    let braceLevel = 0;
    let scopeStack = [{ variables: new Set(), arrayMetadata: {} }];
    let inNonTraceable = false;
    let nonTraceableStartLevel = -1;

    const structStartRegex = /^\s*(?:typedef\s+)?(?:struct|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*[^{]+)?\{/;
    const fieldRegex = /^\s*(?:const\s+)?(?:unsigned\s+)?(?:long\s+)?(?:int|float|double|char|bool|string|vector<[^>]+>|map<[^>]+>|[A-Z][a-zA-Z0-9_]*)(?:\s*[\*\&]+)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|;)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // --- Parsing Logic ---
        if (!currentStructName) {
            const match = line.match(structStartRegex);
            if (match) {
                currentStructName = match[1];
                currentStructFields = [];
                if (!inNonTraceable) {
                    inNonTraceable = true;
                    nonTraceableStartLevel = braceLevel;
                }
            }
        } else {
            if (!trimmed.includes('(') && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('public:') && !trimmed.startsWith('private:') && !trimmed.startsWith('protected:')) {
                const match = line.match(fieldRegex);
                if (match) {
                    currentStructFields.push(match[1]);
                }
            }
        }

        // --- Brace Tracking ---
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;

        for (let k = 0; k < closeBraces; k++) {
            braceLevel--;
            if (braceLevel < 0) braceLevel = 0;

            if (!inNonTraceable && scopeStack.length > 1) scopeStack.pop();

            if (currentStructName && inNonTraceable && braceLevel === nonTraceableStartLevel) {
                inNonTraceable = false;
                nonTraceableStartLevel = -1;
            }
        }

        for (let k = 0; k < openBraces; k++) {
            if (!inNonTraceable) scopeStack.push({ variables: new Set(), arrayMetadata: {} });
            braceLevel++;
        }

        // --- Variable Detection ---
        const shouldProcess = !inNonTraceable && !trimmed.startsWith('//') && !trimmed.startsWith('#');

        if (shouldProcess) {
            if (!trimmed.startsWith('return') && !trimmed.startsWith('using') && !trimmed.startsWith('template')) {
                if (trimmed.includes('(') && trimmed.endsWith('{')) {
                    const argsMatch = line.match(/\((.*)\)/);
                    if (argsMatch && argsMatch[1]) {
                        const argsStr = argsMatch[1];
                        const args = argsStr.split(',');
                        args.forEach(arg => {
                            const parts = arg.trim().split(/\s+/);
                            if (parts.length > 0) {
                                let varName = parts[parts.length - 1].replace(/[\*\&]/g, '');
                                if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
                                    if (scopeStack.length > 0) scopeStack[scopeStack.length - 1].variables.add(varName);
                                }
                            }
                        });
                    }
                }
                else {
                    // Robust detection for "Type a, b = 1, *c;"
                    // 1. Check if it starts with a likely Type (identifier)
                    // We exclude keywords like return, using, template, typedef (already checked above)
                    // A declaration looks like:  Type var1, var2...;

                    const declRegex = /^([a-zA-Z0-9_<>]+(?:\s*[\*\&]+)?)\s+(.*)/;
                    const declMatch = trimmed.match(declRegex);

                    if (declMatch) {
                        const typePart = declMatch[1];
                        const rest = declMatch[2];

                        // Heuristic: If 'rest' has '=', it's likely a declaration.
                        // Or if it's just 'a;' -> 'a'

                        // We need to be careful not to match assignments "a = b;" as declaration
                        // "a = b" -> 'a' is type? No.
                        // Common types: int, float, bool, char, string, vector, Node, basic identifiers.

                        // Let's assume standard types or PascalCase (Structs) or specific list
                        const likelyType = /^(int|float|double|char|bool|long|short|void|unsigned|signed|std::|vector|map|set|string|[A-Z])/.test(typePart);

                        if (likelyType) {
                            // Split by comma, respecting templates < > could be hard, but simple comma split for vars is okay usually
                            // "a, b=2, c"
                            const parts = rest.split(',');
                            parts.forEach(p => {
                                // Remove initializer " = ..."
                                const namePart = p.split('=')[0].trim();

                                // Detect Array: int arr[5]
                                const arrayMatch = namePart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(\d+)\]/);

                                // Remove pointer chars for generic capture
                                const cleanName = namePart.replace(/[\*\&]+/g, '').trim();

                                if (arrayMatch) {
                                    const varName = arrayMatch[1];
                                    const size = arrayMatch[2];
                                    if (scopeStack.length > 0) {
                                        scopeStack[scopeStack.length - 1].variables.add(varName);
                                        scopeStack[scopeStack.length - 1].arrayMetadata[varName] = { size };
                                    }
                                } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanName)) {
                                    if (scopeStack.length > 0 && !cleanName.startsWith('return')) {
                                        scopeStack[scopeStack.length - 1].variables.add(cleanName);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }

        outputLines.push(line);

        // --- Inject Serializers (After struct closes) ---
        if (currentStructName && trimmed.startsWith('};')) {
            const fields = currentStructFields;
            const structName = currentStructName;

            const serializerCode = `
// Overloads for ${structName}
std::string __pt_to_json(${structName}* val) {
    if (val == nullptr) return "null";
    std::stringstream ss;
    ss << "\\"obj0x" << std::hex << (unsigned long long)val << "\\"";
    return ss.str();
}
std::string __pt_to_json(const ${structName}& val) {
    std::stringstream ss;
    ss << "\\"obj0x\\"" << std::hex << (unsigned long long)&val << "\\"\\"";
    return ss.str();
}

// Forward declare recursive dumper
void __pt_dump_${structName}_recursive(const ${structName}* ptr, std::set<const void*>& visited);

// 3. Specialization for known struct pointers (to recurse)
template <>
void __pt_recurse_field<${structName}>(${structName}* ptr, std::set<const void*>& visited) {
    __pt_dump_${structName}_recursive(ptr, visited);
}

void __pt_dump_${structName}_recursive(const ${structName}* ptr, std::set<const void*>& visited) {
    if (!ptr || visited.count(ptr)) return;
    visited.insert(ptr);
    
    std::cout << "PT_HEAP:obj0x" << std::hex << (unsigned long long)ptr << ":{";
    std::cout << "\\"type\\":\\"${structName}\\",\\"value\\":{";
    ${fields.map((f, idx) => `
    std::cout << "\\"${f}\\":" << __pt_to_json(ptr->${f}) ${idx < fields.length - 1 ? '<< ","' : ''};`).join('\n')}
    std::cout << "}}" << std::endl;
    
    // Recurse
    ${fields.map(f => `__pt_recurse_field(ptr->${f}, visited);`).join('\n    ')}
}

void __pt_dump_${structName}(const ${structName}* ptr) {
    std::set<const void*> visited;
    __pt_dump_${structName}_recursive(ptr, visited);
}

void __pt_try_dump(${structName}* ptr) { __pt_dump_${structName}(ptr); }
void __pt_try_dump(const ${structName}& val) { __pt_dump_${structName}(&val); }
`;
            outputLines.push(serializerCode);

            currentStructName = null;
            currentStructFields = [];
        }


        // --- Inject Trace ---
        if (shouldProcess && braceLevel > 0 &&
            (trimmed.endsWith(';') || trimmed.endsWith('{') || trimmed.endsWith('}')) &&
            !trimmed.startsWith('return') &&
            !trimmed.startsWith('class')
        ) {

            let vars = [];
            let arrays = [];
            scopeStack.forEach(s => {
                s.variables.forEach(v => {
                    if (s.arrayMetadata[v]) {
                        arrays.push(v);
                    } else {
                        vars.push(v);
                    }
                });
            });

            // Inject array dumps FIRST (before trace)
            arrays.forEach(arr => {
                outputLines.push(`__pt_dump_array("${arr}", ${arr});`);
            });

            let traceCall = `__pt_trace(${i + 1}`;
            vars.slice(0, 20).forEach(v => {
                traceCall += `, "${v}", ${v}`;
            });
            traceCall += `);`;

            if (!trimmed.startsWith('for') && !trimmed.startsWith('while') &&
                !trimmed.startsWith('switch') && !trimmed.startsWith('case') && !trimmed.startsWith('default') && !trimmed.startsWith('typedef')) {
                outputLines.push(traceCall);
            }
        }
    }

    return outputLines.join('\n');
}

module.exports = { instrumentCpp };
