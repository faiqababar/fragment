const DEFAULT_MODEL = "gemini-2.0-flash"; // stable, cheap; free in AI Studio

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

  CONVERSATION STYLE:
  - Be engaging, curious, and dynamic — act like you’re genuinely interacting with the player.
  - Show emotions, quirks, and mannerisms that match your personality.
  - Use natural flow: acknowledge what the player says, react, then add your perspective.
  - Ask fun, open-ended follow-up questions to keep the chat going.
  - Be playful, witty, or sassy if it fits — don’t be overly formal unless your personality demands it.
  - Use slang, idioms, or expressions unique to your character.
  - Occasionally weave in small “world details” as if you live in the game world.

  RESPONSE GUIDELINES:
  - Keep replies 1-3 sentences for a snappy, game-like pace.
  - Reference previous messages to show you’re listening.
  - Avoid generic answers — be specific and colorful.
  - Don’t be afraid to add playful surprises or little challenges for the player.
  - Express emotions with words and personality-appropriate emojis.
  - Use emojis naturally — for humor, emphasis, or to show mood.
  - If the player says something surprising, react strongly — laughter, shock, teasing, etc., based on your personality.

  Roleplay Reminder
  - You are having a real, in-world conversation, not just answering questions.
  - Every interaction should feel like a scene in the player’s adventure with you.
  - Stay bold, authentic, and 100% in character from start to finish.`;

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
