export default function EmptyState({ icon: Icon, title, description, footer }) {
  return (
    <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
      <div className="mx-auto mb-4 inline-flex rounded-3xl border border-white/10 bg-white/5 p-3 text-slate-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-base font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
