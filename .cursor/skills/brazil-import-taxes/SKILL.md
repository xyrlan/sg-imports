---
name: brazil-import-taxes
description: Brazilian import tax logic (II, IPI, PIS, COFINS, ICMS) including gross-up "por dentro", customs fees (SISCOMEX, AFRMM), and PTAX conversion. Use when implementing tax calculations, NCM lookups, or any fiscal logic for Brazil imports.
---

# Brazil Import Tax Logic

## Currency Conversion (PTAX) — CRITICAL

- **All calculations must be performed in BRL.** CIF is usually in USD.
- Use the PTAX rate from the date of the "Registro da DI/DUIMP".
- Convention: `const exchangeRate = ...; // PTAX`
- Store `exchangeRate` used in every transaction.

## Tax Cascade & Math (CRITICAL)

Calculations MUST follow this exact sequence. **ICMS uses a "gross-up" (por dentro) calculation** — it is NOT a simple percentage of the sum.

### 1. II (Imposto de Importação)
- Base: CIF (in BRL)
- `II = CIF * rate_ii`

### 2. IPI (Imposto s/ Prod. Industrializados)
- Base: CIF + II (only for industrial products)
- `IPI = (CIF + II) * rate_ipi`

### 3. PIS
- Base: CIF (in BRL)
- `PIS = CIF * rate_pis`

### 4. COFINS
- Base: CIF (in BRL)
- `COFINS = CIF * rate_cofins`

### 5. ICMS (Calculado "Por Dentro")

ICMS base **includes itself**. NEVER calculate ICMS as a simple percentage of the sum.

**Formula:**
```
Sum = CIF + II + IPI + PIS + COFINS + SISCOMEX + AFRMM + Capatazia + Storage + Brokerage + Other_Fees
ICMS = (Sum / (1 - rate_icms)) * rate_icms
```

Or: `Base_ICMS = Sum / (1 - rate_icms)` then `ICMS = Base_ICMS * rate_icms`

## Additional Fees (Customs)

Importações reais almost always include:

| Fee | Description |
|-----|-------------|
| **SISCOMEX** | Fixed cost per Import Declaration (DI/DUIMP) + additions per item |
| **AFRMM** | 8% over Ocean Freight value — **sea transport only** |
| **Capatazia (THC)** | Terminal handling — add to ICMS base |
| **Storage** | Armazenagem — add to ICMS base |
| **Customs Broker** | Despachante — add to ICMS base |

Use `rateTypeEnum.AFRMM` and `globalPlatformRates` for AFRMM. SISCOMEX uses dynamic input or standard flat fee for simulations.

## NCM (Nomenclatura Comum do Mercosul)

- **Primary key** for tax logic — determines II, IPI, PIS, COFINS rates
- Store as `hsCode` in product/simulation data
- Lookup rates from TIPI or external tariff tables

## Code Conventions

Variable names in English; add Brazilian acronym in comment:

```ts
const customsValue = cifUsd * exchangeRate; // Valor CIF em BRL
const importDuty = customsValue * 0.16; // II
const industrialTax = (customsValue + importDuty) * 0.10; // IPI
const pisRate = 0.0165; // PIS
const cofinsRate = 0.076; // COFINS
const exchangeRate = 5.25; // PTAX
```

## expenseTypeEnum & Types

Project uses `expenseTypeEnum` for database mapping:

- `TAX_II`, `TAX_IPI`, `TAX_PIS`, `TAX_COFINS`, `TAX_ICMS`
- `FREIGHT_INTL`, `FREIGHT_LOCAL`, `STORAGE`, `HANDLING`, `CUSTOMS_BROKER`, `OTHER`

## TaxSnapshot Type

For simulations, use `TaxSnapshot` from `src/db/types.ts`:

```ts
type TaxSnapshot = {
  ii: number;
  ipi: number;
  pis: number;
  cofins: number;
};
```

## Date Display

- **Store:** ISO 8601 (e.g. `2025-03-11T00:00:00Z`)
- **Display:** DD/MM/YYYY for Brazilian users
