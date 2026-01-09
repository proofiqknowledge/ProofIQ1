// services/instrumentation/javaInstrumenter.js

function instrumentJava(code) {
    const lines = code.split('\n');
    let outputLines = [];

    // Helper Class Injection
    // We inject this at the end of the file (outside the public class)
    // It handles: Trace logging, JSON serialization (manual reflection), Heap dumping
    const helperClass = `
class __PT_Helper {
    static class HeapObj { String type; Object value; }
    static java.util.Map<String, Object> heap = new java.util.HashMap<>();
    
    public static void trace(int line, Object... vars) {
        System.out.println("PT_TRACE:" + line);
        
        // Dump variables
        for (int i = 0; i < vars.length; i += 2) {
            String name = (String) vars[i];
            Object val = vars[i+1];
            System.out.println("PT_VAR:" + name + ":" + serialize(val, false));
        }
    }

    // Simple JSON serializer using Reflection
    public static String serialize(Object obj, boolean isHeapDump) {
        if (obj == null) return "null";
        
        if (obj instanceof Integer || obj instanceof Long || obj instanceof Boolean || obj instanceof Double || obj instanceof Float) {
            return String.valueOf(obj);
        }
        
        if (obj instanceof String) {
            return "\\"" + ((String)obj).replace("\\"", "\\\\\\"") + "\\"";
        }
        
        // Pointers/Objects
        String id = "obj" + Integer.toHexString(System.identityHashCode(obj));
        
        // If not already dumped, dump it (Recursive BFS/DFS could go here, but we do lazy dump)
        if (!heap.containsKey(id)) {
            heap.put(id, obj);
            dumpObject(id, obj);
        }
        
        return "\\"" + id + "\\"";
    }
    
    public static void dumpObject(String id, Object obj) {
        try {
            Class<?> clazz = obj.getClass();
            String className = clazz.getName();
            
            // Skip internals for System classes to avoid mess/errors (Scanner, Thread, etc)
            if (className.startsWith("java.") || className.startsWith("sun.")) {
                // Just Show toString value
                 System.out.println("PT_HEAP:" + id + ":{\\"type\\":\\"" + clazz.getSimpleName() + "\\",\\"value\\":{\\"toString\\":\\"" + obj.toString().replace("\\"", "'") + "\\"}}");
                 return;
            }

            if (clazz.isArray()) {
                // Array handling
                StringBuilder json = new StringBuilder("[");
                int len = java.lang.reflect.Array.getLength(obj);
                for(int i=0; i<len; i++) {
                    json.append(serialize(java.lang.reflect.Array.get(obj, i), true));
                    if(i < len-1) json.append(",");
                }
                json.append("]");
                // Print Heap Log
                System.out.println("PT_HEAP:" + id + ":{\\"type\\":\\"Array\\",\\"value\\":" + json.toString() + "}");
            } else {
                // Standard Object
                StringBuilder json = new StringBuilder("{");
                java.lang.reflect.Field[] fields = clazz.getDeclaredFields();
                boolean first = true;
                for (java.lang.reflect.Field f : fields) {
                    if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) continue;
                    f.setAccessible(true);
                    if (!first) json.append(",");
                    json.append("\\"").append(f.getName()).append("\\":").append(serialize(f.get(obj), true));
                    first = false;
                }
                json.append("}");
                System.out.println("PT_HEAP:" + id + ":{\\"type\\":\\"" + clazz.getSimpleName() + "\\",\\"value\\":" + json.toString() + "}");
            }
        } catch (Exception e) {
            // Fallback
             System.out.println("PT_HEAP:" + id + ":{\\"type\\":\\"Object\\",\\"value\\":{}}");
        }
    }
}
`;

    let braceLevel = 0;

    // Regex for variable usage recognition
    // Declarations: int x = 5; Node n = new Node(); java.util.Scanner s = ...
    // Allow dots in type name
    // Captures: 1=varName
    const declRegex = /^\s*(?:[a-zA-Z0-9_<>\[\]\.]+)\s+([a-zA-Z0-9_]+)\s*=/;
    // Assignments: x = 6;
    const assignRegex = /^\s*([a-zA-Z0-9_]+)\s*=[^=]/;

    let inMethodAtLevel = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Scope analysis
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;

        const prevLevel = braceLevel;
        braceLevel += (openBraces - closeBraces);

        // Heuristic for method entry: 
        // 1. Line has '(' and ends with '{' or next line is '{'
        // 2. Not a class/interface
        if (openBraces > 0 && trimmed.includes('(') && !trimmed.includes('class ') && !trimmed.includes('interface ')) {
            if (inMethodAtLevel === -1) {
                inMethodAtLevel = prevLevel;
            }
        }

        outputLines.push(line);

        // If we just closed a level that was the method level, reset inMethodAtLevel
        if (closeBraces > 0 && braceLevel <= inMethodAtLevel) {
            inMethodAtLevel = -1;
        }

        // Skip imports/package/etc
        if (trimmed.startsWith('package') || trimmed.startsWith('import') || trimmed.startsWith('@') || trimmed.startsWith('//')) continue;

        // Trace Injection Logic - Only inside methods
        const isStatement = trimmed.endsWith(';') && !trimmed.startsWith('class') && !trimmed.startsWith('static') && !trimmed.startsWith('public class');
        const isBlockStart = trimmed.endsWith('{') && !trimmed.includes('class ') && !trimmed.includes('interface ');

        if (inMethodAtLevel !== -1 && braceLevel > inMethodAtLevel && (isStatement || isBlockStart)) {
            // Avoid tracing return statements or loops/classes directly
            if (trimmed.startsWith('return') || trimmed.startsWith('break') || trimmed.startsWith('continue')) continue;
            if (trimmed.startsWith('for') || trimmed.startsWith('while') || trimmed.startsWith('class') || trimmed.startsWith('static') || trimmed.startsWith('public class')) continue;

            let traceCall = `__PT_Helper.trace(${i + 1}`;

            // Try to find variable in this line to specifically log
            let varName = null;
            const declMatch = trimmed.match(declRegex);
            const assignMatch = trimmed.match(assignRegex);

            if (declMatch) varName = declMatch[1];
            else if (assignMatch) varName = assignMatch[1];

            if (varName) {
                traceCall += `, "${varName}", ${varName}`;
            }

            traceCall += `);`;

            outputLines.push(traceCall);
        }
    }

    outputLines.push(helperClass);

    return outputLines.join('\n');
}

module.exports = { instrumentJava };
