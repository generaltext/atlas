import { AtlasMark } from './AtlasMark'

// Shown when the app is opened standalone (deployed site, no General Text shell).
// Offers a local in-browser demo workspace.
export function MissingRuntime({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--fg)] text-[var(--bg)]">
          <AtlasMark size={28} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Atlas</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">
          A master view of your projects, clients, and how the work connects — plus living reports
          you can share. Atlas runs inside General Text; open it there to use your own workspace.
        </p>
        <button
          onClick={onTryDemo}
          className="mt-6 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Try the demo
        </button>
        <p className="mt-3 font-mono-x text-[11px] text-[var(--faint)]">
          Loads a sample studio in a local, in-browser workspace.
        </p>
      </div>
    </div>
  )
}
