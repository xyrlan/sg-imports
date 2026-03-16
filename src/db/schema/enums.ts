import { pgEnum } from 'drizzle-orm/pg-core';

export const systemRoleEnum = pgEnum('system_role', ['USER', 'SUPER_ADMIN', 'SUPER_ADMIN_EMPLOYEE']);
export const organizationRoleEnum = pgEnum('organization_role', [
  'OWNER',
  'ADMIN',
  'EMPLOYEE',
  'SELLER',
  'CUSTOMS_BROKER',
  'VIEWER'
]);
export const orderTypeEnum = pgEnum('order_type', ['ORDER', 'DIRECT_ORDER']);
export const quoteTypeEnum = pgEnum('quote_type', ['STANDARD', 'PROFORMA', 'SIMULATION']);
export const quoteStatusEnum = pgEnum('quote_status', ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'PENDING_SIGNATURE', 'CONVERTED']);
export const shipmentStatusEnum = pgEnum('shipment_status', ['PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'CANCELED']);
export const containerTypeEnum = pgEnum('container_type', ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40']);
export const shipmentStepEnum = pgEnum('shipment_step', ['CONTRACT_CREATION', 'MERCHANDISE_PAYMENT', 'DOCUMENT_PREPARATION', 'SHIPPING', 'DELIVERY', 'COMPLETION']);
export const shippingModalityEnum = pgEnum('shipping_modality', ['AIR', 'SEA_LCL', 'SEA_FCL', 'SEA_FCL_PARTIAL', 'EXPRESS']);
export const packagingTypeEnum = pgEnum('packaging_type', ['BOX', 'PALLET', 'BAG']);
export const expenseTypeEnum = pgEnum('expense_type', ['TAX_II', 'TAX_IPI', 'TAX_PIS', 'TAX_COFINS', 'TAX_ICMS', 'FREIGHT_INTL', 'FREIGHT_LOCAL', 'STORAGE', 'HANDLING', 'CUSTOMS_BROKER', 'OTHER']);
export const currencyEnum = pgEnum('currency', ['BRL', 'USD', 'CNY', 'EUR']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'OVERDUE', 'WAITING_EXCHANGE', 'EXCHANGED']);
export const incotermEnum = pgEnum('incoterm', ['EXW', 'FOB', 'CIF', 'DDP']);
export const transactionTypeEnum = pgEnum('transaction_type', ['MERCHANDISE', 'BALANCE', 'FREIGHT', 'TAXES', 'SERVICE_FEE']);
export const walletTransactionTypeEnum = pgEnum('wallet_transaction_type', ['CREDIT', 'DEBIT']);
export const documentTypeEnum = pgEnum('document_type', ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'IMPORT_DECLARATION', 'ORIGIN_CERTIFICATE', 'SISCOMEX_RECEIPT', 'ICMS_PROOF', 'OTHER']);
export const feeBasisEnum = pgEnum('fee_basis', ['PER_BOX', 'PER_BL', 'PER_WM', 'PER_CONTAINER']);
export const chargeTypeEnum = pgEnum('charge_type', ['PERCENTAGE', 'FIXED']);
export const difalEnum = pgEnum('difal', ['INSIDE', 'OUTSIDE']);
export const rateTypeEnum = pgEnum('rate_type', ['AFRMM', 'INTL_INSURANCE', 'CUSTOMS_BROKER_SDA', 'CONTAINER_UNSTUFFING', 'CONTAINER_WASHING', 'PIS_DEFAULT', 'COFINS_DEFAULT']);
export const rateUnitEnum = pgEnum('rate_unit', ['PERCENT', 'FIXED_BRL', 'FIXED_USD', 'PER_CONTAINER_BRL']);
export const webhookStatusEnum = pgEnum('webhook_status', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
export const freightProposalStatusEnum = pgEnum('freight_proposal_status', ['DRAFT', 'SENT', 'APPROVED', 'REJECTED']);
export const portTypeEnum = pgEnum('port_type', ['PORT', 'AIRPORT']);
export const pricingScopeEnum = pgEnum('pricing_scope', ['CARRIER', 'PORT', 'SPECIFIC']);
export const auditActionEnum = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE']);
