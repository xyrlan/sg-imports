---
name: inngest-workflow
description: Expert guidance for Inngest.js implementation: durable execution, event-driven patterns, step.run, step.invoke, step.waitForEvent, step.sleep. Use when adding workflows, background jobs, or async sagas.
---

# Inngest Expert Patterns

## Core Constraints (Mandatory)

- **Zero Side Effects in Root:** NO `db.update`, `fetch`, or `email.send` outside of `step.run`.
- **Deterministic Logic:** Code outside `step.run` must be deterministic. Avoid `Math.random()` or `new Date()` outside steps.
- **Naming:** Step IDs must be slug-cased and descriptive (e.g., `upsert-user-db`, `wait-for-signature`).
- **NEVER use `setTimeout` or `setInterval`.** Use `step.sleep` instead.
- **NEVER call other Inngest functions directly.** Use `step.invoke`.

## Client Setup

```ts
import { inngest } from "@/inngest/client";
```

## Register Functions

Add functions to `src/app/api/inngest/route.ts`:

```ts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [myFunction],
});
```

## Implementation Patterns

### 1. Side Effects → `step.run`

All side effects (DB, API calls, mutations) **must** be inside `step.run`:

```ts
const result = await step.run("fetch-data", async () => {
  return await db.query(...);
});
```

### 2. Flow Control

**Delays:** Use `step.sleep`, never `setTimeout`:

```ts
await step.sleep("cooldown-before-retry", "1h");
```

**Call another function:** Use `step.invoke`, never direct function calls:

```ts
await step.invoke("process-payment", {
  function: processPaymentFn,
  data: { orderId: event.data.orderId },
});
```

### 3. Intelligent Waiting → `step.waitForEvent`

For waiting (ZapSign signature, payment confirmation, etc.). **Always use `match`** to prevent event hijacking between different users/entities:

```ts
await step.waitForEvent("wait-signature", {
  event: "zapsign/signed",
  match: "data.documentId", // CRITICAL: Must match the trigger event data
  timeout: "7d",
});
```

### 4. Modularization → `step.invoke`

Use `step.invoke` for complex sub-flows to keep functions small:

```ts
await step.invoke("process-payment", {
  function: processPaymentFn,
  data: { orderId: event.data.orderId },
});
```

### 5. Idempotency

All steps must be idempotent. Use `ON CONFLICT DO NOTHING` or equivalent:

```sql
INSERT INTO ... VALUES (...)
ON CONFLICT (id) DO NOTHING;
```

### 6. Concurrency

Limit by `shipmentId` or `organizationId` to prevent race conditions:

```ts
inngest.createFunction(
  {
    id: "process-shipment",
    concurrency: {
      limit: 1,
      key: "event.data.shipmentId",
    },
  },
  ...
);
```

### 7. Failure Handling

- For critical operations, always define `retries` in `createFunction`.
- Use `step.run` to wrap specific blocks that might fail — each step retries independently.

```ts
inngest.createFunction(
  {
    id: "process-order",
    retries: 5,
    concurrency: { limit: 1, key: "event.data.organizationId" },
  },
  { event: "order/created" },
  async ({ event, step }) => {
    const result = await step.run("charge-payment", async () => {
      // If this fails, only this step retries
      return await chargePayment(event.data.orderId);
    });
    return result;
  }
);
```

### 8. Batching (Optimization)

For high-volume events (logs, analytics, telemetry):

```ts
inngest.createFunction(
  {
    id: "handle-telemetry",
    batchEvents: { maxSize: 100, timeout: "5s" },
  },
  { event: "device/telemetry" },
  async ({ events, step }) => {
    await step.run("process-batch", async () => {
      return processBatch(events);
    });
  }
);
```

### 9. Middleware & Context

- When using database clients, prefer accessing them via a shared middleware context if available.
- Always check for `event.user.id` or similar metadata for auditing inside steps.

## Function Structure

```ts
const myFunction = inngest.createFunction(
  {
    id: "unique-function-id",
    retries: 3,
    concurrency: { limit: 1, key: "event.data.organizationId" },
  },
  { event: "domain/action" },
  async ({ event, step }) => {
    const data = await step.run("step-name", async () => {
      return await someSideEffect();
    });
    return data;
  }
);
```
