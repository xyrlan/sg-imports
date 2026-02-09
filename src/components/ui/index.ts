// Core Components
export { AppButton } from "./button";

export { AppInput } from "./input";

export { AppTextarea } from "./textarea";

// Feedback Components
export { AppModal } from "./modal";
export type { AppModalProps } from "./modal";

export {
  StatusBadge,
  PaymentBadge,
  QuoteBadge,
  DocumentBadge,
  ExpenseBadge,
} from "./badge";
export type {
  StatusBadgeProps,
  PaymentBadgeProps,
  QuoteBadgeProps,
  DocumentBadgeProps,
  ExpenseBadgeProps,
} from "./badge";

export { AppChip } from "./chip";

export { AppSkeleton, TableSkeleton, CardSkeleton, FormSkeleton } from "./skeleton";
export type { AppSkeletonProps } from "./skeleton";
export { useOverlayState } from "@heroui/react";

// Form Components
export { AppSelect } from "./select";
export type { AppSelectProps, SelectOption } from "./select";

export { AppAutocomplete } from "./autocomplete";
export type { AppAutocompleteProps, AutocompleteOption } from "./autocomplete";
export { useFilter } from "@heroui/react";

export { AppDatePicker, isoToDateValue, formatDateBR } from "./date-picker";
export type { AppDatePickerProps } from "./date-picker";

// Data Display Components
export { AppCard } from "./card";
export type { AppCardProps } from "./card";

export { AppTabs } from "./tabs";
export type { AppTabsProps, TabItem } from "./tabs";

// DataTable (placeholder - Hero UI v3 beta 6 não tem Table nativo)
export { DataTable } from "./data-table";
export type { DataTableProps, DataTableColumn } from "./data-table";

// Types & Utils
export type {
  ShipmentStatus,
  PaymentStatus,
  QuoteStatus,
  DocumentType,
  ShipmentStep,
  ExpenseType,
  HeroUIColor,
} from "./types";

export {
  shipmentStatusColorMap,
  paymentStatusColorMap,
  quoteStatusColorMap,
  documentTypeColorMap,
  shipmentStepColorMap,
  expenseTypeColorMap,
} from "./types";
