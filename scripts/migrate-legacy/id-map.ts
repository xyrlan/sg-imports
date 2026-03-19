export class IdMap {
  private maps = new Map<string, Map<string, string>>();

  set(entity: string, oldId: string, newId: string) {
    if (!this.maps.has(entity)) this.maps.set(entity, new Map());
    this.maps.get(entity)!.set(oldId, newId);
  }

  get(entity: string, oldId: string | null | undefined): string | null {
    if (!oldId) return null;
    return this.maps.get(entity)?.get(oldId) ?? null;
  }

  getRequired(entity: string, oldId: string): string {
    const newId = this.get(entity, oldId);
    if (!newId) throw new Error(`ID not found for ${entity}: ${oldId}`);
    return newId;
  }

  count(entity: string): number {
    return this.maps.get(entity)?.size ?? 0;
  }
}

export interface PhaseResult {
  phase: string;
  tables: { name: string; migrated: number; skipped: number; errors: string[] }[];
}
