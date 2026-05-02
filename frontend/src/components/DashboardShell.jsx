export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-10 h-52 w-52 rounded-full bg-highlight/15 blur-3xl" />
        <div className="absolute right-[-3rem] top-36 h-72 w-72 animate-float rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
    </div>
  );
}
