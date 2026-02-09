'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppCard } from '@/components/ui/card';
import { AppButton } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

/**
 * Email Verification Page
 * Displayed after user registration
 * Allows resending verification email
 */
export default function VerifyEmailPage() {
  const t = useTranslations('Auth.VerifyEmail');
  const tErrors = useTranslations('Auth.Errors');
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailFromParams = searchParams.get('email');
    const emailFromStorage = typeof window !== 'undefined' ? localStorage.getItem('pendingVerificationEmail') : null;
    
    if (emailFromParams) {
      setEmail(emailFromParams);
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingVerificationEmail', emailFromParams);
      }
    } else if (emailFromStorage) {
      setEmail(emailFromStorage);
    }
  }, [searchParams]);

  const handleResendEmail = async () => {
    if (!email) {
      setResendError(tErrors('invalidEmail'));
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setResendError(error.message);
      } else {
        setResendSuccess(true);
      }
    } catch {
      setResendError(tErrors('resendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <AppCard className="w-full max-w-md p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('description')}
        </p>

        {/* Success Message */}
        {resendSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('success')}
            </p>
          </div>
        )}

        {/* Error Message */}
        {resendError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{resendError}</p>
          </div>
        )}

        {/* Check Spam Reminder */}
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          {t('checkSpam')}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {email && (
            <AppButton
              variant="primary"
              className="w-full"
              onClick={handleResendEmail}
              isLoading={isResending}
              size="lg"
            >
              {t('resend')}
            </AppButton>
          )}

          <Link href="/login">
            <AppButton
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t('backToLogin')}
            </AppButton>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {t('footer')}
          </p>
        </div>
      </AppCard>
    </div>
  );
}
