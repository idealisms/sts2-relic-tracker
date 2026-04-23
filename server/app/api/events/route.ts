import { getChannelEmitter } from "@/app/api/game-state/route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel");
  if (!channel) {
    return new Response("Missing channel", { status: 400 });
  }

  const emitter = getChannelEmitter(channel);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected" });

      const listener = (payload: unknown) => send({ type: "state", payload });
      emitter.subscribe(listener as Parameters<typeof emitter.subscribe>[0]);

      req.signal.addEventListener("abort", () => {
        emitter.unsubscribe(listener as Parameters<typeof emitter.unsubscribe>[0]);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
