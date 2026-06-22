"use client";
import { useState } from "react";

interface Signup { name: string; email: string; company?: string; firstSeen: string; }
interface AdEvent { email: string; name?: string; title: string; brand?: string; style: string; scenes: number; kind: string; at: string; }

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [ads, setAds] = useState<AdEvent[]>([]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) { setErr("Wrong password."); setLoading(false); return; }
      const data = await res.json();
      setConfigured(data.configured);
      setSignups(data.signups || []);
      setAds(data.ads || []);
      setAuthed(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink p-4">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-raise p-6">
          <h1 className="font-display text-xl text-bone">AdMaker admin</h1>
          <p className="mt-1 text-sm text-muted">Enter the password to view signups and ad activity.</p>
          <input
            type="password"
            className="input mt-4"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            autoFocus
          />
          {err && <p className="mt-2 text-sm text-marker">{err}</p>}
          <button className="btn-primary mt-4 w-full justify-center" onClick={load} disabled={loading || !password}>
            {loading ? "Checking…" : "View dashboard"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-ink px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-bone">AdMaker admin</h1>
        <button className="btn-ghost" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {!configured && (
        <div className="mt-4 rounded-lg border border-marker/40 bg-marker/10 p-4 text-sm text-bone">
          Storage is not connected yet, so nothing is being recorded. Add a Vercel KV / Upstash Redis store to this
          project and redeploy. Once its env vars are present, signups and ad activity will appear here.
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-raise p-4">
          <p className="label">Signups</p>
          <p className="mt-1 font-display text-3xl text-bone">{signups.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-raise p-4">
          <p className="label">Ads created</p>
          <p className="mt-1 font-display text-3xl text-bone">{ads.length}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="label mb-2">People ({signups.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-raise text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">First seen</th>
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 && (
                <tr><td className="px-3 py-3 text-muted" colSpan={4}>No signups yet.</td></tr>
              )}
              {signups.map((s, i) => (
                <tr key={i} className="border-t border-line text-bone/90">
                  <td className="px-3 py-2">{s.name || "—"}</td>
                  <td className="px-3 py-2">{s.email}</td>
                  <td className="px-3 py-2">{s.company || "—"}</td>
                  <td className="px-3 py-2 text-muted">{fmt(s.firstSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="label mb-2">Ad activity ({ads.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-raise text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">Ad</th>
                <th className="px-3 py-2 font-medium">Brand</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Style</th>
                <th className="px-3 py-2 font-medium">Scenes</th>
              </tr>
            </thead>
            <tbody>
              {ads.length === 0 && (
                <tr><td className="px-3 py-3 text-muted" colSpan={7}>No ads created yet.</td></tr>
              )}
              {ads.map((a, i) => (
                <tr key={i} className="border-t border-line text-bone/90">
                  <td className="px-3 py-2 text-muted">{fmt(a.at)}</td>
                  <td className="px-3 py-2">{a.name || a.email}</td>
                  <td className="px-3 py-2">{a.title}</td>
                  <td className="px-3 py-2">{a.brand || "—"}</td>
                  <td className="px-3 py-2">{a.kind}</td>
                  <td className="px-3 py-2">{a.style}</td>
                  <td className="px-3 py-2">{a.scenes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
