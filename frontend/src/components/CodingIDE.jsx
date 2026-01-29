import React, { useMemo, useState } from "react";
import { runCodeWithJudge0, judge0LanguageIdFor } from "../services/judge0";

const THEMES = ["light", "dark"];

const defaultStarter = "function solve(input){\n  return input;\n}";

function CodingIDE({
  initialCode,
  initialLanguage = "javascript",
  allowedLanguages = ["javascript", "python", "c", "cpp", "java"],
  onChange,
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialCode || defaultStarter);
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState(14);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const isLanguageSupported = useMemo(() => !!judge0LanguageIdFor(language), [language]);

  const run = async () => {
    if (!isLanguageSupported) {
      setResult({ status: "Error", stderr: `Language not supported: ${language}` });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const res = await runCodeWithJudge0({ sourceCode: code, language, stdin });
      setResult(res);
    } catch (e) {
      setResult({ status: "Error", stderr: String(e.message || e) });
    } finally {
      setRunning(false);
    }
  };

  const onCodeChange = (value) => {
    setCode(value);
    onChange && onChange({ code: value, language });
  };

  const onLanguageChange = (value) => {
    setLanguage(value);
    onChange && onChange({ code, language: value });
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center space-x-2">
          <label className="text-sm">Language</label>
          <select
            className="border p-1 rounded"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {(allowedLanguages?.length ? allowedLanguages : ["javascript", "python", "c", "cpp", "java"]).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <label className="text-sm ml-3">Theme</label>
          <select className="border p-1 rounded" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="text-sm ml-3">Font</label>
          <input
            type="number"
            className="border p-1 rounded w-16"
            value={fontSize}
            min={10}
            max={24}
            onChange={(e) => setFontSize(Number(e.target.value) || 14)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-purple-600 text-white rounded disabled:opacity-60"
            onClick={run}
            disabled={running}
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="p-3 border-r">
          <textarea
            className={`w-full h-80 border rounded p-2 font-mono ${theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-700" : ""}`}
            style={{ fontSize: `${fontSize}px` }}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
          />
          <div className="mt-3">
            <p className="font-semibold mb-1">Program Input (stdin)</p>
            <textarea
              className={`w-full h-24 border rounded p-2 font-mono ${theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-700" : ""}`}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
            />
          </div>
        </div>
        <div className="p-3">
          <p className="font-semibold mb-1">Console</p>
          {!result ? (
            <div className={`border rounded p-2 text-sm ${theme === "dark" ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-gray-50"}`}>
              Output will appear here after you run your code.
            </div>
          ) : (
            <div className={`border rounded p-2 text-sm whitespace-pre-wrap ${theme === "dark" ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-gray-50"}`}>
              <div><span className="font-semibold">Status:</span> {result.status}</div>
              {result.stdout && (
                <div className="mt-2">
                  <div className="font-semibold">Output</div>
                  <pre className="text-xs whitespace-pre-wrap">{result.stdout}</pre>
                </div>
              )}
              {result.compile_output && (
                <div className="mt-2">
                  <div className="font-semibold">Compiler</div>
                  <pre className="text-xs whitespace-pre-wrap text-red-700">{result.compile_output}</pre>
                </div>
              )}
              {result.stderr && (
                <div className="mt-2">
                  <div className="font-semibold">Errors</div>
                  <pre className="text-xs whitespace-pre-wrap text-red-700">{result.stderr}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodingIDE;


