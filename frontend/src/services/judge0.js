// FRONTEND SERVICE FOR BACKEND JUDGE API
// This file no longer talks to Judge0 directly.
// It only calls your backend: /api/judge/run

import api from "./api"; // your axios instance

// Run code without testcases
export async function runSimpleCode({ questionId, source, language }) {
  const res = await api.post("/judge/run", {
    questionId,
    source,
    language,
    runType: "run",
  });
  return res.data;
}

// Run ONLY sample (non-hidden) testcases
export async function runSampleTests({ questionId, source, language }) {
  const res = await api.post("/judge/run", {
    questionId,
    source,
    language,
    runType: "sample",
  });
  return res.data;
}

// Run ALL testcases + store submission (final)
export async function submitFinalCode({ questionId, source, language }) {
  const res = await api.post("/judge/run", {
    questionId,
    source,
    language,
    runType: "all",
  });
  return res.data;
}
