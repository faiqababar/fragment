import React, { useEffect, useRef } from "react";

export default function ChatBubble({
  messages = [],
  value = "",
  onChange,
  onSend,
}) {
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-10"
      onMouseDown={stop}
      onClick={stop}
      onWheel={stop}
      onTouchMove={stop}
    >
      <div className="max-w-[240px] w-[240px] bg-white border-2 border-black rounded-none shadow-[6px_6px_0_0_#000] px-3 py-2 text-left">
        <div
          ref={messagesContainerRef}
          className="max-h-36 overflow-y-auto overscroll-contain space-y-1 pr-1 pb-4"
          onWheel={stop}
          onTouchMove={stop}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={m.sender === "you" ? "text-right" : "text-left"}
            >
              <span
                className={
                  m.sender === "you"
                    ? "inline-block px-2 py-1 rounded-none border-2 border-black bg-blue-500 text-white text-[11px] leading-tight"
                    : "inline-block px-2 py-1 rounded-none border-2 border-black bg-white text-[11px] leading-tight"
                }
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend && onSend();
          }}
          className="mt-2"
        >
          <input
            type="text"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            placeholder={`Type and press Enter`}
            className="w-full min-w-0 px-2 py-1 rounded-none border-2 border-black focus:outline-none focus:ring-0 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSend && onSend();
              }
            }}
          />
        </form>
      </div>
      <div className="flex items-center justify-center mt-1 gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-white border-2 border-black" />
        <span className="inline-block w-2 h-2 bg-white border-2 border-black" />
        <span className="inline-block w-2.5 h-2.5 bg-white border-2 border-black" />
      </div>
    </div>
  );
}
