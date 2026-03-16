export default function ProposalsLoading() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6 animate-pulse">
        <div className="mb-6 space-y-2">
          <div className="h-8 w-64 rounded bg-default-200" />
          <div className="h-4 w-96 rounded bg-default-200" />
        </div>

        <div className="space-y-4">
          <div className="h-5 w-48 rounded bg-default-200" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-default-200" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-default-200" />
                  <div className="h-3 w-28 rounded bg-default-200" />
                </div>
              </div>
              <div className="h-8 w-28 rounded-lg bg-default-200" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="h-5 w-32 rounded bg-default-200" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 flex-1 rounded bg-default-200" />
              <div className="h-4 w-24 rounded bg-default-200" />
              <div className="h-4 w-20 rounded bg-default-200" />
              <div className="h-4 w-16 rounded bg-default-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
