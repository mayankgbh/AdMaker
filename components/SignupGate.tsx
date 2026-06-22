"use client";
import { useEffect, useState } from "react";
import { loadIdentity, saveIdentity, track, type Identity } from "@/lib/client";

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

export default function SignupGate({ onReady }: { onReady?: (id: Identity) => void }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    const existing = loadIdentity();
    if (existing?.email) onReady?.(existing);
    else setShow(true);
  }, [onReady]);

  if (!show) return null;

  function submit() {
    if (!isEmail(email) || !name.trim()) return;
    const id: Identity = { name: name.trim(), email: email.trim(), company: company.trim() || undefined };
    saveIdentity(id);
    track({ type: "signup", ...id });
    onReady?.(id);
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-raise p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-marker">Built by Gather</p>
        <h2 className="mt-2 font-display text-2xl text-bone">Make an ad in minutes.</h2>
        <p className="mt-1 text-sm text-muted">
          Tell us who you are and start building. We are Gather, a primary research platform, and we like
          knowing who is creating with our tools.
        </p>
        <div className="mt-5 space-y-2.5">
          <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          <input className="input" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <button
          className="btn-primary mt-4 w-full justify-center"
          onClick={submit}
          disabled={!isEmail(email) || !name.trim()}
        >
          Start building
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">
          Your API keys stay in your browser. This just tells us your name and email.
        </p>
      </div>
    </div>
  );
}
