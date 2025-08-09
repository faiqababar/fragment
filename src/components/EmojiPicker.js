import React from "react";

const DEFAULT_EMOJIS = [
  // Smileys & Emotion
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😂",
  "🤣",
  "🥹",
  "😊",
  "😇",
  "🙂",
  "😉",
  "😍",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😜",
  "🤪",
  "🤗",
  "🤭",
  "🤫",
  "🤔",
  "🤐",
  "🤨",
  "😐",
  "😶",
  "😏",
  "🙃",
  "🫠",
  "😴",
  "🤤",
  "🥱",
  "😪",
  "😮",
  "😯",
  "😲",
  "🤯",
  "😬",
  "😵",
  "🤕",
  "🤒",
  "🤧",
  "🥳",
  "😎",
  "🤓",
  "🧐",
  "😺",
  // Gestures
  "👍",
  "👎",
  "👌",
  "🙏",
  "👏",
  "🙌",
  "💪",
  "✌️",
  "🤞",
  "🤟",
  "🤙",
  "🫶",
  "🤝",
  "✋",
  "🤚",
  "🖐️",
  "✊",
  "👊",
  "🤘",
  "🖖",
  // Hearts & symbols
  "❤️",
  "🩷",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤎",
  "🖤",
  "🤍",
  "💖",
  "💗",
  "💓",
  "💕",
  "💘",
  "💝",
  "💟",
  "❣️",
  "♥️",
  "❤️‍🔥",
  "❤️‍🩹",
  "✨",
  "⭐️",
  "🌟",
  "💫",
  "💯",
  "🔥",
  "⚡️",
  "🌈",
  "☀️",
  // Extras
  "🍀",
  "🌸",
  "🌼",
  "🌻",
  "🌹",
  "🍩",
  "🍪",
  "🍕",
  "🍔",
  "🍎",
];

export default function EmojiPicker({
  onSelect,
  emojis = DEFAULT_EMOJIS,
  className = "",
}) {
  return (
    <div
      className={`absolute z-20 right-0 top-full mt-1 w-60 max-h-64 overflow-y-auto overflow-x-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000] p-3 pr-4 pb-4 overscroll-contain scrollbar-hide ${className}`}
      role="dialog"
      aria-label="Emoji picker"
      onWheel={(e) => e.stopPropagation()}
      onWheelCapture={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
      onTouchMoveCapture={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-6 gap-2 pb-2 overscroll-contain">
        {emojis.map((e, idx) => (
          <button
            key={`${e}-${idx}`}
            type="button"
            onClick={() => onSelect && onSelect(e)}
            className="flex items-center justify-center h-8 w-8 text-[18px] leading-none rounded-none border-2 border-black hover:bg-gray-100 select-none"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
