import { useCallback, useEffect, useMemo, useState } from "react";
import { generateCharacterReply } from "../services/gemini";

/**
 * Encapsulates chat state, proximity selection, message handling, and
 * injection of chat bubble props into the active partner node.
 */
export function useChat({ nodes, youNode, getNodeById, proximityPx = 80 }) {
  const [activeChatPartnerId, setActiveChatPartnerId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [typingPartnerId, setTypingPartnerId] = useState(null);
  const [conversationContexts, setConversationContexts] = useState({});

  const partnerNode = useMemo(() => {
    if (!activeChatPartnerId) return null;
    return getNodeById(activeChatPartnerId);
  }, [activeChatPartnerId, getNodeById]);

  const partnerTrait = partnerNode?.data?.trait || "";

  const ensureConversation = useCallback((partnerId) => {
    setConversations((prev) =>
      prev[partnerId] ? prev : { ...prev, [partnerId]: [] }
    );
  }, []);

  useEffect(() => {
    if (activeChatPartnerId) ensureConversation(activeChatPartnerId);
  }, [activeChatPartnerId, ensureConversation]);

  // Choose nearest node within proximity to chat with; keeps partner sticky if still in range
  useEffect(() => {
    if (!youNode) return;
    let nearest = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    const withinThreshold = [];
    for (const node of nodes) {
      if (node.id === "you") continue;
      const dx = node.position.x - youNode.position.x;
      const dy = node.position.y - youNode.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = node;
      }
      if (dist <= proximityPx) withinThreshold.push({ node, dist });
    }

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
    } else if (withinThreshold.length > 0 && nearest) {
      nextId = nearest.id;
    } else {
      nextId = null;
    }

    if (nextId !== activeChatPartnerId) setActiveChatPartnerId(nextId);
  }, [nodes, youNode, proximityPx, activeChatPartnerId]);

  const randomReply = useCallback((traitText, userMessage) => {
    const personalityResponses = {
      philosophical: [
        "Hmm… that’s deeper than it sounds. What sparked that thought? 🤔",
        "Interesting… makes me wonder where it all leads. What about you?",
        "That’s got some weight to it… have you always seen it that way?",
        "Feels like there’s a story behind that. Wanna share?",
      ],
      cheerful: [
        "Love that energy! 🌟 What else has you smiling today?",
        "That’s awesome! 😊 Got more good vibes to share?",
        "Haha, you’re a ray of sunshine! ☀️ How do you do it?",
        "That’s the spirit! 💪 What’s next on your happy list?",
      ],
      mysterious: [
        "Ooh… there’s more you’re not telling me, isn’t there? 👀",
        "Feels like you’re hiding something juicy. Care to spill?",
        "That’s got a strange ring to it… almost like a riddle. 🔮",
        "You’re up to something. I can feel it. 😏",
      ],
      wise: [
        "Solid insight. 🧠 How’d you figure that out?",
        "You’ve been around the block, huh? What else have you learned?",
        "That’s sharp. 🎯 Any advice for the rest of us?",
        "Smart take… mind if I borrow it?",
      ],
      curious: [
        "That’s interesting! How’d you find out about it?",
        "Whoa, tell me more — I’m hooked. 👀",
        "Love that! What’s the story behind it?",
        "Okay, now I need all the details. Spill! 🍵",
      ],
      sassy: [
        "Oh really? 💅 Convince me.",
        "Well, look who’s clever. What else you got?",
        "Ha! Not bad. Got more like that?",
        "Please… you think that’s wild? Try me. 😏",
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
      setConversations((prev) => {
        const existing = prev[partnerId] || [];
        return {
          ...prev,
          [partnerId]: [...existing, { sender: "you", text: trimmed, t: now }],
        };
      });
      setChatInput("");

      // Try Gemini; if no key or error, fall back to local random reply
      const doReply = async () => {
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        // show transient typing indicator for this partner
        setTypingPartnerId(partnerId);
        const convo = (prevId) => {
          // Build short history for this partner including the just-sent user message
          const existing = conversations[prevId] || [];
          return existing;
        };

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

              const msgs = [
                ...convo(partnerId),
                { sender: "you", text: trimmed },
              ];
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
            const existing = prev[partnerId] || [];
            return {
              ...prev,
              [partnerId]: [
                ...existing,
                {
                  sender: "them",
                  text: replyText,
                  t: Date.now(),
                },
              ],
            };
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
      partnerTrait,
      randomReply,
      conversations,
      getNodeById,
      conversationContexts,
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

  const renderedNodes = useMemo(() => {
    const messages = partnerNode
      ? conversations[activeChatPartnerId] || []
      : [];

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
                onSend: handleSendMessage,
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
    handleSendMessage,
    youNode,
    typingPartnerId,
  ]);

  return {
    onNodeClick,
    renderedNodes,
    activeChatPartnerId,
  };
}
