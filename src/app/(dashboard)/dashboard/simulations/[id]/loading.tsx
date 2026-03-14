import { Card } from '@heroui/react';

export default function SimulationDetailLoading() {
  return (
    <div className="mx-auto p-6 ">
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-9 w-24 rounded-lg bg-default-200" />
            <div className="space-y-2">
              <div className="h-8 w-64 rounded bg-default-200" />
              <div className="h-4 w-32 rounded bg-default-200" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-default-200" />
            <div className="h-9 w-36 rounded-lg bg-default-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_550px] gap-6 lg:gap-8">
          <div className="space-y-6 min-w-0">
            <Card className="p-6">
              <Card.Content className="space-y-4">
                <div className="h-4 w-24 rounded bg-default-200" />
                <div className="h-5 w-40 rounded bg-default-200" />
              </Card.Content>
            </Card>
            <Card>
              <Card.Header>
                <div className="h-5 w-32 rounded bg-default-200" />
              </Card.Header>
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-4 flex-1 rounded bg-default-200" />
                    <div className="h-4 w-16 rounded bg-default-200" />
                    <div className="h-4 w-20 rounded bg-default-200" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card className="p-6">
              <Card.Header className="px-0 pt-0">
                <div className="h-6 w-40 rounded bg-default-200" />
              </Card.Header>
              <Card.Content className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 flex items-center gap-3">
                    <div className="size-5 rounded bg-default-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-24 rounded bg-default-200" />
                      <div className="h-5 w-20 rounded bg-default-200" />
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
