import { db } from "@/db";
import { gameStates, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
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

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const apiKey = process.env.MOD_API_KEY;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: IncomingGameState = await req.json();
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
