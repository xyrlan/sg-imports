// Evolution API configuration
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

const isConfigured = Boolean(EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE_NAME);

// Simple in-memory rate limiter (per phone number)
// Note: best-effort only — does not persist across serverless cold starts or instances
const phoneRateLimiter = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const limit = phoneRateLimiter.get(phone);

  if (limit && now > limit.resetAt) {
    phoneRateLimiter.delete(phone);
    return false;
  }

  if (limit && limit.count >= 3) {
    console.warn(`Rate limit exceeded for phone ${phone}. Resets at ${new Date(limit.resetAt).toISOString()}`);
    return true;
  }

  return false;
}

function recordSend(phone: string): void {
  const now = Date.now();
  const resetAt = now + 5 * 60 * 1000; // 5 minutes

  const limit = phoneRateLimiter.get(phone);
  if (limit) {
    limit.count += 1;
  } else {
    phoneRateLimiter.set(phone, { count: 1, resetAt });
  }
}

/**
 * Normalize phone number to E.164-like format for Brazil.
 * Strips non-digits, prepends 55 if needed. Result: e.g. 5511999999999
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

/**
 * Send a text message via Evolution API.
 */
async function sendWhatsAppMessage(number: string, text: string): Promise<boolean> {
  if (!isConfigured) {
    console.warn('WhatsApp (Evolution API) not configured — skipping message');
    return false;
  }

  const normalized = normalizePhone(number);

  if (isRateLimited(normalized)) {
    console.warn(`WhatsApp message to ${normalized} skipped due to rate limiting`);
    return false;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY!,
      },
      body: JSON.stringify({
        number: normalized,
        text,
      }),
    });

    if (!response.ok) {
      console.error('WhatsApp send failed:', response.status, await response.text().catch(() => ''));
      return false;
    }

    recordSend(normalized);
    return true;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}

/**
 * Send quote link via WhatsApp.
 */
export async function sendQuoteLinkWhatsApp(
  phone: string,
  quoteName: string,
  quoteLink: string,
  sellerName: string,
  quoteId?: string
): Promise<boolean> {
  const { getTranslations } = await import('next-intl/server');
  const t = await getTranslations('Simulations.Workflow');

  const text = [
    t('whatsappGreeting', { sellerName, quoteName }),
    '',
    t('whatsappLink', { quoteLink }),
    '',
    '— SoulGlobal',
  ].join('\n');

  const sent = await sendWhatsAppMessage(phone, text);

  if (!sent && quoteId) {
    console.warn('WhatsApp message failed for quote', quoteId);
  }

  return sent;
}
