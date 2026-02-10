'use server';

import { MailtrapClient } from 'mailtrap';
import { renderEmailTemplate } from '@/services/email-templates.service';

// Mailtrap configuration
const MAILTRAP_API_KEY = process.env.MAILTRAP_API_KEY!;
const SENDER_EMAIL = process.env.MAILTRAP_SENDER_EMAIL || 'noreply@soulglobal.com.br';
const SENDER_NAME = process.env.MAILTRAP_SENDER_NAME || 'SoulGlobal';

// Initialize Mailtrap client
const mailtrapClient = new MailtrapClient({
  token: MAILTRAP_API_KEY,
});

// Simple in-memory rate limiter (per email address)
// In production, use Redis or a proper rate limiting solution
const emailRateLimiter = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if email is rate limited
 * Allows 3 emails per 5 minutes per recipient
 */
function isRateLimited(email: string): boolean {
  const now = Date.now();
  const limit = emailRateLimiter.get(email);

  // Clean up expired entries
  if (limit && now > limit.resetAt) {
    emailRateLimiter.delete(email);
    return false;
  }

  // Check if limit is reached
  if (limit && limit.count >= 3) {
    console.warn(`⚠️ Rate limit exceeded for ${email}. Limit resets at ${new Date(limit.resetAt).toISOString()}`);
    return true;
  }

  return false;
}

/**
 * Record email send attempt
 */
function recordEmailSend(email: string): void {
  const now = Date.now();
  const resetAt = now + 5 * 60 * 1000; // 5 minutes

  const limit = emailRateLimiter.get(email);
  if (limit) {
    limit.count += 1;
  } else {
    emailRateLimiter.set(email, { count: 1, resetAt });
  }
}

/**
 * Base email sender interface
 */
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Mailtrap API
 * @internal Base function for sending emails
 */
async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  try {
    // Check rate limit
    if (isRateLimited(to)) {
      console.warn(`⚠️ Email to ${to} skipped due to rate limiting`);
      return false;
    }

    await mailtrapClient.send({
      from: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [{ email: to }],
      subject,
      html,
      text: text || subject, // Fallback to subject if no text provided
      category: 'Transactional', // For Mailtrap analytics
    });

    // Record successful send
    recordEmailSend(to);

    console.log(`✅ Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Log error but don't throw - email failures should not block operations
    return false;
  }
}

/**
 * Send welcome email after user completes onboarding
 * @param to - Recipient email address
 * @param fullName - User's full name
 * @param role - User's role (OWNER, SELLER, etc.)
 */
export async function sendWelcomeEmail(
  to: string,
  fullName: string,
  role: string
): Promise<boolean> {
  try {
    const html = renderEmailTemplate('welcome-email', {
      fullName,
      email: to,
      role,
      year: new Date().getFullYear().toString(),
    });

    return await sendEmail({
      to,
      subject: 'Bem-vindo à SoulGlobal!',
      html,
      text: `Olá ${fullName}, sua conta foi ativada com sucesso!`,
    });
  } catch (error) {
    console.error('❌ Error preparing welcome email:', error);
    return false;
  }
}

/**
 * Send notification email (generic transactional email)
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content
 * @param text - Plain text content (optional)
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  try {
    return await sendEmail({
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    return false;
  }
}
