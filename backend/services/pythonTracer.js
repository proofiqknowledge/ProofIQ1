// services/pythonTracer.js
const { createTempFile, cleanupTempFile, executeWithTimeout } = require('../utils/sandboxUtils');
const path = require('path');

/**
 * Python tracer script that instruments code execution
 * This script uses sys.settrace to capture execution state at each line
 */
const PYTHON_TRACER_TEMPLATE = `import sys
import json
import io
import types

# Global state
trace_steps = []
executed_lines = set()
output_buffer = []

# 🔥 Stable heap tracking
object_id_counter = 0
object_map = {}

def get_object_id(obj):
    global object_id_counter, object_map
    oid = id(obj)
    if oid not in object_map:
        object_map[oid] = f"obj{object_id_counter}"
        object_id_counter += 1
    return object_map[oid]

def is_user_object(obj):
    if isinstance(obj, (
        types.ModuleType,
        types.FunctionType,
        types.MethodType,
        types.BuiltinFunctionType,
        types.BuiltinMethodType
    )):
        return False
    if isinstance(obj, (io.IOBase, type(sys))):
        return False
    return True

def serialize_value(val, depth=0):
    if depth > 3:
        return "..."
    if val is None:
        return "None"
    if isinstance(val, (bool, int, float)):
        return val
    if isinstance(val, str):
        return val[:50] + "..." if len(val) > 50 else val
    if isinstance(val, (list, tuple, set, dict)) or hasattr(val, "__dict__"):
        return get_object_id(val)
    return str(val)

def extract_objects(frame_locals):
    heap = {}

    def process_obj(obj):
        oid = id(obj)
        hid = get_object_id(obj)

        if isinstance(obj, list):
            heap[hid] = {
                "type": "list",
                "value": [serialize_value(v, 1) for v in obj[:20]]
            }
        elif isinstance(obj, tuple):
            heap[hid] = {
                "type": "tuple",
                "value": [serialize_value(v, 1) for v in obj[:20]]
            }
        elif isinstance(obj, set):
            heap[hid] = {
                "type": "set",
                "value": [serialize_value(v, 1) for v in list(obj)[:20]]
            }
        elif isinstance(obj, dict):
            heap[hid] = {
                "type": "dict",
                "value": {str(k): serialize_value(v, 1) for k, v in list(obj.items())[:20]}
            }
        elif hasattr(obj, "__dict__") and is_user_object(obj):
            heap[hid] = {
                "type": type(obj).__name__,
                "value": {
                    k: serialize_value(v, 1)
                    for k, v in obj.__dict__.items()
                    if not k.startswith("__")
                }
            }

    for _, val in frame_locals.items():
        if not is_user_object(val):
            continue
        if isinstance(val, (list, tuple, set, dict)) or hasattr(val, "__dict__"):
            process_obj(val)

    return heap

def trace_lines(frame, event, arg):
    global trace_steps, executed_lines

    if "<string>" not in frame.f_code.co_filename:
        return trace_lines

    if len(trace_steps) >= 1000:
        sys.settrace(None)
        return None

    if event in ("line", "call", "return"):
        lineno = frame.f_lineno
        executed_lines.add(lineno)

        frames = []
        current = frame
        stack = []

        while current:
            if "<string>" in current.f_code.co_filename:
                stack.append(current)
            current = current.f_back

        stack.reverse()

        for f in stack:
            fname = f.f_code.co_name
            if fname == "<module>":
                fname = "Global frame"

            variables = {
                k: serialize_value(v)
                for k, v in f.f_locals.items()
                if not k.startswith("__") and is_user_object(v)
            }

            frames.append({
                "name": fname,
                "variables": variables
            })

        filtered_locals = {
            k: v for k, v in frame.f_locals.items()
            if not k.startswith("__")
        }

        objects = extract_objects(filtered_locals)

        trace_steps.append({
            "currentLine": lineno,
            "executedLines": sorted(list(executed_lines)),
            "frames": frames,
            "objects": [{"id": k, **v} for k, v in objects.items()], 
            "output": "".join(output_buffer)
        })

    return trace_lines

class OutputCapture:
    def write(self, text):
        output_buffer.append(text)
    def flush(self):
        pass

class WaitingForInputError(Exception):
    pass

class BatchInput:
    def __init__(self, input_str):
        self.input_io = io.StringIO(input_str)
    def readline(self, *args):
        line = self.input_io.readline()
        if not line:
            raise WaitingForInputError("Input exhausted")
        return line
    def read(self, *args):
        data = self.input_io.read()
        if not data:
            raise WaitingForInputError("Input exhausted")
        return data

sys.stdout = OutputCapture()
sys.stdin = BatchInput("""__USER_INPUT__""")

sys.settrace(trace_lines)

final_status = "complete"

try:
    exec("""__USER_CODE__""")
except WaitingForInputError:
    final_status = "waiting_for_input"
except Exception as e:
    if trace_steps:
        trace_steps[-1]["error"] = str(e)

sys.settrace(None)
print(json.dumps({"steps": trace_steps, "status": final_status}), file=sys.__stdout__)
`;

/**
 * Execute Python code with step-by-step tracing
 */
async function tracePython(code, input = '') {
    let tempFile = null;

    try {
        const escapedCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\\n/g, '\\n');
        const escapedInput = input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\\n/g, '\\n');

        let tracerCode = PYTHON_TRACER_TEMPLATE
            .replace('__USER_CODE__', escapedCode)
            .replace('__USER_INPUT__', escapedInput);

        tempFile = await createTempFile(tracerCode, '.py');
        const result = await executeWithTimeout('python', [tempFile], 8000);

        return JSON.parse(result.stdout);

    } finally {
        if (tempFile) cleanupTempFile(tempFile);
    }
}

module.exports = {
    tracePython
};
