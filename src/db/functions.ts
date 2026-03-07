// ==========================================
// Product Variant Types (Alibaba/1688 compatible)
// ==========================================

import { TieredPriceInfo } from "./types";

/** Get effective price for quantity from tiered pricing; falls back to priceUsd if no tiers */
export function getPriceForQuantity(
    tieredPriceInfo: TieredPriceInfo | null | undefined,
    quantity: number,
    fallbackPrice: string
  ): string {
    if (!tieredPriceInfo || tieredPriceInfo.length === 0) return fallbackPrice;
    const sorted = [...tieredPriceInfo].sort((a, b) => b.beginAmount - a.beginAmount);
    const tier = sorted.find((t) => quantity >= t.beginAmount);
    return tier ? tier.price : fallbackPrice;
  }