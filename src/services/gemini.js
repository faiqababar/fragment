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
