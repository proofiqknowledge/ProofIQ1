import React, { useState } from "react";
import { generateMindMap } from "../../services/mindMapService";
import MindMapViewer from "../../components/MindMapViewer";

export default function MindMapGenerator() {
  const [topic, setTopic] = useState("");
  const [map, setMap] = useState(null);

  const handleGenerate = async () => {
    const res = await generateMindMap(topic);
    setMap(res.map);
  };

  return (
    <div>
      <h1>Mind Map Generator</h1>
      <input
        type="text"
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="Enter topic or course name"
      />
      <button onClick={handleGenerate}>Generate Mind Map</button>
      {map && <MindMapViewer map={map} />}
    </div>
  );
}
