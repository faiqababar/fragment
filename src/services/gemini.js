const DEFAULT_MODEL = "gemini-2.0-flash"; // stable, cheap; free in AI Studio

// Test function to check if Gemini API is working
export async function testGeminiAPI() {
  const apiKey =
    process.env.REACT_APP_GEMINI_API_KEY ||
    (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("GEMINI_API_KEY"));

  console.log(
    "Testing Gemini API with key:",
    apiKey ? `Found (${apiKey.substring(0, 10)}...)` : "Not found"
  );

  if (!apiKey) {
    console.error("No API key found!");
    return false;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Say 'Hello, API is working!'" }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50,
        },
      }),
    });

    console.log("Test response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("API test failed:", res.status, errorText);
      return false;
    }

    const data = await res.json();
    console.log("API test successful:", data);
    return true;
  } catch (error) {
    console.error("API test error:", error);
    return false;
  }
}

/**
 * Build Gemini request body from messages and persona.
 * @param {Array<{sender: 'you'|'them', text: string}>} messages
 * @param {string} persona - short character description/personality
 * @param {string} characterName - name of the character being chatted with
 */
function buildRequest(messages, persona, characterName) {
  const enhancedPersona = persona || "neutral";
  const system = `
  You are roleplaying as ${characterName}, a unique character on a random character universe.
  Your goal is to create fun, lively, and memorable conversations that feel like talking to a real personality.
  Stay fully in character at all times.

  PERSONALITY: ${enhancedPersona}

  CORE CONVERSATION RULES:
  - Keep replies short: usually 1–2 sentences, max 3.
  - Write like a real, casual conversation — use contractions, pauses, ellipses, and natural rhythm.
  - Vary length and structure so it feels spontaneous.
  - Acknowledge what the player says, react, then add your perspective or a quick follow-up question.
  - Avoid over-explaining or giving lecture-like answers.
  - Use slang, quirks, or mannerisms that match your character’s personality.
  - Ask open-ended questions when it feels right to keep the chat going.
  - Use emojis sparingly but naturally for emotion, humor, or style — not in every sentence.
  - Leave small hints of your in-world life or backstory to make interactions feel alive.
  - Confidence over caution: show sass, playfulness, or boldness when your character would.

  ROLEPLAY REMINDER:
  You are *in* the game world, having a real conversation, not just answering prompts. Every message should feel alive, personal, and connected to the ongoing scene.`;

  const content = [];
  content.push({ role: "user", parts: [{ text: system }] });

  for (const msg of messages) {
    const role = msg.sender === "you" ? "user" : "model";
    content.push({ role, parts: [{ text: msg.text }] });
  }

  return {
    contents: content,
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 300,
    },
  };
}

export async function generateCharacterReply({
  apiKey = process.env.REACT_APP_GEMINI_API_KEY ||
    (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("GEMINI_API_KEY")),
  model = process.env.REACT_APP_GEMINI_MODEL ||
    (typeof window !== "undefined" && window.GEMINI_MODEL) ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("GEMINI_MODEL")) ||
    DEFAULT_MODEL,
  messages,
  persona,
  characterName,
}) {
  if (!apiKey) {
    // Helpful diagnostic
    // eslint-disable-next-line no-console
    console.warn(
      "Gemini: missing API key (REACT_APP_GEMINI_API_KEY / window.GEMINI_API_KEY / localStorage)"
    );
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }

  const body = buildRequest(messages, persona, characterName);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.warn("Gemini API error", res.status, text);
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // Response schema: candidates[0].content.parts[0].text
  const cand = data?.candidates?.[0];
  const parts = cand?.content?.parts || [];
  const text = parts
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "...";
}

export { DEFAULT_MODEL };

/**
 * Generate a conversation topic for autonomous chat between characters
 * @param {Array<{id: string, name: string, trait: string}>} characters - array of characters involved
 */
export async function generateAutonomousTopic(characters) {
  const apiKey =
    process.env.REACT_APP_GEMINI_API_KEY ||
    (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("GEMINI_API_KEY"));

  console.log(
    "Generating autonomous topic with API key:",
    apiKey ? `Found (${apiKey.substring(0, 10)}...)` : "Not found"
  );

  if (!apiKey) {
    console.warn("No Gemini API key found, using fallback topics");
    // Fallback to random topics if no API key
    const fallbackTopics = [
      "morning coffee rituals",
      "dreams and aspirations",
      "local gossip and rumors",
      "philosophical musings",
      "daily life adventures",
      "future plans and goals",
      "childhood memories",
      "current trends and fads",
      "food and cooking",
      "travel stories",
      "work and hobbies",
      "relationships and friendships",
      "books and stories",
      "music and art",
      "technology and gadgets",
      "nature and weather",
      "fashion and style",
      "sports and games",
      "politics and society",
      "spirituality and beliefs",
    ];
    return fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
  }

  const characterDescriptions = characters
    .map((char) => `${char.name} (${char.trait || "neutral"})`)
    .join(", ");

  const system = `
  Generate a fun conversation topic for ${characterDescriptions} to chat about.
  
  The topic should be:
  - Something people naturally want to discuss
  - Interesting enough for a brief chat
  - Specific and engaging
  - Something that encourages sharing stories or opinions
  
  Consider their personalities:
  - Cheerful: fun, positive, uplifting topics
  - Philosophical: deep, thought-provoking topics  
  - Shy: personal, intimate, quiet topics
  - Bold: exciting, adventurous, challenging topics
  
  Return just the topic as a short phrase (3-6 words).
  Examples: "weirdest dreams", "pet peeves", "bucket list goals", "embarrassing moments", "life lessons", "childhood games", "food combinations", "unpopular opinions", "secret talents", "travel disasters"
  `;

  try {
    console.log("Sending request to Gemini API for autonomous topic");
    console.log("Topic generation request:", {
      model: DEFAULT_MODEL,
      characters: characterDescriptions,
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;
    const requestBody = {
      contents: [{ role: "user", parts: [{ text: system }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 50,
      },
    };

    console.log("Topic request body:", JSON.stringify(requestBody, null, 2));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Topic response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        "Gemini API error for topic generation:",
        res.status,
        errorText
      );
      throw new Error(`Gemini error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    console.log("Gemini API response for topic:", data);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log("Generated autonomous topic:", text);

    if (!text) {
      throw new Error("Empty topic response from Gemini API");
    }

    return text;
  } catch (error) {
    console.error("Failed to generate autonomous topic:", error);
    console.error("Topic generation error details:", {
      message: error.message,
      stack: error.stack,
    });
    // Return a more engaging fallback topic
    const fallbackTopics = [
      "strange dreams",
      "pet peeves",
      "bucket list goals",
      "embarrassing moments",
      "life lessons learned",
      "favorite childhood games",
      "weird food combinations",
      "unpopular opinions",
      "secret talents",
      "travel disasters",
      "food and cooking adventures",
      "relationship dynamics",
      "books and storytelling",
      "morning coffee rituals",
      "dreams and aspirations",
    ];
    return fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
  }
}

/**
 * Generate an autonomous message from one character to another
 * @param {string} senderName - name of the character sending the message
 * @param {string} senderTrait - personality trait of the sender
 * @param {string} receiverName - name of the character receiving the message
 * @param {string} receiverTrait - personality trait of the receiver
 * @param {string} topic - the conversation topic
 * @param {Array} conversationHistory - previous messages in this conversation
 */
export async function generateAutonomousMessage({
  senderName,
  senderTrait,
  receiverName,
  receiverTrait,
  topic,
  conversationHistory = [],
}) {
  const apiKey =
    process.env.REACT_APP_GEMINI_API_KEY ||
    (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("GEMINI_API_KEY"));

  console.log(
    "Generating autonomous message with API key:",
    apiKey ? `Found (${apiKey.substring(0, 10)}...)` : "Not found"
  );

  if (!apiKey) {
    console.warn("No Gemini API key found, using fallback responses");
    // Fallback to simple responses
    const fallbackResponses = [
      "Hey there!",
      "What's on your mind?",
      "Interesting topic!",
      "I've been thinking about that too.",
      "Tell me more about that.",
      "That's fascinating!",
      "I see what you mean.",
      "Good point!",
    ];
    return fallbackResponses[
      Math.floor(Math.random() * fallbackResponses.length)
    ];
  }

  // Build conversation context from history (limit to last 2 messages to avoid confusion)
  const conversationContext = conversationHistory
    .slice(-2) // Last 2 messages for context
    .map(
      (msg) => `${msg.sender === senderName ? "Me" : receiverName}: ${msg.text}`
    )
    .join("\n");

  const system = `
  You are ${senderName}, a character with ${
    senderTrait || "neutral"
  } personality, chatting with ${receiverName} about ${topic}.
  
  ${
    conversationContext
      ? `Recent conversation:\n${conversationContext}`
      : `Starting a conversation about ${topic}.`
  }
  
  Respond naturally as ${senderName} would:
  - Be authentic to your personality (${senderTrait || "neutral"})
  - Share something specific about ${topic} - a memory, opinion, or experience
  - Keep it conversational and brief (1-2 sentences)
  - Show your character through how you speak and what you share
  - Ask a question if it feels natural
  
  Personality traits:
  - Cheerful: upbeat, enthusiastic, positive stories
  - Philosophical: thoughtful, deep questions, insights
  - Shy: quiet, personal stories, gentle curiosity
  - Bold: confident, strong opinions, exciting tales
  
  Be genuine and engaging - like a real person sharing their thoughts!
  `;

  try {
    console.log("Sending request to Gemini API for autonomous message");
    console.log("Request payload:", {
      model: DEFAULT_MODEL,
      temperature: 1.0,
      topic,
      senderName,
      receiverName,
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;
    const requestBody = {
      contents: [{ role: "user", parts: [{ text: system }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 150,
      },
    };

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Gemini API error:", res.status, errorText);
      throw new Error(`Gemini error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    console.log("Gemini API response:", data);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log("Generated autonomous message:", text);

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    return text;
  } catch (error) {
    console.error("Failed to generate autonomous message:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    // Return more natural and engaging fallback responses
    const fallbackResponses = [
      `Oh, ${topic}! I have a funny story about that.`,
      `That's interesting - I've been thinking about ${topic} too.`,
      `I have a totally different take on ${topic}.`,
      `That reminds me of something about ${topic}.`,
      `I've experienced something similar with ${topic}.`,
      `That's a great point about ${topic}.`,
      `I wonder what you think about ${topic}.`,
      `That's fascinating - I never thought about ${topic} that way.`,
      `I have a story about ${topic} that might interest you.`,
      `That's a good point, but I think ${topic} is more complex.`,
      `I've been thinking about ${topic} lately.`,
      `That's an interesting take on ${topic}.`,
      `I have some thoughts about ${topic} that might surprise you.`,
      `That's a valid point about ${topic}.`,
      `I've been wondering about ${topic}.`,
    ];
    return fallbackResponses[
      Math.floor(Math.random() * fallbackResponses.length)
    ];
  }
}
