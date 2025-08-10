import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  generateAutonomousTopic,
  generateAutonomousMessage,
} from "../services/gemini";
import { useLocalStorage } from "./useLocalStorage";

const PROXIMITY_THRESHOLD = 120; // pixels - increased for easier testing
const MAX_AUTONOMOUS_MESSAGES = 10;
const MESSAGE_INTERVAL_MIN = 3000; // 3 seconds
const MESSAGE_INTERVAL_MAX = 8000; // 8 seconds

export function useAutonomousChat({ nodes, youNode, getNodeById }) {
  const [autonomousConversations, setAutonomousConversations] = useLocalStorage(
    "fragment_autonomous_conversations",
    {}
  );
  const [autonomousTopics, setAutonomousTopics] = useLocalStorage(
    "fragment_autonomous_topics",
    {}
  );
  const [autonomousMessageCounts, setAutonomousMessageCounts] = useLocalStorage(
    "fragment_autonomous_message_counts",
    {}
  );

  // New proximity-based state
  const [activeChatContexts, setActiveChatContexts] = useState({}); // { npcId: { partnerId, type } }
  const [isAutonomousChatActive, setIsAutonomousChatActive] = useState(false);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const messageTimerRef = useRef(null);
  const activeChatContextsRef = useRef({});

  // Find all proximity relationships
  const proximityRelationships = useMemo(() => {
    if (!nodes || nodes.length < 2) return [];

    const relationships = [];
    const nonYouNodes = nodes.filter((node) => node.id !== "you");

    // Check NPC-to-NPC proximity
    for (let i = 0; i < nonYouNodes.length; i++) {
      for (let j = i + 1; j < nonYouNodes.length; j++) {
        const node1 = nonYouNodes[i];
        const node2 = nonYouNodes[j];

        const dx = node1.position.x - node2.position.x;
        const dy = node1.position.y - node2.position.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= PROXIMITY_THRESHOLD) {
          relationships.push({
            type: "npc-to-npc",
            char1: node1,
            char2: node2,
            distance,
          });
        }
      }
    }

    // Check NPC-to-You proximity
    if (youNode) {
      nonYouNodes.forEach((npc) => {
        const dx = youNode.position.x - npc.position.x;
        const dy = youNode.position.y - npc.position.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= PROXIMITY_THRESHOLD) {
          relationships.push({
            type: "npc-to-you",
            char1: npc,
            char2: youNode,
            distance,
          });
        }
      });
    }

    return relationships;
  }, [nodes, youNode]);

  // Generate conversation ID for a pair of characters
  const getConversationId = useCallback((char1, char2) => {
    const ids = [char1.id, char2.id].sort();
    return `autonomous_${ids[0]}_${ids[1]}`;
  }, []);

  // Start or resume chat between two characters
  const startChat = useCallback(
    async (char1, char2, chatType = "npc-to-npc") => {
      console.log(
        `🚀 Starting ${chatType} chat between ${char1.data.label} and ${char2.data.label}`
      );

      const conversationId = getConversationId(char1, char2);
      const currentCount = autonomousMessageCounts[conversationId] || 0;

      // Check if we've reached the message limit
      if (currentCount >= MAX_AUTONOMOUS_MESSAGES) {
        console.log("❌ Message limit reached, not starting chat");
        return false;
      }

      // Generate topic if not exists
      if (!autonomousTopics[conversationId]) {
        console.log("🎯 Generating new topic for conversation");
        try {
          const topic = await generateAutonomousTopic([
            { id: char1.id, name: char1.data.label, trait: char1.data.trait },
            { id: char2.id, name: char2.data.label, trait: char2.data.trait },
          ]);
          console.log("✅ Generated topic:", topic);
          setAutonomousTopics((prev) => ({
            ...prev,
            [conversationId]: topic,
          }));
        } catch (error) {
          console.error("❌ Failed to generate topic:", error);
          setAutonomousTopics((prev) => ({
            ...prev,
            [conversationId]: "casual conversation",
          }));
        }
      } else {
        console.log(
          "📋 Using existing topic:",
          autonomousTopics[conversationId]
        );
      }

      // Update chat contexts - only the first character shows the chat window
      const newContexts = {
        ...activeChatContextsRef.current,
        [char1.id]: { partnerId: char2.id, type: chatType, showChat: true },
        [char2.id]: { partnerId: char1.id, type: chatType, showChat: false },
      };
      activeChatContextsRef.current = newContexts;
      setActiveChatContexts(newContexts);

      setIsAutonomousChatActive(true);
      setIsChatWindowOpen(true);

      console.log("✅ Chat started successfully");
      return true;
    },
    [
      getConversationId,
      autonomousMessageCounts,
      autonomousTopics,
      setAutonomousTopics,
    ]
  );

  // Stop chat for a specific character
  const stopChat = useCallback((npcId) => {
    console.log(`🛑 Stopping chat for ${npcId}`);

    const newContexts = { ...activeChatContextsRef.current };
    delete newContexts[npcId];
    activeChatContextsRef.current = newContexts;
    setActiveChatContexts(newContexts);

    // If no more active chats, close the window
    if (Object.keys(newContexts).length === 0) {
      setIsAutonomousChatActive(false);
      setIsChatWindowOpen(false);
    }
  }, []);

  // Stop all autonomous chats
  const stopAllChats = useCallback(() => {
    console.log("🛑 Stopping all autonomous chats");
    setActiveChatContexts({});
    setIsAutonomousChatActive(false);
    setIsChatWindowOpen(false);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
  }, []);

  // Generate and send autonomous message
  const sendAutonomousMessage = useCallback(
    async (sender, receiver) => {
      console.log("📤 sendAutonomousMessage called:", {
        sender: sender.data.label,
        receiver: receiver.data.label,
      });

      const conversationId = getConversationId(sender, receiver);
      const topic = autonomousTopics[conversationId] || "casual conversation";
      const currentMessages = autonomousConversations[conversationId] || [];

      try {
        const messageText = await generateAutonomousMessage({
          senderName: sender.data.label,
          senderTrait: sender.data.trait,
          receiverName: receiver.data.label,
          receiverTrait: receiver.data.trait,
          topic,
          conversationHistory: currentMessages,
        });

        console.log("✅ Generated message:", messageText);

        const newMessage = {
          sender: sender.id,
          receiver: receiver.id,
          text: messageText,
          t: Date.now(),
        };

        // Add message to conversation
        setAutonomousConversations((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), newMessage],
        }));

        // Increment message count
        setAutonomousMessageCounts((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));

        return true;
      } catch (error) {
        console.error("❌ Failed to generate autonomous message:", error);
        return false;
      }
    },
    [
      getConversationId,
      autonomousTopics,
      autonomousConversations,
      setAutonomousConversations,
      setAutonomousMessageCounts,
    ]
  );

  // Schedule next autonomous message
  const scheduleNextMessage = useCallback(() => {
    if (
      !isAutonomousChatActive ||
      Object.keys(activeChatContexts).length === 0
    ) {
      return;
    }

    // Find an active NPC-to-NPC chat to send a message
    const npcToNpcChats = Object.entries(activeChatContexts).filter(
      ([npcId, context]) =>
        context.type === "npc-to-npc" && context.partnerId !== "you"
    );

    if (npcToNpcChats.length === 0) {
      return;
    }

    // Pick a random NPC-to-NPC chat
    const [npcId, context] = npcToNpcChats[0];
    const npc = getNodeById(npcId);
    const partner = getNodeById(context.partnerId);

    if (!npc || !partner) {
      return;
    }

    const conversationId = getConversationId(npc, partner);
    const currentCount = autonomousMessageCounts[conversationId] || 0;

    // Stop if we've reached the limit
    if (currentCount >= MAX_AUTONOMOUS_MESSAGES) {
      console.log("❌ Message limit reached, stopping autonomous chat");
      stopChat(npcId);
      stopChat(partner.id);
      return;
    }

    // Random interval between messages
    const interval =
      Math.random() * (MESSAGE_INTERVAL_MAX - MESSAGE_INTERVAL_MIN) +
      MESSAGE_INTERVAL_MIN;

    messageTimerRef.current = setTimeout(async () => {
      if (!isAutonomousChatActive) {
        return;
      }

      // Alternate between characters
      const sender = currentCount % 2 === 0 ? npc : partner;
      const receiver = currentCount % 2 === 0 ? partner : npc;

      const success = await sendAutonomousMessage(sender, receiver);

      if (success) {
        scheduleNextMessage();
      } else {
        stopChat(npcId);
        stopChat(partner.id);
      }
    }, interval);
  }, [
    isAutonomousChatActive,
    activeChatContexts,
    getNodeById,
    getConversationId,
    autonomousMessageCounts,
    sendAutonomousMessage,
    stopChat,
  ]);

  // Main proximity effect - manages chat contexts based on proximity
  useEffect(() => {
    console.log("🔄 Proximity effect triggered:", {
      relationships: proximityRelationships.length,
      activeContexts: Object.keys(activeChatContextsRef.current).length,
    });

    // First, stop any autonomous chats for NPCs that are now close to You
    const npcsCloseToYou = proximityRelationships
      .filter((rel) => rel.type === "npc-to-you")
      .map((rel) => (rel.char1.id !== "you" ? rel.char1 : rel.char2));

    console.log(
      "🔍 NPCs close to You:",
      npcsCloseToYou.map((npc) => npc.data.label)
    );

    npcsCloseToYou.forEach((npc) => {
      const npcContext = activeChatContextsRef.current[npc.id];
      if (npcContext && npcContext.type === "npc-to-npc") {
        console.log(
          `🛑 Stopping autonomous chat for ${npc.data.label} as they moved close to You`
        );
        stopChat(npc.id);
      }

      // Also stop any autonomous chats where this NPC is the partner
      Object.entries(activeChatContextsRef.current).forEach(
        ([otherNpcId, context]) => {
          if (context.partnerId === npc.id && context.type === "npc-to-npc") {
            console.log(
              `🛑 Stopping autonomous chat for ${otherNpcId} as their partner ${npc.data.label} moved close to You`
            );
            stopChat(otherNpcId);
          }
        }
      );
    });

    // Then process each proximity relationship
    proximityRelationships.forEach(async (relationship) => {
      const { type, char1, char2 } = relationship;

      if (type === "npc-to-npc") {
        // Skip if either NPC is close to You (they should be in regular chat instead)
        if (
          npcsCloseToYou.some(
            (npc) => npc.id === char1.id || npc.id === char2.id
          )
        ) {
          console.log(
            `⏭️ Skipping NPC-to-NPC chat as one of the NPCs is close to You`
          );
          return;
        }

        // Check if either NPC is already in a chat
        const char1Context = activeChatContextsRef.current[char1.id];
        const char2Context = activeChatContextsRef.current[char2.id];

        // If neither is in a chat, start a new one
        if (!char1Context && !char2Context) {
          await startChat(char1, char2, "npc-to-npc");
        }
        // If one is in a chat with someone else, stop that chat and start new one
        else if (char1Context && char1Context.partnerId !== char2.id) {
          stopChat(char1.id);
          await startChat(char1, char2, "npc-to-npc");
        } else if (char2Context && char2Context.partnerId !== char1.id) {
          stopChat(char2.id);
          await startChat(char1, char2, "npc-to-npc");
        }
      }
      // NPC-to-You relationships are handled above in the initial cleanup
    });
  }, [proximityRelationships, startChat, stopChat, youNode]);

  // Separate effect to handle stopping chats when NPCs move away
  useEffect(() => {
    // Stop chats for NPCs that are no longer in proximity
    Object.entries(activeChatContextsRef.current).forEach(
      ([npcId, context]) => {
        const npc = getNodeById(npcId);
        const partner = getNodeById(context.partnerId);

        if (!npc || !partner) {
          stopChat(npcId);
          return;
        }

        const dx = npc.position.x - partner.position.x;
        const dy = npc.position.y - partner.position.y;
        const distance = Math.hypot(dx, dy);

        // Check if NPC moved away from partner
        if (distance > PROXIMITY_THRESHOLD) {
          console.log(
            `🛑 ${npc.data.label} moved away from ${partner.data.label}, stopping chat`
          );
          stopChat(npcId);
        }
      }
    );
  }, [nodes, stopChat, getNodeById, youNode]);

  // Start message scheduling when autonomous chat becomes active
  useEffect(() => {
    if (isAutonomousChatActive) {
      console.log("🎬 Starting message scheduling for autonomous chat");
      scheduleNextMessage();
    }

    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, [isAutonomousChatActive, scheduleNextMessage]);

  // Get current chat context for a specific NPC
  const getChatContext = useCallback(
    (npcId) => {
      return activeChatContexts[npcId] || null;
    },
    [activeChatContexts]
  );

  // Get conversation for a specific chat context
  const getConversation = useCallback(
    (char1, char2) => {
      if (!char1 || !char2) return [];
      const conversationId = getConversationId(char1, char2);
      return autonomousConversations[conversationId] || [];
    },
    [getConversationId, autonomousConversations]
  );

  // Get topic for a specific chat context
  const getTopic = useCallback(
    (char1, char2) => {
      if (!char1 || !char2) return null;
      const conversationId = getConversationId(char1, char2);
      return autonomousTopics[conversationId] || null;
    },
    [getConversationId, autonomousTopics]
  );

  // Get message count for a specific chat context
  const getMessageCount = useCallback(
    (char1, char2) => {
      if (!char1 || !char2) return 0;
      const conversationId = getConversationId(char1, char2);
      return autonomousMessageCounts[conversationId] || 0;
    },
    [getConversationId, autonomousMessageCounts]
  );

  return {
    // State
    activeChatContexts,
    isAutonomousChatActive,
    isChatWindowOpen,
    proximityRelationships,

    // Actions
    startChat,
    stopChat,
    stopAllChats,
    sendAutonomousMessage,

    // Getters
    getChatContext,
    getConversation,
    getTopic,
    getMessageCount,

    // Constants
    MAX_AUTONOMOUS_MESSAGES,
    PROXIMITY_THRESHOLD,
  };
}
