/**
 * Asaas Payment Gateway Client
 * @see https://docs.asaas.com/reference
 */
import { timingSafeEqual } from 'crypto';

const BASE_URL = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3';
const API_KEY = process.env.ASAAS_API_KEY;

function getAuthHeaders(): HeadersInit {
  if (!API_KEY) throw new Error('ASAAS_API_KEY is not configured');
  return {
    'access_token': API_KEY,
    'Content-Type': 'application/json',
  };
}

export interface CreatePaymentInput {
  customer: string;
  billingType: 'BOLETO' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopiaECola?: string;
}

export type CreatePaymentResult =
  | { success: true; payment: AsaasPayment }
  | { success: false; error: string };

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  if (!API_KEY) {
    return { success: false, error: 'Asaas is not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `Asaas API error ${res.status}: ${body}` };
    }

    const payment = (await res.json()) as AsaasPayment;
    return { success: true, payment };
  } catch (error) {
    return { success: false, error: `Failed to connect to Asaas: ${error}` };
  }
}

export async function cancelPayment(paymentId: string): Promise<boolean> {
  if (!API_KEY) return false;

  try {
    const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ==========================================
// Customer Management
// ==========================================

export interface CreateCustomerInput {
  name: string;
  email?: string;
  cpfCnpj: string;
  phone?: string;
  company?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export type CreateCustomerResult =
  | { success: true; customer: AsaasCustomer }
  | { success: false; error: string };

export async function createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult> {
  if (!API_KEY) {
    return { success: false, error: 'Asaas is not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `Asaas API error ${res.status}: ${body}` };
    }

    const customer = (await res.json()) as AsaasCustomer;
    return { success: true, customer };
  } catch (error) {
    return { success: false, error: `Failed to connect to Asaas: ${error}` };
  }
}

export async function getCustomer(customerId: string): Promise<AsaasCustomer | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) return null;

    return (await res.json()) as AsaasCustomer;
  } catch {
    return null;
  }
}

export function validateWebhookToken(token: string): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) return false;
  if (token.length !== expectedToken.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
