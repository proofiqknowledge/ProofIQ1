import React from "react";
import Tree from "react-d3-tree";

// ----------------------
//   JSON → Tree Format
// ----------------------
function convert(node) {
  if (!node) return null;

  if (typeof node === "string")
    return { name: node };

  return {
    name: node.root || node.name,
    children: Array.isArray(node.children)
      ? node.children.map((child) => convert(child))
      : []
  };
}

// ----------------------------------
// COLOR PALETTE FOR EACH MAIN BRANCH
// ----------------------------------
const COLORS = [
  "#7b5cf0",
  "#2db4d6",
  "#3cc47c",
  "#ffb74d",
  "#ef5350",
  "#ab47bc",
  "#26a69a",
];

// ----------------------
// MAIN VIEWER COMPONENT
// ----------------------
export default function MindMapViewer({ map, mode = "beautiful" }) {
  const data = convert(map);

  // Assign a color to each 1st-level branch and track depth
  const colorMap = {};
  const depthMap = {};

  const assignColors = (node, depth = 0, branchColor = COLORS[0]) => {
    if (!node) return;
    depthMap[node.name] = depth;
    
    if (depth === 0) {
      colorMap[node.name] = COLORS[0];
    } else if (depth === 1) {
      colorMap[node.name] = branchColor;
    } else {
      colorMap[node.name] = branchColor;
    }

    if (node.children) {
      node.children.forEach((child, i) => {
        const childColor = depth === 0 ? COLORS[i % COLORS.length] : branchColor;
        assignColors(child, depth + 1, childColor);
      });
    }
  };

  assignColors(data);

  return (
    <div style={{ width: "100%", height: "85vh" }}>
      <Tree
        data={data}
        orientation="horizontal"
        translate={{ x: 200, y: 350 }}
        collapsible={false}
        zoomable={true}
        nodeSize={{ x: 320, y: 100 }}
        separation={{ siblings: 1.2, nonSiblings: 1.5 }}
        
        // Smooth curved paths connecting to node edges
        pathFunc={(link) => {
          const sx = link.source.x;
          const sy = link.source.y;
          const tx = link.target.x;
          const ty = link.target.y;

          const dx = (tx - sx) * 0.35;
          const dy = (ty - sy) * 0.25;

          return `
            M${sx},${sy}
            C${sx + dx},${sy + dy}
             ${tx - dx},${ty - dy}
             ${tx},${ty}
          `;
        }}

        renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
          // Get the branch color for this node
          let branchColor = colorMap[nodeDatum.name];
          if (!branchColor && nodeDatum.__rd3t?.parent?.name) {
            branchColor = colorMap[nodeDatum.__rd3t.parent.name];
          }
          branchColor = branchColor || COLORS[0];

          // Position node RIGHT at the end of the branch line (not centered)
          return (
            <foreignObject width="160" height="60" x="10" y="-30">
              <div
                style={{
                  padding: "8px 14px",
                  background: "white",
                  borderRadius: "8px",
                  border: `2px solid ${branchColor}`,
                  boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#2d3436",
                  textAlign: "center",
                  wordWrap: "break-word",
                  whiteSpace: "normal",
                  overflow: "hidden"
                }}
              >
                {nodeDatum.name}
              </div>
            </foreignObject>
          );
        }}
      />
    </div>
  );
}
