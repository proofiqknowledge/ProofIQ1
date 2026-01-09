import api from "./api";

export const generateMindMap = async (topic) => {
  const res = await api.post("/mindmap/generate", { topic });
  return res.data;
};
