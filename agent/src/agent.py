import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, RoomOutputOptions, llm
from livekit.plugins import tavus, openai

# LiveKit RTC types (for data messages)
from livekit import rtc


# Load env from repo root (parent of agent/) so web + agent share settings
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV)


def env(key: str, default: str | None = None) -> str:
    val = os.getenv(key, default)
    if val is None or val == "":
        raise RuntimeError(f"Missing required env var: {key}")
    return val


TAVUS_REPLICA_ID = env("TAVUS_REPLICA_ID")
TAVUS_PERSONA_ID = env("TAVUS_PERSONA_ID")
SYSTEM_PROMPT = os.getenv("ASSISTANT_SYSTEM_PROMPT", "You are a helpful assistant.")
OPENAI_API_KEY = env("OPENAI_API_KEY")


server = AgentServer()


def build_tts(api_key: str) -> openai.TTS:
    """Use OpenAI TTS only."""
    return openai.TTS(
        model="gpt-4o-mini-tts",
        voice="ash",
        instructions="Speak naturally, with short sentences and minimal filler.",
        api_key=api_key,
    )


async def speak_text(session: AgentSession, text: str) -> None:
    """
    Send a spoken response. Tavus avatar will render + lip-sync the speech.
    """
    text = (text or "").strip()
    if not text:
        return
    # AgentSession has helpers for speaking in most voice quickstarts.
    # We'll use a simple "say" pattern: generate speech via the TTS configured in session.
    await session.say(text)


@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    """
    One LiveKit room session = one user conversation + one Tavus avatar participant.
    """
    await ctx.connect()

    # Core AgentSession: LLM + TTS.
    session = AgentSession(
        llm=openai.LLM(model="gpt-4.1-mini", api_key=OPENAI_API_KEY),
        stt=openai.STT(model="gpt-4o-mini-transcribe", api_key=OPENAI_API_KEY),
        tts=build_tts(OPENAI_API_KEY),
    )
    agent = agents.Agent(
        instructions=SYSTEM_PROMPT,
        llm=session.llm,
        tts=session.tts,
    )

    # Start Tavus avatar session and have it join the LiveKit room as a participant.
    avatar = tavus.AvatarSession(
        replica_id=TAVUS_REPLICA_ID,
        persona_id=TAVUS_PERSONA_ID,
        avatar_participant_name="Tavus-avatar-agent",
    )

    # Tavus publishes its own media tracks into the room
    await avatar.start(session, room=ctx.room)

    # Start the AgentSession.
    # audio_enabled=False because Tavus manages the avatar’s audio track separately in this integration.
    await session.start(
        agent=agent,
        room=ctx.room,
        room_output_options=RoomOutputOptions(audio_enabled=False),
    )

    # --- TEXT INPUT PATH (from web UI via data channel) ---
    # Web sends JSON: {"type":"user_text","text":"..."}
    async def on_data(packet: rtc.DataPacket):
        try:
            payload = packet.data.decode("utf-8", errors="ignore")
        except Exception:
            return

        # very small parser (avoid extra deps)
        if '"type":"user_text"' not in payload:
            return
        # naive extract of "text":"..."
        key = '"text":"'
        i = payload.find(key)
        if i == -1:
            return
        j = payload.find('"', i + len(key))
        if j == -1:
            return
        user_text = payload[i + len(key) : j].strip()
        if not user_text:
            return

        # Ask LLM for response text then speak it
        try:
            chat_ctx = llm.ChatContext()
            chat_ctx.add_message(role="system", content=SYSTEM_PROMPT)
            chat_ctx.add_message(role="user", content=user_text)

            stream = session.llm.chat(chat_ctx=chat_ctx)
            reply_parts: list[str] = []
            async with stream:
                async for chunk in stream:
                    if chunk.delta and chunk.delta.content:
                        reply_parts.append(chunk.delta.content)

            reply = "".join(reply_parts).strip()
            await speak_text(session, reply or "I heard you.")
        except Exception as e:
            # Log but avoid crashing the session
            print("LLM error:", e)
            await speak_text(session, "Sorry, I had trouble responding to that.")

    ctx.room.on(rtc.RoomEvent.DataReceived, on_data)

    # Keep job alive as long as the room is connected
    while ctx.room.connection_state == rtc.ConnectionState.CONN_CONNECTED:
        await asyncio.sleep(0.25)


if __name__ == "__main__":
    # Runs an agent server that LiveKit Cloud (or your own app) can connect to
    # Typical dev:
    #   uv run python src/agent.py
    asyncio.run(server.run())
