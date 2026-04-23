import { db } from "@/db";
import { gameStates, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

interface IncomingGameState {
  runId: string;
  seed: string;
  gameStateIndex: number;
  channel: string;
  game: string;
  character: string;
  relics: string[];
  relicTipMap?: Record<string, { header: string; description: string; img?: string; type?: string }[]> | null;
}

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jwtChannel: string;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    jwtChannel = payload.channel as string;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body: IncomingGameState = await req.json();

  // Ensure the token's channel matches the claimed channel in the payload.
  if (jwtChannel !== body.channel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { runId, seed, gameStateIndex, channel, game, character, relics, relicTipMap } = body;

  await db
    .insert(runs)
    .values({ runId, seed, channel, game, character })
    .onConflictDoUpdate({
      target: runs.runId,
      set: { character, updatedAt: new Date() },
    });

  await db.insert(gameStates).values({
    runId,
    gameStateIndex,
    relics,
    relicTipMap: relicTipMap ?? null,
  });

  const run = await db.query.runs.findFirst({ where: eq(runs.runId, runId) });

  // Notify SSE subscribers for this channel.
  getChannelEmitter(channel).emit({ run: run!, relics, relicTipMap });

  return NextResponse.json({ ok: true });
}

// In-process SSE emitter — one per channel, reset on cold start.
type StatePayload = {
  run: { runId: string; seed: string; character: string };
  relics: string[];
  relicTipMap?: Record<string, unknown[]> | null;
};
type Listener = (payload: StatePayload) => void;

const emitters = new Map<string, Set<Listener>>();

export function getChannelEmitter(channel: string) {
  if (!emitters.has(channel)) emitters.set(channel, new Set());
  const listeners = emitters.get(channel)!;
  return {
    subscribe(fn: Listener) { listeners.add(fn); },
    unsubscribe(fn: Listener) { listeners.delete(fn); },
    emit(payload: StatePayload) { listeners.forEach((fn) => fn(payload)); },
  };
}
