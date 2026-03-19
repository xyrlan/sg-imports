import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const WEBHOOK_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED',
};

export async function runPhase08(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '08-system', tables: [] };

  // --- notifications ---
  {
    const rows = await legacy`SELECT * FROM "Notification"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const profileId = idMap.get('user', r.userId);
      if (!profileId) { skipped++; continue; }
      const isRead = r.status === 'COMPLETED' || r.status === 'APPROVED';
      try {
        await target`
          INSERT INTO notifications (id, profile_id, title, message, type, read, created_at)
          VALUES (gen_random_uuid(), ${profileId}, ${'Notificacao migrada'}, ${r.message}, 'INFO', ${isRead}, ${r.timestamp})`;
        migrated++;
      } catch (e: any) { errors.push(`Notification ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'notifications', migrated, skipped, errors });
    console.log(`  [notifications] migrated: ${migrated}, skipped: ${skipped}`);
  }

  // --- webhookEvents ---
  {
    const rows = await legacy`SELECT * FROM "WebhookEvent"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        await target`
          INSERT INTO webhook_events (id, provider, event_type, external_id, payload, status, attempts, last_error, processed_at, created_at, updated_at)
          VALUES (gen_random_uuid(), ${r.provider}, ${r.eventType}, ${r.externalId}, ${JSON.stringify(r.payload)}, ${WEBHOOK_STATUS_MAP[r.status] ?? 'PENDING'}, ${r.attempts}, ${r.lastError}, ${r.processedAt}, ${r.createdAt}, ${r.updatedAt ?? new Date()})
          ON CONFLICT (provider, external_id, event_type) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`WebhookEvent ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'webhookEvents', migrated, skipped: 0, errors });
    console.log(`  [webhookEvents] migrated: ${migrated}, errors: ${errors.length}`);
  }

  return result;
}
