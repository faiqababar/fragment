import React from "react";
import ChatBubble from "./ChatBubble";

export default function AvatarNode({ data }) {
  return (
    <div className="relative text-center select-none">
      {data.showChatBubble && (
        <ChatBubble
          messages={data.messages || []}
          value={data.chatInput || ""}
          onChange={data.onChatInputChange}
          onSend={data.onSend}
          profiles={data.chatProfiles}
          isTyping={data.isTyping}
        />
      )}
      <img
        src={data.avatar}
        alt={data.label}
        width={60}
        height={60}
        className="rounded-full border border-black"
        style={{ background: data.backgroundColor }}
      />
      <div>{data.label}</div>
    </div>
  );
}
