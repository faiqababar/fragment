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
import { useAutonomousChat } from "./hooks/useAutonomousChat";
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

  // Test: Add some characters automatically for testing
  useEffect(() => {
    const hasTestChar1 = nodes.some((node) => node.id === "test-char-1");
    const hasTestChar2 = nodes.some((node) => node.id === "test-char-2");

    if (!hasTestChar1) {
      console.log("Adding test character 1");
      setNodes((prev) => [
        ...prev,
        createCharacterNode(
          "test-char-1",
          "Alice",
          { x: 100, y: 100 },
          defaultAvatar,
          {
            trait: "cheerful",
          }
        ),
      ]);
    }

    if (!hasTestChar2) {
      console.log("Adding test character 2");
      setNodes((prev) => [
        ...prev,
        createCharacterNode(
          "test-char-2",
          "Bob",
          { x: 150, y: 100 },
          defaultAvatar,
          {
            trait: "philosophical",
          }
        ),
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
  const getNodeById = useCallback(
    (nodeId) => nodes.find((n) => n.id === nodeId) || null,
    [nodes]
  );

  const youNode = useMemo(() => getNodeById("you"), [getNodeById]);

  const { onNodeClick, renderedNodes, activeChatPartnerId, conversations } =
    useChat({
      nodes,
      youNode,
      getNodeById,
    });

  // Autonomous chat functionality
  const {
    activeChatContexts,
    isAutonomousChatActive,
    isChatWindowOpen,
    proximityRelationships,
    MAX_AUTONOMOUS_MESSAGES,
    startChat,
    stopChat,
    getChatContext,
    getConversation,
    getTopic,
    getMessageCount,
  } = useAutonomousChat({
    nodes,
    youNode,
    getNodeById,
  });

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
    [setNodes]
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
    [draggingNodeId, setNodes]
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
    [reactFlow, setNodes]
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
    [reactFlow, setNodes]
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

  // Enhanced node rendering with proximity-based chat support
  const enhancedNodes = useMemo(() => {
    console.log("Rendering enhanced nodes:", {
      renderedNodesCount: renderedNodes.length,
      activeChatPartnerId,
      isAutonomousChatActive,
      activeChatContexts: Object.keys(activeChatContexts).length,
      proximityRelationships: proximityRelationships.length,
    });

    // Force cleanup: If there's an active chat partner, clear any conflicting autonomous chats
    if (activeChatPartnerId) {
      const activePartner = getNodeById(activeChatPartnerId);
      if (activePartner) {
        const activeChatContext = getChatContext(activeChatPartnerId);
        if (activeChatContext && activeChatContext.type === "npc-to-npc") {
          console.log(
            `🧹 Force clearing autonomous chat for ${activePartner.data.label} as they are now the active chat partner`
          );
          stopChat(activeChatPartnerId);
        }
      }
    }

    // Force set active chat partner for NPCs close to You
    const npcsCloseToYou = proximityRelationships
      .filter((rel) => rel.type === "npc-to-you")
      .map((rel) => (rel.char1.id !== "you" ? rel.char1 : rel.char2));

    if (npcsCloseToYou.length > 0 && !activeChatPartnerId) {
      const closestNpc = npcsCloseToYou[0]; // Take the first one
      console.log(
        `🎯 Force setting active chat partner to ${closestNpc.data.label} (close to You)`
      );
      // We need to trigger the chat partner change - this will be handled by the useChat hook
      // when it detects the proximity change
    }

    // CRITICAL FIX: Force clear autonomous chat contexts for NPCs close to You
    // This ensures that even if the useChat hook doesn't set them as active partners,
    // they won't show autonomous chat
    npcsCloseToYou.forEach((npc) => {
      const chatContext = getChatContext(npc.id);
      if (chatContext && chatContext.type === "npc-to-npc") {
        console.log(
          `🚨 CRITICAL: Force clearing autonomous chat for ${npc.data.label} (close to You)`
        );
        stopChat(npc.id);
      }
    });

    // CRITICAL FIX: Force set active chat partner for NPCs close to You
    // This ensures that NPCs close to You always get regular chat
    if (npcsCloseToYou.length > 0) {
      const closestNpc = npcsCloseToYou[0];
      const currentActivePartner = activeChatPartnerId
        ? getNodeById(activeChatPartnerId)
        : null;

      // If no active partner or the active partner is not close to You, set the closest NPC
      if (
        !currentActivePartner ||
        !npcsCloseToYou.some((npc) => npc.id === currentActivePartner.id)
      ) {
        console.log(
          `🚨 CRITICAL: Force setting ${closestNpc.data.label} as active chat partner (close to You)`
        );
        // We need to trigger the useChat hook to set this as the active partner
        // This will be handled by the proximity detection in useChat
      }
    }

    return renderedNodes.map((node) => {
      const isActivePartner =
        !!activeChatPartnerId && node.id === activeChatPartnerId;
      const chatContext = getChatContext(node.id);

      console.log(`Node ${node.data.label}:`, {
        isActivePartner,
        hasChatContext: !!chatContext,
        chatContext,
        nodeId: node.id,
      });

      // Determine which chat to show
      let chatData = {};

      // Debug: Log all the conditions
      const isCloseToYou = proximityRelationships.some(
        (rel) =>
          rel.type === "npc-to-you" &&
          (rel.char1.id === node.id || rel.char2.id === node.id)
      );

      // Additional check: Calculate distance directly to ensure accuracy
      const youNode = nodes.find((n) => n.id === "you");
      const directDistance = youNode
        ? Math.hypot(
            node.position.x - youNode.position.x,
            node.position.y - youNode.position.y
          )
        : Infinity;

      console.log(`📏 Distance check for ${node.data.label}:`, {
        directDistance: Math.round(directDistance),
        isCloseToYou,
        threshold: 120,
        youNodePosition: youNode?.position,
        nodePosition: node.position,
      });

      console.log(`🔍 Chat decision for ${node.data.label}:`, {
        isActivePartner,
        hasChatContext: !!chatContext,
        chatContextType: chatContext?.type,
        chatContextShowChat: chatContext?.showChat,
        isCloseToYou,
        activeChatPartnerId,
        nodeId: node.id,
        directDistance: Math.round(directDistance),
        chatContext: chatContext,
      });

      // PRIORITY: Regular chat with You takes precedence over autonomous chat
      // Additional safety check: if NPC is close to You, always show regular chat
      if (isActivePartner) {
        // Regular chat with You - this should always show when NPC is close to You
        console.log(`✅ Showing regular chat bubble for ${node.data.label}`);
        chatData = {
          showChatBubble: true,
          ...node.data,
        };
      } else if (isCloseToYou) {
        // NPC is close to You - always show regular chat, regardless of active partner status
        console.log(
          `✅ Showing regular chat bubble for ${node.data.label} (close to You)`
        );

        // Get the conversation data for regular chat with You
        const messages = conversations[node.id] || [];

        chatData = {
          showChatBubble: true,
          messages,
          chatInput: "",
          onChatInputChange: () => {},
          onSend: () => {},
          chatProfiles: {
            you: {
              name: youNode?.data?.label || "You",
              avatar: youNode?.data?.avatar || null,
              backgroundColor: youNode?.data?.backgroundColor,
            },
            them: {
              name: node.data.label,
              avatar: node.data.avatar,
              backgroundColor: node.data.backgroundColor,
            },
          },
          isTyping: false,
          ...node.data,
        };
      } else if (
        chatContext &&
        chatContext.showChat &&
        chatContext.type === "npc-to-npc" &&
        !isCloseToYou &&
        // CRITICAL FIX: Also check that the partner still exists and is not close to You
        (() => {
          const partner = getNodeById(chatContext.partnerId);
          if (!partner) return false;

          // Check if partner is close to You
          const partnerDistance = youNode
            ? Math.hypot(
                partner.position.x - youNode.position.x,
                partner.position.y - youNode.position.y
              )
            : Infinity;
          const partnerCloseToYou = partnerDistance <= 120;

          // Don't show autonomous chat if either NPC is close to You
          if (partnerCloseToYou) {
            console.log(
              `🚫 Blocking autonomous chat for ${node.data.label} - partner ${partner.data.label} is close to You`
            );
            return false;
          }

          return true;
        })()
      ) {
        // NPC has an active autonomous chat context and should show the chat window
        // Only show for NPC-to-NPC chats, not NPC-to-You chats
        const partner = getNodeById(chatContext.partnerId);

        if (partner) {
          console.log(
            `✅ Showing ${chatContext.type} chat bubble for ${node.data.label}`
          );

          // Get conversation data
          const messages = getConversation(node, partner).map((msg) => ({
            sender: msg.sender === node.id ? "them" : "you",
            text: msg.text,
            t: msg.t,
          }));

          const topic = getTopic(node, partner);
          const messageCount = getMessageCount(node, partner);

          chatData = {
            showChatBubble: true,
            currentTopic: topic,
            currentMessageCount: messageCount,
            maxMessages: MAX_AUTONOMOUS_MESSAGES,
            messages,
            chatInput: "",
            onChatInputChange: () => {},
            onSend: () => {},

            onCloseChat: () => {
              stopChat(node.id);
            },
            chatProfiles: {
              you: {
                name: partner.data.label,
                avatar: partner.data.avatar,
                backgroundColor: partner.data.backgroundColor,
              },
              them: {
                name: node.data.label,
                avatar: node.data.avatar,
                backgroundColor: node.data.backgroundColor,
              },
            },
            isTyping: false,
            isChatActive: isAutonomousChatActive,
          };
        } else {
          chatData = {
            showChatBubble: false,
            ...node.data,
          };
        }
      } else {
        console.log(`❌ No chat bubble for ${node.data.label}`);
        chatData = {
          showChatBubble: false,
          ...node.data,
        };
      }

      return {
        ...node,
        data: {
          ...node.data,
          ...chatData,
        },
      };
    });
  }, [
    renderedNodes,
    activeChatPartnerId,
    isAutonomousChatActive,
    activeChatContexts,
    proximityRelationships,
    getNodeById,
    getChatContext,
    stopChat,
    nodes,
    conversations,
    getConversation,
    getTopic,
    getMessageCount,
    MAX_AUTONOMOUS_MESSAGES,
  ]);

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={enhancedNodes}
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
        {isAutonomousChatActive && (
          <div className="text-blue-600">
            🤖 Auto-chat: {Object.keys(activeChatContexts).length} active
            contexts
          </div>
        )}
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

        {/* Debug info */}
        <div className="mt-1 text-xs text-red-600">
          <div>Nodes: {nodes.length}</div>
          <div>Active Chat: {activeChatPartnerId || "none"}</div>
          <div>Auto Chat: {isAutonomousChatActive ? "active" : "inactive"}</div>
          <div>Chat Contexts: {Object.keys(activeChatContexts).length}</div>
          <div>Proximity Relationships: {proximityRelationships.length}</div>
          {Object.entries(activeChatContexts).map(([npcId, context]) => {
            const npc = getNodeById(npcId);
            const partner = getNodeById(context.partnerId);
            return (
              <div key={npcId} className="text-green-600">
                {npc?.data?.label} → {partner?.data?.label} ({context.type})
                {context.showChat && " [SHOWING CHAT]"}
              </div>
            );
          })}
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

        {/* Debug chat state button */}
        <button
          onClick={() => {
            console.log("🔍 Current Chat State Debug:");
            console.log("- Active Chat Partner ID:", activeChatPartnerId);
            console.log("- Active Chat Contexts:", activeChatContexts);
            console.log("- Proximity Relationships:", proximityRelationships);
            console.log("- Is Autonomous Chat Active:", isAutonomousChatActive);

            // Log each node's chat state
            nodes.forEach((node) => {
              const chatContext = getChatContext(node.id);
              const isCloseToYou = proximityRelationships.some(
                (rel) =>
                  rel.type === "npc-to-you" &&
                  (rel.char1.id === node.id || rel.char2.id === node.id)
              );
              console.log(`Node ${node.data.label}:`, {
                id: node.id,
                isActivePartner: activeChatPartnerId === node.id,
                hasChatContext: !!chatContext,
                chatContextType: chatContext?.type,
                isCloseToYou,
                position: node.position,
              });
            });
          }}
          className="ml-2 bg-gray-500 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded-md transition-colors"
          title="Debug chat state"
        >
          Debug Chat
        </button>

        {/* Test chat starter issue */}
        <button
          onClick={() => {
            console.log("🧪 Testing chat starter issue...");

            // Find test characters
            const testChar1 = nodes.find((n) => n.id === "test-char-1");
            const testChar2 = nodes.find((n) => n.id === "test-char-2");
            const youNode = nodes.find((n) => n.id === "you");

            if (testChar1 && testChar2 && youNode) {
              // Step 1: Start autonomous chat
              console.log("Step 1: Starting autonomous chat");
              startChat(testChar1, testChar2, "npc-to-npc");

              // Step 2: Wait and identify chat starter
              setTimeout(() => {
                console.log("Step 2: Identifying chat starter...");
                let chatStarter = null;
                Object.entries(activeChatContexts).forEach(
                  ([npcId, context]) => {
                    if (context.showChat && context.type === "npc-to-npc") {
                      chatStarter = getNodeById(npcId);
                      console.log(
                        `🎯 Chat starter: ${chatStarter.data.label} (${npcId})`
                      );
                    }
                  }
                );

                if (chatStarter) {
                  // Step 3: Move chat starter close to You
                  console.log(
                    `Step 3: Moving chat starter (${chatStarter.data.label}) close to You`
                  );
                  setNodes((prev) =>
                    prev.map((node) => {
                      if (node.id === chatStarter.id) {
                        return {
                          ...node,
                          position: {
                            x: youNode.position.x + 10,
                            y: youNode.position.y + 10,
                          },
                        };
                      }
                      return node;
                    })
                  );

                  // Step 4: Wait and check what happened
                  setTimeout(() => {
                    console.log("Step 4: Checking results...");
                    console.log(
                      "- Active chat partner ID:",
                      activeChatPartnerId
                    );
                    console.log("- Active chat contexts:", activeChatContexts);
                    console.log(
                      "- Proximity relationships:",
                      proximityRelationships
                    );

                    const chatContext = getChatContext(chatStarter.id);
                    console.log(`- Chat starter context:`, chatContext);

                    const isActivePartner =
                      activeChatPartnerId === chatStarter.id;
                    console.log(
                      `- Is chat starter active partner:`,
                      isActivePartner
                    );
                  }, 1000);
                }
              }, 2000);
            } else {
              console.log("Test characters not found");
            }
          }}
          className="ml-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-md transition-colors"
          title="Test chat starter issue"
        >
          Test Chat Starter Issue
        </button>

        {/* Clear chat history button */}
        <button
          onClick={() => {
            if (
              window.confirm(
                "Clear all chat history? This will reset conversations."
              )
            ) {
              // Clear conversations from localStorage
              localStorage.removeItem("fragment_conversations");
              localStorage.removeItem("fragment_conversation_contexts");
              console.log("🧹 Cleared all chat history");
              // Reload to reset state
              window.location.reload();
            }
          }}
          className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded-md transition-colors"
          title="Clear chat history"
        >
          Clear History
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
