const DEFAULT_MODEL = "gemini-2.0-flash"; // stable, cheap; free in AI Studio

/**
 * Build Gemini request body from messages and persona.
 * @param {Array<{sender: 'you'|'them', text: string}>} messages
 * @param {string} persona - short character description/personality
 * @param {string} characterName - name of the character being chatted with
 */
function buildRequest(messages, persona, characterName) {
  const system = `You are roleplaying as ${characterName}. Stay in character. Personality: ${
    persona || "neutral"
  }. Keep responses concise and conversational.`;

  const content = [];
  content.push({ role: "user", parts: [{ text: system }] });

  for (const msg of messages) {
    const role = msg.sender === "you" ? "user" : "model";
    content.push({ role, parts: [{ text: msg.text }] });
  }

  return {
    contents: content,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 200,
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
