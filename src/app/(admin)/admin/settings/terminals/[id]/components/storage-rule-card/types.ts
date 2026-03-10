import type { StorageRule, StoragePeriod } from '@/services/admin';

export interface StorageRuleWithPeriods extends StorageRule {
  periods: StoragePeriod[];
}
