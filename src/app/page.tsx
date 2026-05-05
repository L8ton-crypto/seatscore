"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, AlertTriangle, ArrowRight, FileSpreadsheet, Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [costPounds, setCostPounds] = useState<string>("24.70");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function submit() {
    if (!file) {
      setError("Pick a CSV first");
      return;
    }
    const cost = Math.round(parseFloat(costPounds || "0") * 100);
    if (!Number.isFinite(cost) || cost <= 0) {
      setError("Cost per seat must be a positive number");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("license_cost_pence", String(cost));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      router.push(`/r/${json.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-blue-400" />
          <span>SeatScore</span>
        </div>
        <a
          href="https://github.com/L8ton-crypto"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          By L8
        </a>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-10 pb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          20M paid Copilot seats. 30%+ are dormant.
        </div>

        <h1 className="text-balance text-5xl font-bold leading-tight md:text-6xl">
          Find the <span className="gradient-text">dormant Copilot seats</span> burning your budget
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-zinc-400">
          Upload your Microsoft 365 admin centre licence usage export. Get a one-page report of who is paying for what,
          who is not using it, and the GBP per month wasted. 30 seconds, no signup, no Graph API setup.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Pill icon={<FileSpreadsheet className="h-4 w-4" />} text="CSV from Admin Center" />
          <Pill icon={<Shield className="h-4 w-4" />} text="No tenant access. Ever." />
          <Pill icon={<Sparkles className="h-4 w-4" />} text="Score in 30 seconds" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="card rounded-2xl p-8">
          <h2 className="mb-1 text-xl font-semibold">Upload your licence CSV</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Microsoft 365 admin centre: Reports {">"} Usage {">"} Microsoft 365 Copilot {">"} Export. Or any CSV with
            UserPrincipalName, JobTitle, and a last-activity column.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            className={
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors " +
              (dragOver
                ? "border-blue-400 bg-blue-500/5"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")
            }
          >
            <Upload className="mb-3 h-8 w-8 text-zinc-400" />
            <div className="mb-1 text-sm">
              {file ? (
                <span className="font-medium text-zinc-200">{file.name}</span>
              ) : (
                <span className="text-zinc-300">Drop your CSV here</span>
              )}
            </div>
            <div className="text-xs text-zinc-500">{file ? "Ready" : "or click to browse"}</div>
            <label className="mt-4 cursor-pointer">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <span className="btn-secondary inline-block rounded-lg px-4 py-2 text-sm">
                Choose file
              </span>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">Cost per seat per month</span>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 focus-within:border-blue-400/50">
                <span className="text-zinc-500">GBP</span>
                <input
                  value={costPounds}
                  onChange={(e) => setCostPounds(e.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                  placeholder="24.70"
                />
              </div>
              <span className="mt-1 block text-xs text-zinc-500">
                M365 Copilot list price is GBP 24.70. ChatGPT Enterprise tends to be GBP 40-60.
              </span>
            </label>

            <div className="flex items-end justify-end">
              <button
                onClick={submit}
                disabled={busy || !file}
                className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Scoring..." : "Score my seats"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{error}</div>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Files are parsed in your session. Only the seat-level scoring output is stored, keyed to a private link.
          We never publish your data and have no access to your tenant.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Dormant detection" body="Anyone with no activity in the last 30 days, or whose last-activity column is empty." />
          <Card title="Role-fit scoring" body="Job titles unlikely to benefit (warehouse, frontline, drivers) get flagged for reassignment." />
          <Card title="Wasted spend" body="Multiplies dormant + wrong-role seats by your cost per seat. Surfaces the GBP/month number." />
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-500">
        Built by L8. Free tool, no signup. Consulting at GBP 1500-3000/day if you want help acting on the report.
      </footer>
    </main>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-zinc-300">
      {icon}
      {text}
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="card card-hover rounded-xl p-5">
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <div className="text-sm text-zinc-400">{body}</div>
    </div>
  );
}
