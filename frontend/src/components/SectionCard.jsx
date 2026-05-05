export function SectionCard({ title, description, actions, children }) {
  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-white">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
