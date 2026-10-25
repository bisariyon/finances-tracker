export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/50 text-sm mt-0.5">Manage your preferences and data</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-(--card-bg) divide-y divide-white/10">
        <div className="p-5">
          <h3 className="text-white font-semibold mb-1">Currency</h3>
          <p className="text-white/50 text-sm">Indian Rupee (₹ INR)</p>
        </div>
        <div className="p-5">
          <h3 className="text-white font-semibold mb-1">Export Data</h3>
          <p className="text-white/50 text-sm mb-3">Download all your transactions as a CSV file.</p>
          <a href="/api/export" className="inline-flex px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm rounded-xl font-medium transition-colors">
            Export CSV
          </a>
        </div>
        <div className="p-5">
          <h3 className="font-semibold mb-1 text-rose-400">Danger Zone</h3>
          <p className="text-white/50 text-sm mb-3">Permanently delete all your data.</p>
          <button className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm rounded-xl font-medium border border-rose-500/20 transition-colors">
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );
}
