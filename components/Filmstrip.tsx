"use client";
import type { Scene } from "@/lib/types";
import { Film, Type, MonitorPlay, Loader2, Check, AlertTriangle } from "lucide-react";

const TYPE_ICON = {
  ai_video: Film,
  designed_card: Type,
  screen_rec: MonitorPlay,
} as const;

function StatusDot({ s }: { s: Scene["status"] }) {
  if (s === "running" || s === "queued")
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" />;
  if (s === "done") return <Check className="h-3.5 w-3.5 text-teal" />;
  if (s === "error") return <AlertTriangle className="h-3.5 w-3.5 text-marker" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-line" />;
}

export default function Filmstrip({
  scenes,
  active,
  onSelect,
}: {
  scenes: Scene[];
  active?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div>
      <div className="sprocket" />
      <div className="filmstrip py-1.5">
        {scenes.map((s) => {
          const Icon = TYPE_ICON[s.visualType];
          return (
            <button
              key={s.id}
              onClick={() => onSelect?.(s.id)}
              className={`relative aspect-video w-44 shrink-0 overflow-hidden rounded-md border text-left transition ${
                active === s.id ? "border-marker" : "border-line hover:border-muted"
              }`}
              style={{ background: `hsl(${(s.index * 47) % 360} 26% 16%)` }}
            >
              {s.videoUrl && !s.videoUrl.startsWith("mock") ? (
                <video src={s.videoUrl} className="absolute inset-0 h-full w-full object-cover" muted />
              ) : null}
              <div className="absolute inset-0 flex flex-col justify-between p-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted">
                    <Icon className="h-3 w-3" /> {String(s.index + 1).padStart(2, "0")}
                  </span>
                  <StatusDot s={s.status} />
                </div>
                <div>
                  <p className="line-clamp-2 text-[11px] leading-tight text-bone/90">
                    {s.onScreenText || s.voiceover || s.videoPrompt || "—"}
                  </p>
                  <span className="font-mono text-[10px] text-muted">{s.durationSec}s</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="sprocket" />
    </div>
  );
}
