import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { generateCharacterReply } from "../services/gemini";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Encapsulates chat state, proximity selection, message handling, and
 * injection of chat bubble props into the active partner node.
 */
export function useChat({ nodes, youNode, getNodeById, proximityPx = 120 }) {
  const [activeChatPartnerId, setActiveChatPartnerId] = useState(null);
  const [conversations, setConversations] = useLocalStorage(
    "fragment_conversations",
    {}
  );
  const [chatInput, setChatInput] = useState("");
  const [typingPartnerId, setTypingPartnerId] = useState(null);
  const [conversationContexts, setConversationContexts] = useLocalStorage(
    "fragment_conversation_contexts",
    {}
  );

  // Use ref to track current conversations state
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // Debug: log when conversations change
  useEffect(() => {
    console.log("Conversations state changed:", conversations);
    console.log("Ref updated to:", conversationsRef.current);
  }, [conversations]);

  // Initialize conversations from localStorage on mount
  useEffect(() => {
    console.log("Initializing conversations from localStorage");
    try {
      const stored = localStorage.getItem("fragment_conversations");
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("Found stored conversations:", parsed);

        // Only update if we have conversations that aren't in our current state
        const hasNewConversations = Object.keys(parsed).some(
          (key) =>
            !conversations[key] ||
            conversations[key].length !== parsed[key].length
        );

        if (hasNewConversations) {
          console.log("Updating conversations state with stored data");
          setConversations((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      }
    } catch (error) {
      console.error(
        "Error initializing conversations from localStorage:",
        error
      );
    }
  }, []); // Only run on mount

  // Debug: log when activeChatPartnerId changes
  useEffect(() => {
    console.log("Active chat partner changed to:", activeChatPartnerId);
    if (activeChatPartnerId) {
      const currentConversation = conversations[activeChatPartnerId] || [];
      console.log(
        `Conversation for ${activeChatPartnerId}:`,
        currentConversation
      );

      // Ensure the conversation exists in localStorage
      if (!currentConversation.length) {
        console.log(
          `No conversation found for ${activeChatPartnerId}, checking localStorage directly`
        );
        try {
          const stored = localStorage.getItem("fragment_conversations");
          if (stored) {
            const parsed = JSON.parse(stored);
            const storedConversation = parsed[activeChatPartnerId] || [];
            console.log(
              `Found conversation in localStorage for ${activeChatPartnerId}:`,
              storedConversation
            );

            // If we found a conversation in localStorage but not in state, sync it
            if (storedConversation.length > 0) {
              console.log(
                `Syncing conversation from localStorage for ${activeChatPartnerId}`
              );
              setConversations((prev) => ({
                ...prev,
                [activeChatPartnerId]: storedConversation,
              }));
            }
          }
        } catch (error) {
          console.error(
            "Error reading conversations from localStorage:",
            error
          );
        }
      }
    }
  }, [activeChatPartnerId, conversations, setConversations]);

  const partnerNode = useMemo(() => {
    if (!activeChatPartnerId) return null;
    return getNodeById(activeChatPartnerId);
  }, [activeChatPartnerId, getNodeById]);

  const partnerTrait = partnerNode?.data?.trait || "";

  const ensureConversation = useCallback(
    (partnerId) => {
      setConversations((prev) => {
        if (prev[partnerId]) {
          console.log(
            `Conversation already exists for ${partnerId}:`,
            prev[partnerId]
          );
          return prev;
        }
        console.log(`Creating new conversation for ${partnerId}`);
        return { ...prev, [partnerId]: [] };
      });
    },
    [setConversations]
  );

  // Function to backup current conversation before switching partners
  const backupCurrentConversation = useCallback(() => {
    if (activeChatPartnerId && conversations[activeChatPartnerId]) {
      console.log(
        `Backing up conversation for ${activeChatPartnerId}:`,
        conversations[activeChatPartnerId]
      );
      // The conversation is already saved in localStorage via useLocalStorage
      // This is just for debugging
    }
  }, [activeChatPartnerId, conversations]);

  // Function to restore conversation for a partner
  const restoreConversation = useCallback(
    (partnerId) => {
      console.log(`Attempting to restore conversation for ${partnerId}`);
      try {
        const stored = localStorage.getItem("fragment_conversations");
        if (stored) {
          const parsed = JSON.parse(stored);
          const storedConversation = parsed[partnerId] || [];
          console.log(
            `Found stored conversation for ${partnerId}:`,
            storedConversation
          );

          if (storedConversation.length > 0) {
            setConversations((prev) => {
              const updated = {
                ...prev,
                [partnerId]: storedConversation,
              };
              console.log(`Restored conversation for ${partnerId}:`, updated);
              return updated;
            });
          }
        }
      } catch (error) {
        console.error(`Error restoring conversation for ${partnerId}:`, error);
      }
    },
    [setConversations]
  );

  useEffect(() => {
    if (activeChatPartnerId) {
      console.log(`Ensuring conversation exists for ${activeChatPartnerId}`);
      ensureConversation(activeChatPartnerId);
    }
  }, [activeChatPartnerId, ensureConversation]);

  // Choose nearest node within proximity to chat with; keeps partner sticky if still in range
  useEffect(() => {
    if (!youNode) {
      console.log("No youNode found for chat proximity detection");
      return;
    }

    console.log("Checking chat proximity for You at:", youNode.position);

    let nearest = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    const withinThreshold = [];
    for (const node of nodes) {
      if (node.id === "you") continue;
      const dx = node.position.x - youNode.position.x;
      const dy = node.position.y - youNode.position.y;
      const dist = Math.hypot(dx, dy);
      console.log(`Distance to ${node.data.label}: ${dist}px`);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = node;
      }
      if (dist <= proximityPx) withinThreshold.push({ node, dist });
    }

    console.log(
      "Characters within chat proximity:",
      withinThreshold.map((t) => t.node.data.label)
    );

    let nextId = null;
    const currentNode = activeChatPartnerId
      ? nodes.find((n) => n.id === activeChatPartnerId)
      : null;
    if (
      currentNode &&
      Math.hypot(
        currentNode.position.x - youNode.position.x,
        currentNode.position.y - youNode.position.y
      ) <= proximityPx
    ) {
      nextId = activeChatPartnerId;
      console.log("Keeping current chat partner:", currentNode.data.label);
    } else if (withinThreshold.length > 0 && nearest) {
      nextId = nearest.id;
      console.log("Setting new chat partner:", nearest.data.label);
      // Ensure conversation exists for the new partner
      ensureConversation(nearest.id);
    } else {
      nextId = null;
      console.log("No chat partner in proximity");
    }

    console.log("🔍 Chat proximity decision:", {
      currentNode: currentNode?.data?.label,
      currentDistance: currentNode
        ? Math.hypot(
            currentNode.position.x - youNode.position.x,
            currentNode.position.y - youNode.position.y
          )
        : null,
      proximityThreshold: proximityPx,
      withinThreshold: withinThreshold.map((t) => t.node.data.label),
      nearest: nearest?.data?.label,
      nextId,
      activeChatPartnerId,
    });

    if (nextId !== activeChatPartnerId) {
      console.log(
        `Chat partner changed from ${activeChatPartnerId} to ${nextId}`
      );

      // Backup current conversation before switching
      if (activeChatPartnerId) {
        backupCurrentConversation();
      }

      if (nextId) {
        const nextNode = nodes.find((n) => n.id === nextId);
        console.log(
          `🎯 New chat partner: ${nextNode?.data?.label} (${nextId})`
        );

        // Restore conversation for the new partner
        restoreConversation(nextId);
      } else {
        console.log(`🎯 No chat partner selected`);
      }

      setActiveChatPartnerId(nextId);
    }
  }, [
    nodes,
    youNode,
    proximityPx,
    activeChatPartnerId,
    ensureConversation,
    backupCurrentConversation,
    restoreConversation,
  ]);

  const randomReply = useCallback((traitText, userMessage) => {
    const personalityResponses = {
      philosophical: [
        "Hmm… that's deeper than it sounds. What sparked that thought? 🤔",
        "Interesting… makes me wonder where it all leads. What about you?",
        "That's got some weight to it… have you always seen it that way?",
        "Feels like there's a story behind that. Wanna share?",
      ],
      cheerful: [
        "Love that energy! 🌟 What else has you smiling today?",
        "That's awesome! 😊 Got more good vibes to share?",
        "Haha, you're a ray of sunshine! ☀️ How do you do it?",
        "That's the spirit! 💪 What's next on your happy list?",
      ],
      mysterious: [
        "Ooh… there's more you're not telling me, isn't there? 👀",
        "Feels like you're hiding something juicy. Care to spill?",
        "That's got a strange ring to it… almost like a riddle. 🔮",
        "You're up to something. I can feel it. 😏",
      ],
      wise: [
        "Solid insight. 🧠 How'd you figure that out?",
        "You've been around the block, huh? What else have you learned?",
        "That's sharp. 🎯 Any advice for the rest of us?",
        "Smart take… mind if I borrow it?",
      ],
      curious: [
        "That's interesting! How'd you find out about it?",
        "Whoa, tell me more — I'm hooked. 👀",
        "Love that! What's the story behind it?",
        "Okay, now I need all the details. Spill! 🍵",
      ],
      sassy: [
        "Oh really? 💅 Convince me.",
        "Well, look who's clever. What else you got?",
        "Ha! Not bad. Got more like that?",
        "Please… you think that's wild? Try me. 😏",
      ],
      neutral: [
        "I see… tell me more.",
        "Makes sense. How do you think it plays out?",
        "Interesting take. Why do you see it that way?",
        "Hmm… go on.",
      ],
    };

    const trait = traitText?.toLowerCase() || "neutral";
    const responses =
      personalityResponses[trait] || personalityResponses.neutral;

    // Add some variety with user message references
    const userRefs = userMessage
      ? [
          `"${userMessage.slice(0, 30)}..." - that's really got me thinking. ${
            responses[0]
          }`,
          `When you mentioned "${userMessage.slice(
            0,
            25
          )}", it reminded me of something. ${responses[1]}`,
        ]
      : [];

    const all = [...responses, ...userRefs];
    return all[Math.floor(Math.random() * all.length)];
  }, []);

  const handleSendMessage = useCallback(
    (e) => {
      e?.preventDefault?.();
      if (!activeChatPartnerId) return;
      // Stabilize partner id in this send cycle in case selection changes mid-reply
      const partnerId = activeChatPartnerId;
      const trimmed = chatInput.trim();
      if (!trimmed) return;
      const now = Date.now();

      // Create the user message
      const userMessage = { sender: "you", text: trimmed, t: now };

      // Get current conversation and add user message
      const currentConversation = conversations[partnerId] || [];
      const conversationWithUser = [...currentConversation, userMessage];

      console.log("Current conversation:", currentConversation);
      console.log("User message to add:", userMessage);
      console.log("Conversation with user:", conversationWithUser);

      // Update conversations state
      setConversations((prev) => {
        const updated = {
          ...prev,
          [partnerId]: conversationWithUser,
        };
        console.log("Updated conversations state:", updated);
        return updated;
      });

      setChatInput("");

      // Try Gemini; if no key or error, fall back to local random reply
      const doReply = async () => {
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        // show transient typing indicator for this partner
        setTypingPartnerId(partnerId);

        // Use the conversation that includes the user's message
        const msgs = conversationWithUser;

        try {
          let replyText = "";
          if (apiKey) {
            try {
              const partner = getNodeById(partnerId);
              const name = partner?.data?.label || "Character";

              // Get conversation context for more coherent responses
              const context = conversationContexts[partnerId] || "";
              const contextPrompt = context
                ? `\n\nCONVERSATION CONTEXT: ${context}`
                : "";

              // msgs is already defined above
              replyText = await generateCharacterReply({
                messages: msgs,
                persona: partnerTrait + contextPrompt,
                characterName: name,
              });

              // Update conversation context based on the exchange
              const newContext = `${
                context ? context + " " : ""
              }User mentioned: ${trimmed.slice(
                0,
                50
              )}. Character responded about: ${replyText.slice(0, 50)}`;
              setConversationContexts((prev) => ({
                ...prev,
                [partnerId]: newContext.slice(-200), // Keep last 200 chars for context
              }));
            } catch (err) {
              replyText = randomReply(partnerTrait, trimmed);
            }
          } else {
            replyText = randomReply(partnerTrait, trimmed);
          }

          // Add a human-like typing delay based on reply length
          const minMs = 600; // minimum perceived latency
          const perCharMs = 25; // typing speed-ish
          const maxMs = 3000; // cap to keep UX snappy
          const computed = Math.min(
            maxMs,
            Math.max(minMs, perCharMs * replyText.length)
          );
          await new Promise((r) => setTimeout(r, computed));

          setConversations((prev) => {
            // Use the conversation that includes the user's message, not the potentially stale state
            const existing = prev[partnerId] || [];
            console.log("Existing conversation when adding reply:", existing);

            // Ensure the user message is still there
            const hasUserMessage = existing.some(
              (msg) =>
                msg.sender === "you" && msg.text === trimmed && msg.t === now
            );

            let finalConversation;
            if (!hasUserMessage) {
              // If user message is missing, add it back
              finalConversation = [
                ...existing,
                userMessage,
                { sender: "them", text: replyText, t: Date.now() },
              ];
              console.log("User message was missing, added it back");
            } else {
              // User message is there, just add the reply
              finalConversation = [
                ...existing,
                { sender: "them", text: replyText, t: Date.now() },
              ];
            }

            const updated = {
              ...prev,
              [partnerId]: finalConversation,
            };
            console.log("Adding character reply:", {
              sender: "them",
              text: replyText,
            });
            console.log("Final conversations after reply:", updated);
            return updated;
          });
        } finally {
          // Clear typing indicator only if it matches this cycle's partner
          setTypingPartnerId((curr) => (curr === partnerId ? null : curr));
        }
      };

      doReply();
    },
    [
      activeChatPartnerId,
      chatInput,
      setConversations,
      conversations,
      getNodeById,
      conversationContexts,
      partnerTrait,
      setConversationContexts,
      randomReply,
    ]
  );

  const onNodeClick = useCallback(
    (_, node) => {
      if (node.id !== "you" && youNode) {
        const dx = node.position.x - youNode.position.x;
        const dy = node.position.y - youNode.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= proximityPx) setActiveChatPartnerId(node.id);
      }
    },
    [youNode, proximityPx]
  );

  // Create a stable onSend function
  const onSend = useCallback(() => {
    handleSendMessage();
  }, [handleSendMessage]);

  const renderedNodes = useMemo(() => {
    // Get messages for the active chat partner, ensuring we have the latest state
    const messages =
      partnerNode && activeChatPartnerId
        ? conversations[activeChatPartnerId] || []
        : [];

    console.log(
      `Rendering nodes with activeChatPartnerId: ${activeChatPartnerId}`
    );
    console.log(`Messages for ${activeChatPartnerId}:`, messages);
    console.log(`All conversations:`, conversations);

    return nodes.map((node) => {
      const isActivePartner = !!partnerNode && node.id === partnerNode.id;
      return {
        ...node,
        data: {
          ...node.data,
          showChatBubble: isActivePartner,
          ...(isActivePartner
            ? {
                messages,
                chatInput,
                onChatInputChange: setChatInput,
                onSend: onSend,
                chatProfiles: {
                  you: {
                    name: youNode?.data?.label || "You",
                    avatar: youNode?.data?.avatar || null,
                    backgroundColor: youNode?.data?.backgroundColor,
                  },
                  them: {
                    name: partnerNode?.data?.label || "Character",
                    avatar: partnerNode?.data?.avatar || null,
                    backgroundColor: partnerNode?.data?.backgroundColor,
                  },
                },
                isTyping: typingPartnerId === partnerNode.id,
              }
            : {}),
        },
      };
    });
  }, [
    nodes,
    partnerNode,
    conversations,
    activeChatPartnerId,
    chatInput,
    onSend,
    youNode,
    typingPartnerId,
  ]);

  return {
    onNodeClick,
    renderedNodes,
    activeChatPartnerId,
    conversations,
    setActiveChatPartnerId,
  };
}
