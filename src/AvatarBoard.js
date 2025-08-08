import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import "reactflow/dist/style.css";

const avatarImages = {
  frodo: "/avatars/char1.png",
  gandalf: "/avatars/char1.png",
  aragorn: "/avatars/char1.png",
  you: "/avatars/char1.png",
};

const gridSize = 50;

const generateRandomRGBA = (alpha = 0.5) => {
  const red = Math.floor(Math.random() * 256);
  const green = Math.floor(Math.random() * 256);
  const blue = Math.floor(Math.random() * 256);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const createCharacterNode = (id, label, position, avatarKey) => ({
  id,
  position,
  data: {
    label,
    avatar: avatarImages[avatarKey],
    backgroundColor: generateRandomRGBA(0.5),
  },
  type: "avatarNode",
});

const initialNodes = [
  createCharacterNode("you", "You", { x: 0, y: 0 }, "you"),
  createCharacterNode("frodo", "Frodo", { x: 200, y: 0 }, "frodo"),
  createCharacterNode("gandalf", "Gandalf", { x: 200, y: 150 }, "gandalf"),
  createCharacterNode("aragorn", "Aragorn", { x: 0, y: 150 }, "aragorn"),
];

const AvatarNode = ({ data }) => {
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={data.avatar}
        alt={data.label}
        width={60}
        height={60}
        style={{
          borderRadius: "50%",
          border: "1px solid black",
          background: data.backgroundColor,
        }}
      />
      <div>{data.label}</div>
    </div>
  );
};

const nodeTypes = {
  avatarNode: AvatarNode,
};

export default function AvatarBoard() {
  const [nodes, setNodes] = useState(initialNodes);

  // Handle arrow key movement
  const movePlayer = useCallback((dx, dy) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === "you"
          ? {
              ...node,
              position: {
                x: node.position.x + dx * gridSize,
                y: node.position.y + dy * gridSize,
              },
            }
          : node
      )
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") movePlayer(0, -1);
      if (e.key === "ArrowDown") movePlayer(0, 1);
      if (e.key === "ArrowLeft") movePlayer(-1, 0);
      if (e.key === "ArrowRight") movePlayer(1, 0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer]);

  const onNodeClick = (_, node) => {
    if (node.id !== "you") {
      alert(`Chat with ${node.data.label}`);
    }
  };

  return (
    <div style={{ height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        panOnScroll
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
