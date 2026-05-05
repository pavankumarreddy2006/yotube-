import { SectionCard } from "../components/SectionCard";

export default function SettingsPage({ dashboard }) {
  const { config, configLoading, language, status } = dashboard;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Application Settings" description="Backend-served runtime configuration from `/config`.">
        <div className="space-y-4">
          <SettingRow label="Default language" value={config?.defaultLanguageLabel || (language === "en" ? "English" : "Telugu")} />
          <SettingRow label="Daily run time" value={config?.dailyRunTime || "Not configured"} />
          <SettingRow label="Daily runner" value={config?.dailyRunnerEnabled ? "Enabled" : "Disabled"} />
          <SettingRow label="Available languages" value={(config?.languages || []).map((item) => item.label).join(", ") || "Telugu, English"} />
        </div>
        {configLoading ? <p className="mt-4 text-sm text-slate-400">Loading configuration...</p> : null}
      </SectionCard>

      <SectionCard title="Current Runtime State" description="Live operational values from `/status`, aligned with the dashboard state.">
        <div className="space-y-4">
          <SettingRow label="Status" value={status?.statusLabel || "Idle"} />
          <SettingRow label="Current task" value={status?.currentTask || "Waiting for next run"} />
          <SettingRow label="Language" value={status?.languageLabel || (language === "en" ? "English" : "Telugu")} />
          <SettingRow label="Last run time" value={status?.lastRunTimeLabel || "Never"} />
        </div>
      </SectionCard>
    </div>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
