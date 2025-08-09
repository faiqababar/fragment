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
        "Ah, you’re touching the edges of something bigger here 🤔. What path of thought led you to this moment?",
        "Hmm… like ripples in a pond, your words reach far. 🧠 Have you been pondering this for long?",
        "That stirs an old thought in me… one that’s haunted my travels. What meaning does it hold for you today?",
        "Interesting… the kind of thought that could keep a soul awake at night. Have you always felt this way?",
      ],
      cheerful: [
        "Oh, that’s delightful! ✨ Your words are like a sunbeam in this world. What else makes you light up like this? 😊",
        "I love that! 🌟 How do you manage to keep such joy in your step?",
        "Yes! 🎉 That’s the kind of energy that makes adventures worth taking. What’s fueling it today? 🥰",
        "That’s the spirit! 💪 I can almost feel your good mood from here. Care to share your secret? 🌈",
      ],
      mysterious: [
        "Hmm… you carry secrets, I can tell 👁️. Care to share one?",
        "The way you speak… it’s as if you’re weaving shadows. 🌑 What’s hidden between your words?",
        "There’s an aura about this… almost a riddle. 🔮 Are you testing me?",
        "You make even the ordinary feel enchanted 🌟. What’s really going on beneath the surface?",
        "Oh, trying to be cryptic, are we? 😏 Keep talking, I’m curious where this leads… 🎭",
        "Well now… you’ve got me hooked despite myself. Spill it, traveler! 💫",
      ],
      wise: [
        "You speak with the weight of experience 🧙‍♂️. What journey carved this insight into you?",
        "Sharp mind, steady words 🎯. How did you come to know this truth?",
        "You’ve seen through to the heart of it 💎. Why do you think it matters now?",
        "There’s wisdom here ✨. What else have your travels taught you?",
        "Well, look at you — scholar and sage in one 🎓. What other truths do you carry?",
        "Oh, that’s clever 💡. I might have to jot that down… unless it’s a secret? 🤫",
      ],
      curious: [
        "That’s intriguing 🤔. How did you stumble onto this?",
        "Fascinating! 🔍 I want to know every detail — start from the beginning 📖.",
        "That’s amazing ✨. What’s the story behind it?",
        "Wow, I hadn’t thought of it like that 💡. What else should I know?",
        "Oh, now you’ve got me hooked 👀. Spill the whole tale 🍵.",
        "Well, butter my biscuit, that’s something new 🧈. What else are you keeping from me?",
      ],
      sassy: [
        "Oh honey, really? 💅 Convince me you know what you’re talking about 🤨.",
        "Well well well, look who’s suddenly an expert 👀. Got any proof to back that up?",
        "Oh snap… that’s actually not terrible 😏. What’s your angle here?",
        "I’ve heard some wild things, but this? Might be worth listening to 💁‍♀️. Spill it ☕.",
        "Hmm… not as clueless as you look 😌. Go on, impress me.",
        "Please, like you’re the first to think of that 🙄. But fine… I’m listening.",
        "Well butter my biscuit 🧈, that’s clever. What else you got hidden?",
        "Oh, you’re going there? 😱 Fine, I’m here for the drama 🍿.",
      ],
      neutral: [
        "That’s an interesting point 🤔. Tell me more.",
        "I see what you mean 👀. How do you think this plays out?",
        "That makes sense ✅. How does it connect to the bigger picture?",
        "Interesting perspective 🎨. What brought you to see it this way?",
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
