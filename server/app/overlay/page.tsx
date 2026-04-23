"use client";

import { useEffect, useState } from "react";

interface StatePayload {
  run: { runId: string; seed: string; character: string };
  relics: string[];
}

export default function OverlayPage() {
  const [state, setState] = useState<StatePayload | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channel = params.get("channel");
    if (!channel) return;

    const es = new EventSource(`/api/events?channel=${encodeURIComponent(channel)}`);
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") setState(msg.payload);
    };
    return () => es.close();
  }, []);

  if (!state) return null;

  return (
    <div className="p-2 text-white text-sm">
      <div className="font-bold mb-1">{state.run.character}</div>
      <ul className="space-y-0.5">
        {state.relics.map((relic) => (
          <li key={relic}>{relic}</li>
        ))}
      </ul>
    </div>
  );
}
