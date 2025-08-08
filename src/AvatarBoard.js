import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
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

const createCharacterNode = (
  id,
  label,
  position,
  avatarSrc,
  extraData = {}
) => ({
  id,
  position,
  data: {
    label,
    avatar: avatarSrc,
    backgroundColor: generateRandomRGBA(0.5),
    ...extraData,
  },
  type: "avatarNode",
});

const initialNodes = [
  createCharacterNode("you", "You", { x: 0, y: 0 }, avatarImages.you, {
    trait: "",
  }),
];

const AvatarNode = ({ data }) => {
  return (
    <div className="text-center">
      <img
        src={data.avatar}
        alt={data.label}
        width={60}
        height={60}
        className="rounded-full border border-black"
        style={{ background: data.backgroundColor }}
      />
      <div>{data.label}</div>
    </div>
  );
};

const nodeTypes = {
  avatarNode: AvatarNode,
};

function BoardInner() {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes] = useState(initialNodes);
  const [characters, setCharacters] = useState([
    {
      id: "you",
      name: "You",
      trait: "",
      avatar: avatarImages.you,
      position: { x: 0, y: 0 },
    },
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState({ x: 0, y: 0 });
  const [formValues, setFormValues] = useState({
    name: "",
    trait: "",
    avatarFile: null,
    avatarUrl: "",
  });

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

  const snapToGrid = (pos) => ({
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize,
  });

  const onPaneClick = (event) => {
    // Only add when clicking on the canvas background
    const flowPos = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const snapped = snapToGrid(flowPos);
    setPendingPosition(snapped);
    setFormValues({ name: "", trait: "", avatarFile: null, avatarUrl: "" });
    setIsFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "avatar" && files && files[0]) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setFormValues((prev) => ({ ...prev, avatarFile: file, avatarUrl: url }));
      return;
    }
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const generateId = (base) => {
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${slug || "char"}-${Date.now()}`;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const name = (formValues.name || "Unnamed").trim();
    const trait = (formValues.trait || "").trim();
    const avatarSrc = formValues.avatarUrl || avatarImages.you;
    const id = generateId(name);

    const newCharacter = {
      id,
      name,
      trait,
      avatar: avatarSrc,
      position: pendingPosition,
    };
    setCharacters((prev) => [...prev, newCharacter]);

    const newNode = createCharacterNode(id, name, pendingPosition, avatarSrc, {
      trait,
    });
    setNodes((prev) => [...prev, newNode]);

    setIsFormOpen(false);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
  };

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onPaneClick={onPaneClick}
        panOnScroll
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>

      {/* Lightweight overlay to reflect saved characters (satisfies linter and UX) */}
      <div className="absolute top-2 left-2 bg-white/90 border border-gray-300 rounded-md px-2 py-1 text-xs">
        Characters: {characters.length}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-[360px] shadow-2xl text-left">
            <h3 className="mb-4 text-lg font-semibold">Add Character</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-left">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Frodo"
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-left">
                  Personality / Trait
                </label>
                <input
                  type="text"
                  name="trait"
                  value={formValues.trait}
                  onChange={handleFormChange}
                  placeholder="e.g., Brave, wise"
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block font-semibold mb-1 text-left">
                  Avatar
                </label>
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={handleFormChange}
                  className="block"
                />
                {formValues.avatarUrl && (
                  <div className="mt-2">
                    <img
                      src={formValues.avatarUrl}
                      alt="preview"
                      width={60}
                      height={60}
                      className="rounded-full"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleFormCancel}
                  className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AvatarBoard() {
  return (
    <ReactFlowProvider>
      <BoardInner />
    </ReactFlowProvider>
  );
}
