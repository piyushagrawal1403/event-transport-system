type ServiceWorkerUpdateBannerProps = {
  isVisible: boolean;
  onRefresh: () => void | Promise<void>;
  onDismiss: () => void;
};

export default function ServiceWorkerUpdateBanner({
  isVisible,
  onRefresh,
  onDismiss,
}: ServiceWorkerUpdateBannerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-[color:var(--w-border)] bg-[color:var(--w-surface-strong)]/95 p-4 shadow-[var(--w-shadow)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--w-accent-strong)]">Update available</p>
            <p className="text-sm text-[color:var(--w-muted)]">
              A newer version of Event Transport is ready. Refresh once to load the latest changes.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={onDismiss}
              className="wedding-button-muted px-4 py-2 text-sm font-medium"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="wedding-button-primary px-4 py-2 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
