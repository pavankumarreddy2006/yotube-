export default function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel-surface p-5 sm:p-6 ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="section-title">{title}</h2> : null}
            {subtitle ? <p className="subtle mt-1">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
