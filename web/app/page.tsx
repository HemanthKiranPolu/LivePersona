"use client";

import { useMemo, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import type { ConnectionDetails } from "@/lib/livekit";

function SendTextBar() {
  const room = useRoomContext();
  const [text, setText] = useState("");
  const canSend = !!room;

  const send = async () => {
    if (!room) return;

    const t = text.trim();
    if (!t) return;

    // Minimal JSON for agent
    const payloadObj = { type: "user_text", text: t };
    const payload = JSON.stringify(payloadObj);
    const bytes = new TextEncoder().encode(payload);

    try {
      // ✅ Correct signature (works across livekit-client v2+)
      await room.localParticipant.publishData(bytes, { reliable: true });
      setText("");
    } catch (e) {
      console.error("publishData failed:", e);
      alert("Failed to send message. Check console.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 10, padding: 12, background: "#11111a" }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message… (avatar will speak)"
        style={{
          flex: 1,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #2a2a3a",
          background: "#0b0b0f",
          color: "#fff",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") send();
        }}
      />
      <button
        onClick={send}
        disabled={!canSend}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #2a2a3a",
          background: "#1a1a2a",
          color: canSend ? "#fff" : "#888",
          cursor: canSend ? "pointer" : "not-allowed",
          opacity: canSend ? 1 : 0.7,
        }}
      >
        Send
      </button>
    </div>
  );
}

export default function Page() {
  const [conn, setConn] = useState<ConnectionDetails | null>(null);
  const [roomName, setRoomName] = useState("demo-room");

  const identity = useMemo(
    () => `user-${Math.random().toString(16).slice(2)}`,
    []
  );

  const connect = async () => {
    try {
      const res = await fetch("/api/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, identity }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to get connection details");
      }
      if (json?.serverUrl && json?.token) {
        setConn(json);
      } else {
        throw new Error("Invalid connection details returned from server");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to join room";
      alert(msg);
    }
  };

  if (!conn) {
    return (
      <div style={{ maxWidth: 920, margin: "60px auto", padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>LivePersona</h1>
        <p style={{ opacity: 0.85 }}>
          Join a room. The agent will connect and the Tavus avatar will appear as a participant.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #2a2a3a",
              background: "#0b0b0f",
              color: "#fff",
            }}
          />
          <button
            onClick={connect}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #2a2a3a",
              background: "#1a1a2a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Join
          </button>
        </div>

        <div style={{ marginTop: 20, opacity: 0.7, fontSize: 14 }}>
          Tip: start the Python agent first, then join this room.
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <LiveKitRoom
        token={conn.token}
        serverUrl={conn.serverUrl}
        connect={true}
        video={false}
        audio={true}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        style={{ flex: 1 }}
      >
        <RoomAudioRenderer />

        <div style={{ flex: 1, overflow: "hidden" }}>
          <VideoConference />
        </div>

        <SendTextBar />
      </LiveKitRoom>
    </div>
  );
}
