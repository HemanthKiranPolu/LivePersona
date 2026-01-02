# LivePersona

LiveKit + Tavus avatar demo with a Python agent (LLM/STT/TTS) and a Next.js web client.

## Prerequisites
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- LiveKit Cloud project (API key/secret + ws URL)
- Tavus replica/persona with available conversational credits
- OpenAI API key (used for LLM, STT, and TTS)

## Setup
1) Copy `.env` from the repo root and fill:
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL`
   - `OPENAI_API_KEY`
   - `TAVUS_API_KEY`, `TAVUS_REPLICA_ID`, `TAVUS_PERSONA_ID`
2) Install agent deps:
   ```bash
   cd agent
   uv sync
   ```
3) Install web deps:
   ```bash
   cd web
   npm install
   ```

## Run
Terminal 1 (agent):
```bash
cd agent
uv run python src/agent.py
```

Terminal 2 (web UI):
```bash
cd web
npm run dev
# open http://localhost:3000
```

Join a room in the UI; the agent connects and the Tavus avatar joins as a participant. Use the chat input or your mic (STT enabled) and the avatar will speak back.

## Troubleshooting
- Avatar missing with `402` in `/tmp/agent.log`: Tavus account is out of conversational credits; top up or disable the Tavus avatar.
- Cannot join room: ensure LiveKit env vars are set in `.env` (and `web/.env.local` if overriding).
- No responses: verify `OPENAI_API_KEY` is set and the agent is running.
