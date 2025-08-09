import React, { useEffect, useRef } from "react";

export default function ChatBubble({
  messages = [],
  value = "",
  onChange,
  onSend,
  profiles = {
    you: { name: "You", avatar: null },
    them: { name: "", avatar: null },
  },
  isTyping = false,
}) {
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isTyping]);

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-10 bg-white"
      onMouseDown={stop}
      onClick={stop}
      onWheel={stop}
      onTouchMove={stop}
    >
      <div className="max-w-[240px] w-[240px] bg-white border-2 border-black rounded-none shadow-[6px_6px_0_0_#000] px-3 py-2 text-left">
        <div
          ref={messagesContainerRef}
          className="max-h-[300px] overflow-y-auto overscroll-contain space-y-2 pr-1 pb-4"
          onWheel={stop}
          onTouchMove={stop}
        >
          {messages.map((m, idx) => {
            const isYou = m.sender === "you";
            const profile = isYou ? profiles.you : profiles.them;
            const name = profile?.name || (isYou ? "You" : "");
            const avatar = profile?.avatar || null;
            const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
            const bgStyle = profile?.backgroundColor
              ? { background: profile.backgroundColor }
              : {};
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 ${
                  isYou ? "justify-end" : "justify-start"
                }`}
              >
                {!isYou && (
                  <div className="flex flex-col items-center min-w-[22px]">
                    <div
                      className="w-5 h-5 rounded-full border border-black overflow-hidden grid place-items-center"
                      style={bgStyle}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px]">{initial}</span>
                      )}
                    </div>
                  </div>
                )}
                <div
                  className={`${
                    isYou ? "items-end" : "items-start"
                  } flex flex-col max-w-[180px]`}
                >
                  <div className="text-[10px] leading-none mb-0.5 text-gray-600">
                    {name}
                  </div>
                  <span
                    className={
                      isYou
                        ? "inline-block px-2 py-1 rounded-none border-2 border-black bg-blue-500 text-white text-[11px] leading-tight"
                        : "inline-block px-2 py-1 rounded-none border-2 border-black bg-white text-[11px] leading-tight"
                    }
                  >
                    {m.text}
                  </span>
                </div>
                {isYou && (
                  <div className="flex flex-col items-center min-w-[22px]">
                    <div
                      className="w-5 h-5 rounded-full border border-black overflow-hidden grid place-items-center"
                      style={bgStyle}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px]">{initial}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && (
            <div className="flex items-start gap-2 justify-start">
              <div className="flex flex-col items-center min-w-[22px]">
                <div
                  className="w-5 h-5 rounded-full border border-black overflow-hidden grid place-items-center"
                  style={
                    profiles.them?.backgroundColor
                      ? { background: profiles.them.backgroundColor }
                      : {}
                  }
                >
                  {profiles.them?.avatar ? (
                    <img
                      src={profiles.them.avatar}
                      alt={profiles.them?.name || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px]">
                      {(profiles.them?.name || "?")
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </span>
                  )}
                </div>
              </div>
              <div className="items-start flex flex-col max-w-[180px]">
                <div className="text-[10px] leading-none mb-0.5 text-gray-600">
                  {profiles.them?.name || ""}
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border-2 border-black bg-white">
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse" />
                  <span
                    className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          )}
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
