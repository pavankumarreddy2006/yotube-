import {
  ActivitySquare,
  FileText,
  LayoutDashboard,
  Newspaper,
  Settings,
  Sparkles
} from "lucide-react";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "News", icon: Newspaper },
  { label: "Script Generator", icon: Sparkles },
  { label: "Logs", icon: FileText },
  { label: "Settings", icon: Settings }
];

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040b16] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(88,116,255,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(45,212,191,0.10),transparent_30%)]" />
        <div className="absolute left-[8%] top-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-[10%] top-24 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-white/[0.04] backdrop-blur-2xl xl:block">
          <div className="flex h-full flex-col px-6 py-7">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.95),rgba(45,212,191,0.85),rgba(139,92,246,0.9))] shadow-[0_18px_40px_rgba(56,189,248,0.28)]">
                  <Sparkles className="h-6 w-6 text-slate-950" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Automation OS</p>
                  <h1 className="font-display text-lg font-semibold text-white">Sports Studio</h1>
                </div>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {navigation.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-cyan-300" : ""}`} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.12),rgba(15,23,42,0.35))] p-5">
              <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/10 p-2 text-cyan-200">
                <ActivitySquare className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-semibold text-white">Live control room</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Monitor your content pipeline, spin up new automation runs, and keep every sports update moving.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
