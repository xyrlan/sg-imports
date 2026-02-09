import type { 
  shipmentStatusEnum,
  paymentStatusEnum,
  quoteStatusEnum,
  documentTypeEnum,
  shipmentStepEnum,
  expenseTypeEnum
} from "@/db/schema";

// Extrair tipos dos enums do Drizzle
export type ShipmentStatus = typeof shipmentStatusEnum.enumValues[number];
export type PaymentStatus = typeof paymentStatusEnum.enumValues[number];
export type QuoteStatus = typeof quoteStatusEnum.enumValues[number];
export type DocumentType = typeof documentTypeEnum.enumValues[number];
export type ShipmentStep = typeof shipmentStepEnum.enumValues[number];
export type ExpenseType = typeof expenseTypeEnum.enumValues[number];

// Cores do Hero UI v3 (Chip)
export type HeroUIColor = 
  | "default" 
  | "accent"
  | "success" 
  | "warning" 
  | "danger";

// Mapeamento de status de embarque para cores
export const shipmentStatusColorMap: Record<ShipmentStatus, HeroUIColor> = {
  PENDING: "default",
  PRODUCTION: "accent",
  BOOKED: "accent",
  IN_TRANSIT: "accent",
  CUSTOMS_CLEARANCE: "warning",
  RELEASED: "success",
  DELIVERED: "success",
  CANCELED: "danger",
};

// Mapeamento de status de pagamento para cores
export const paymentStatusColorMap: Record<PaymentStatus, HeroUIColor> = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  WAITING_EXCHANGE: "default",
  EXCHANGED: "success",
};

// Mapeamento de status de cotação para cores
export const quoteStatusColorMap: Record<QuoteStatus, HeroUIColor> = {
  DRAFT: "default",
  SENT: "accent",
  APPROVED: "success",
  REJECTED: "danger",
  CONVERTED: "success",
};

// Mapeamento de etapas de embarque para cores
export const shipmentStepColorMap: Record<ShipmentStep, HeroUIColor> = {
  CONTRACT_CREATION: "default",
  MERCHANDISE_PAYMENT: "warning",
  DOCUMENT_PREPARATION: "accent",
  SHIPPING: "accent",
  DELIVERY: "accent",
  COMPLETION: "success",
};

// Mapeamento de tipos de documento (usado em chips/badges)
export const documentTypeColorMap: Record<DocumentType, HeroUIColor> = {
  COMMERCIAL_INVOICE: "accent",
  PACKING_LIST: "accent",
  BILL_OF_LADING: "accent",
  IMPORT_DECLARATION: "warning",
  ORIGIN_CERTIFICATE: "success",
  SISCOMEX_RECEIPT: "warning",
  ICMS_PROOF: "success",
  OTHER: "default",
};

// Mapeamento de tipos de despesa para cores
export const expenseTypeColorMap: Record<ExpenseType, HeroUIColor> = {
  TAX_II: "danger",
  TAX_IPI: "danger",
  TAX_PIS: "danger",
  TAX_COFINS: "danger",
  TAX_ICMS: "danger",
  FREIGHT_INTL: "accent",
  FREIGHT_LOCAL: "accent",
  STORAGE: "warning",
  HANDLING: "accent",
  CUSTOMS_BROKER: "accent",
  OTHER: "default",
};
