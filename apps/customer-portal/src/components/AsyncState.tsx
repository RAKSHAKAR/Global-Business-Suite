export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500" role="status">
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
      <p className="font-semibold">This data could not be loaded</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold hover:bg-red-100"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
