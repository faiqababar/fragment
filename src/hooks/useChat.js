import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Encapsulates chat state, proximity selection, message handling, and
 * injection of chat bubble props into the active partner node.
 */
export function useChat({ nodes, youNode, getNodeById, proximityPx = 80 }) {
  const [activeChatPartnerId, setActiveChatPartnerId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [chatInput, setChatInput] = useState("");

  const partnerNode = useMemo(() => {
    if (!activeChatPartnerId) return null;
    return getNodeById(activeChatPartnerId);
  }, [activeChatPartnerId, getNodeById]);

  const partnerTrait = partnerNode?.data?.trait || "";

  const ensureConversation = useCallback((partnerId) => {
    setConversations((prev) => (prev[partnerId] ? prev : { ...prev, [partnerId]: [] }));
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
    const currentNode = activeChatPartnerId ? nodes.find((n) => n.id === activeChatPartnerId) : null;
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
      const trimmed = chatInput.trim();
      if (!trimmed) return;
      const now = Date.now();
      setConversations((prev) => {
        const existing = prev[activeChatPartnerId] || [];
        return {
          ...prev,
          [activeChatPartnerId]: [...existing, { sender: "you", text: trimmed, t: now }],
        };
      });
      setChatInput("");

      const replyDelayMs = 600 + Math.floor(Math.random() * 800);
      const replyText = randomReply(partnerTrait, trimmed);
      setTimeout(() => {
        setConversations((prev) => {
          const existing = prev[activeChatPartnerId] || [];
          return {
            ...prev,
            [activeChatPartnerId]: [...existing, { sender: "them", text: replyText, t: Date.now() }],
          };
        });
      }, replyDelayMs);
    },
    [activeChatPartnerId, chatInput, partnerTrait, randomReply]
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
    if (!partnerNode) return nodes;
    const messages = conversations[activeChatPartnerId] || [];
    return nodes.map((n) =>
      n.id === partnerNode.id
        ? {
            ...n,
            data: {
              ...n.data,
              showChatBubble: true,
              messages,
              chatInput,
              onChatInputChange: setChatInput,
              onSend: handleSendMessage,
            },
          }
        : n
    );
  }, [nodes, partnerNode, conversations, activeChatPartnerId, chatInput, handleSendMessage]);

  return {
    onNodeClick,
    renderedNodes,
    activeChatPartnerId,
  };
}

