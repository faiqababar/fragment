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
    const baseReplies = [
      "Hmm, interesting...",
      "I was just thinking about that!",
      "The road goes ever on and on.",
      "Indeed.",
      "A curious thought, friend.",
      "I see. Go on...",
      "Ha! That made me smile.",
      "Let us be vigilant.",
      "I agree.",
      "Can you tell me more?",
    ];
    const flavored = traitText
      ? [
          `In a ${traitText.toLowerCase()} mood today.`,
          `${traitText} as ever!`,
          `Such a ${traitText.toLowerCase()} notion.`,
        ]
      : [];
    const echos = userMessage
      ? [
          `About that: "${userMessage.slice(0, 40)}"...`,
          `You said "${userMessage.slice(0, 25)}" — fascinating.`,
        ]
      : [];
    const all = [...baseReplies, ...flavored, ...echos];
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
              const msgs = [
                ...convo(partnerId),
                { sender: "you", text: trimmed },
              ];
              replyText = await generateCharacterReply({
                messages: msgs,
                persona: partnerTrait,
                characterName: name,
              });
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
                { sender: "them", text: replyText, t: Date.now() },
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
