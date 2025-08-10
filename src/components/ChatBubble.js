import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "./EmojiPicker";

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
  currentTopic = null,
  currentMessageCount = 0,
  maxMessages = 10,
  onRestartChat = null,
  onCloseChat = null,
  isChatActive = true,
}) {
  const messagesContainerRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isTyping]);

  const stop = (e) => e.stopPropagation();

  const isAutonomousChat = profiles.you.name !== "You";

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-10 bg-white ${
        isAutonomousChat && !isChatActive ? "opacity-90" : ""
      }`}
      onMouseDown={stop}
      onClick={stop}
      onWheel={stop}
      onTouchMove={stop}
    >
      <div className="max-w-[240px] w-[240px] bg-white border-2 border-black rounded-none shadow-[6px_6px_0_0_#000] px-3 py-2 text-left">
        {/* Autonomous chat header */}
        {isAutonomousChat && (
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-[10px] text-gray-600 font-medium">
                  {currentTopic
                    ? `Chatting about: ${currentTopic}`
                    : "Autonomous chat"}
                </div>
                <div className="text-[9px] text-gray-500">
                  Messages: {currentMessageCount}/{maxMessages}
                  {!isChatActive && currentMessageCount < maxMessages && (
                    <span className="ml-1 text-orange-600">(paused)</span>
                  )}
                </div>
              </div>
              {onCloseChat && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseChat();
                  }}
                  className="text-[10px] text-gray-500 hover:text-red-600 transition-colors"
                  title="Close chat"
                >
                  ✕
                </button>
              )}
            </div>
            {currentMessageCount >= maxMessages && (
              <div className="mt-1 text-[9px] text-gray-600">
                Conversation ended naturally
                {onRestartChat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestartChat();
                    }}
                    className="ml-2 text-[9px] bg-blue-500 text-white px-2 py-1 rounded border border-black hover:bg-blue-600 transition-colors"
                  >
                    Start New Chat
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div
          ref={messagesContainerRef}
          className="max-h-[300px] overflow-y-auto overscroll-contain space-y-2 pr-1 pb-4 scrollbar-hide"
          onWheel={(e) => {
            e.stopPropagation();
            stop(e);
          }}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            e.stopPropagation();
            stop(e);
          }}
          onTouchMoveCapture={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
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

        {/* Input field - only show if You is part of the conversation */}
        {!isAutonomousChat && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend && onSend();
            }}
            className="mt-2"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                placeholder={`Type and press Enter`}
                className="w-full min-w-0 px-2 py-1 pr-9 rounded-none border-2 border-black focus:outline-none focus:ring-0 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSend && onSend();
                  }
                }}
                onFocus={() => setShowEmoji(false)}
              />
              <button
                type="button"
                aria-label="Choose emoji"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 border-2 border-black bg-white rounded-none "
                onClick={() => setShowEmoji((s) => !s)}
              >
                <span className="flex items-center justify-center text-sm">
                  😊
                </span>
              </button>
              {showEmoji && (
                <EmojiPicker
                  className="pointer-events-auto"
                  onSelect={(emoji) => {
                    const next = `${value}${emoji}`;
                    onChange && onChange(next);
                    setShowEmoji(false);
                    // restore focus
                    try {
                      inputRef.current?.focus();
                    } catch {}
                  }}
                />
              )}
            </div>
          </form>
        )}

        {/* Message when You is not in autonomous chat */}
        {isAutonomousChat && (
          <div className="mt-2 text-[10px] text-gray-500 text-center">
            {isChatActive
              ? "Move closer to join the conversation"
              : "Chat paused - move closer to resume"}
          </div>
        )}
      </div>
    </div>
  );
}
