import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import AvatarNode from "./components/AvatarNode";
import AddCharacterModal from "./components/AddCharacterModal";
import { useChat } from "./hooks/useChat";
import {
  useLocalStorage,
  useClearStorage,
  useNodesWithStorage,
} from "./hooks/useLocalStorage";

const gridSize = 50;
const defaultAvatar = "/avatars/char1.png";

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
  createCharacterNode("you", "You", { x: 0, y: 0 }, defaultAvatar, {
    trait: "",
  }),
];

const nodeTypes = {
  avatarNode: AvatarNode,
};

function BoardInner() {
  const reactFlow = useReactFlow();

  const [nodes, setNodes] = useNodesWithStorage("fragment_nodes", initialNodes);

  const [characters, setCharacters] = useLocalStorage("fragment_characters", [
    {
      id: "you",
      name: "You",
      trait: "",
      avatar: defaultAvatar,
      position: { x: 0, y: 0 },
    },
  ]);
  const clearStorage = useClearStorage();

  // Ensure "you" character always exists
  useEffect(() => {
    const hasYou = characters.some((char) => char.id === "you");
    if (!hasYou) {
      setCharacters((prev) => [
        {
          id: "you",
          name: "You",
          trait: "",
          avatar: defaultAvatar,
          position: { x: 0, y: 0 },
        },
        ...prev,
      ]);
    }
  }, [characters, setCharacters]);

  // Ensure "you" node always exists
  useEffect(() => {
    const hasYouNode = nodes.some((node) => node.id === "you");
    if (!hasYouNode) {
      setNodes((prev) => [
        createCharacterNode("you", "You", { x: 0, y: 0 }, defaultAvatar, {
          trait: "",
        }),
        ...prev,
      ]);
    }
  }, [nodes, setNodes]);

  // Sync characters with nodes to ensure consistency
  useEffect(() => {
    const nodeIds = nodes.map((node) => node.id);
    const characterIds = characters.map((char) => char.id);

    // Add missing characters from nodes
    const missingCharacters = nodes
      .filter((node) => node.id !== "you" && !characterIds.includes(node.id))
      .map((node) => ({
        id: node.id,
        name: node.data.label,
        trait: node.data.trait || "",
        avatar: node.data.avatar,
        position: node.position,
      }));

    if (missingCharacters.length > 0) {
      setCharacters((prev) => [...prev, ...missingCharacters]);
    }

    // Remove characters that don't have corresponding nodes
    const orphanedCharacters = characters.filter(
      (char) => char.id !== "you" && !nodeIds.includes(char.id)
    );

    if (orphanedCharacters.length > 0) {
      setCharacters((prev) =>
        prev.filter((char) => char.id === "you" || nodeIds.includes(char.id))
      );
    }
  }, [nodes, characters, setCharacters]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [pendingPosition, setPendingPosition] = useState({ x: 0, y: 0 });
  const [formValues, setFormValues] = useState({
    name: "",
    trait: "",
    avatarFile: null,
    avatarUrl: "",
  });

  // Chat handled via useChat

  // Handle arrow key movement
  const movePlayer = useCallback(
    (dx, dy) => {
      setNodes((prev) => {
        const updated = prev.map((node) =>
          node.id === "you"
            ? {
                ...node,
                position: {
                  x: node.position.x + dx * gridSize,
                  y: node.position.y + dy * gridSize,
                },
              }
            : node
        );
        return updated;
      });
    },
    [gridSize]
  );

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

  const snapToGrid = (pos) => ({
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize,
  });

  const onPaneClick = (event) => {
    const flowPos = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const snapped = snapToGrid(flowPos);
    setPendingPosition(snapped);
    setFormValues({ name: "", trait: "", avatarFile: null, avatarUrl: "" });
    setIsFormOpen(true);
  };

  const onNodesChange = useCallback(
    (changes) => {
      const hasSelectChange = changes.some((ch) => ch.type === "select");
      let lastSelectedId = null;
      for (const ch of changes) {
        if (ch.type === "select" && ch.selected) lastSelectedId = ch.id;
      }

      const filteredChanges = draggingNodeId
        ? changes.filter(
            (ch) => !(ch.type === "position" && ch.id !== draggingNodeId)
          )
        : changes;

      setNodes((currentNodes) => {
        const updated = applyNodeChanges(filteredChanges, currentNodes);
        if (hasSelectChange) {
          if (lastSelectedId) {
            return updated.map((n) => ({
              ...n,
              selected: n.id === lastSelectedId,
            }));
          }
          return updated.map((n) => ({ ...n, selected: false }));
        }
        return updated;
      });
    },
    [draggingNodeId]
  );

  const onNodeDragStart = useCallback(
    (_, node) => {
      setDraggingNodeId(node.id);
      // Ensure only the dragged node is selected so it doesn't drag other previously-selected nodes
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          selected: n.id === node.id,
          draggable: n.id === node.id,
        }))
      );
      // Also clear selection in React Flow's internal state immediately
      try {
        reactFlow.setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: n.id === node.id }))
        );
      } catch {}
    },
    [reactFlow]
  );

  const onNodeDragStop = useCallback(
    (_, node) => {
      setDraggingNodeId(null);
      setNodes((prev) =>
        prev.map((n) => {
          const base = { ...n, selected: false };
          const cleared = { ...base, draggable: true };
          return n.id === node.id
            ? { ...cleared, position: snapToGrid(node.position) }
            : cleared;
        })
      );
      // Clear any lingering selection inside React Flow instance
      try {
        reactFlow.setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: false }))
        );
      } catch {}
    },
    [reactFlow]
  );

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
    const avatarSrc = formValues.avatarUrl || defaultAvatar;
    const id = generateId(name);

    const newCharacter = {
      id,
      name,
      trait,
      avatar: avatarSrc,
      position: pendingPosition,
    };

    const newNode = createCharacterNode(id, name, pendingPosition, avatarSrc, {
      trait,
    });

    // Update both states in a single batch to ensure consistency
    setCharacters((prev) => [...prev, newCharacter]);
    setNodes((prev) => [...prev, newNode]);

    // Reset form
    setFormValues({ name: "", trait: "", avatarFile: null, avatarUrl: "" });
    setIsFormOpen(false);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
  };

  const getNodeById = useCallback(
    (nodeId) => nodes.find((n) => n.id === nodeId) || null,
    [nodes]
  );

  const youNode = useMemo(() => getNodeById("you"), [getNodeById]);

  const { onNodeClick, renderedNodes } = useChat({
    nodes,
    youNode,
    getNodeById,
  });

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={renderedNodes}
        edges={[]}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        multiSelectionKeyCode={null}
        selectNodesOnDrag={false}
        elementsSelectable={false}
        snapToGrid
        snapGrid={[gridSize, gridSize]}
        panOnScroll
        fitView
        deleteKeyCode={null}
        preventScrolling={false}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>

      {/* Status overlay showing saved characters and storage info */}
      <div className="absolute top-2 left-2 bg-white/90 border border-gray-300 rounded-md px-2 py-1 text-xs">
        <div>Characters: {characters.length}</div>
        <div className="text-green-600">💾 Auto-saved</div>
        <div className="text-gray-500 text-xs">
          {(() => {
            try {
              const totalSize = Object.keys(localStorage)
                .filter((key) => key.startsWith("fragment_"))
                .reduce(
                  (size, key) => size + (localStorage[key]?.length || 0),
                  0
                );
              return `${Math.round(totalSize / 1024)}KB used`;
            } catch {
              return "";
            }
          })()}
        </div>
      </div>

      {/* Clear storage button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={() => {
            if (
              window.confirm("Clear all saved data? This cannot be undone.")
            ) {
              clearStorage();
              window.location.reload();
            }
          }}
          className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-md transition-colors"
          title="Clear all saved data"
        >
          Clear Data
        </button>
      </div>

      <AddCharacterModal
        open={isFormOpen}
        values={formValues}
        onChange={handleFormChange}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />

      {/* Removed bottom chat panel in favor of thought bubble on the character */}
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
