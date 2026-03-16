'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { CircleCheck, CircleX, Mail, Clock, RefreshCw, LogOut, User } from 'lucide-react';
import { Card, Button, Spinner, Skeleton } from '@heroui/react';
import { createClient } from '@/lib/supabase/client';
import { getSafeRedirect } from '@/lib/safe-redirect';

type VerificationState = 'loading' | 'verifying' | 'success' | 'error' | 'waiting_for_token' | 'token_expired';
interface VerificationError { message: string; canRetry: boolean; }
interface UserInfo { email: string; name?: string; emailConfirmed: boolean; }
type TFn = ReturnType<typeof useTranslations>;

export function VerifyEmailContent() {
  const t = useTranslations('Auth.VerifyEmail');
  const tErrors = useTranslations('Auth.Errors');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<VerificationError | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [user, setUser] = useState<UserInfo | null>(null);
  const verificationAttemptedRef = useRef(false);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showLoadingUI, setShowLoadingUI] = useState(false);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    const timer = setInterval(() => { setResendCooldown((prev) => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; }); }, 1000);
    resendTimerRef.current = timer;
  }, []);

  useEffect(() => { return () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current); }; }, []);
  useEffect(() => { if (state !== 'loading') { setShowLoadingUI(false); return; } const timer = setTimeout(() => setShowLoadingUI(true), 200); return () => clearTimeout(timer); }, [state]);

  const loadUserInfo = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) { setUser({ email: supabaseUser.email || '', name: supabaseUser.user_metadata?.name, emailConfirmed: supabaseUser.email_confirmed_at !== null }); return supabaseUser; }
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    if (emailFromStorage) setUser({ email: emailFromStorage, emailConfirmed: false });
    return null;
  }, []);

  const verifyUserEmail = useCallback(async (token: string) => {
    if (verificationAttemptedRef.current || state === 'verifying') return;
    verificationAttemptedRef.current = true; setState('verifying'); setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
      if (error) { setState('error'); setError({ message: error.message === 'Token has expired or is invalid' ? tErrors('tokenInvalid') : error.message, canRetry: true }); }
      else { setState('success'); localStorage.removeItem('pendingVerificationEmail'); const nextParam = searchParams.get('next'); setTimeout(() => { router.push('/login' + (nextParam ? '?next=' + encodeURIComponent(nextParam) : '')); }, 2000); }
    } catch (error) { console.error('Verification error:', error); setState('error'); setError({ message: tErrors('connectionError'), canRetry: true }); }
  }, [state, tErrors, router]);

  const resendVerificationEmail = useCallback(async () => {
    if (!user?.email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
      if (error) setError({ message: error.message, canRetry: true }); else { startResendCooldown(); setState('waiting_for_token'); }
    } catch (error) { console.error('Resend error:', error); setError({ message: tErrors('connectionError'), canRetry: true }); }
    finally { setResendLoading(false); }
  }, [user, resendLoading, resendCooldown, startResendCooldown, tErrors]);

  const handleLogout = useCallback(async () => { const supabase = createClient(); await supabase.auth.signOut(); localStorage.removeItem('pendingVerificationEmail'); router.push('/login'); }, [router]);

  useEffect(() => {
    const init = async () => {
      const token = searchParams.get('token'); const emailFromParams = searchParams.get('email');
      if (emailFromParams) localStorage.setItem('pendingVerificationEmail', emailFromParams);
      const supabaseUser = await loadUserInfo();
      if (supabaseUser?.email_confirmed_at) { const nextParam = searchParams.get('next'); router.push(getSafeRedirect(nextParam, '/select-organization')); return; }
      if (token && !verificationAttemptedRef.current) await verifyUserEmail(token); else setState('waiting_for_token');
    };
    init();
  }, [searchParams, loadUserInfo, verifyUserEmail, router]);

  const renderContent = () => {
    switch (state) {
      case 'loading': return showLoadingUI ? <LoadingState t={t} /> : <LoadingSkeleton />;
      case 'verifying': return <VerifyingState t={t} />;
      case 'success': return <SuccessState t={t} />;
      case 'error': return <ErrorState t={t} error={error!} resendCooldown={resendCooldown} resendLoading={resendLoading} userEmail={user?.email} onResend={resendVerificationEmail} />;
      case 'waiting_for_token': return <WaitingState t={t} resendCooldown={resendCooldown} resendLoading={resendLoading} userEmail={user?.email} onResend={resendVerificationEmail} />;
      case 'token_expired': return <TokenExpiredState t={t} resendCooldown={resendCooldown} resendLoading={resendLoading} userEmail={user?.email} onResend={resendVerificationEmail} />;
      default: return <WaitingState t={t} resendCooldown={0} userEmail={user?.email} />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-6">
        {user && <UserHeader t={t} user={user} onLogout={handleLogout} />}
        {renderContent()}
      </div>
    </div>
  );
}

const UserHeader = ({ t, user, onLogout }: { t: TFn; user: UserInfo; onLogout: () => void }) => (
  <Card variant="default" className="w-full"><Card.Content>
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3"><div className="rounded-full bg-primary/20 p-2"><User className="text-primary w-4 h-4" /></div><div className="flex flex-col"><span className="text-sm font-medium text-foreground">{user.name || 'Usuário'}</span><span className="text-xs text-default-500">{user.email}</span></div></div>
      <Button variant="danger" size="sm" onClick={onLogout}><LogOut className="w-4 h-4 mr-1" />{t('userHeader.logout')}</Button>
    </div>
    {!user.emailConfirmed && (<div className="px-4 pb-4"><div className="pt-3 border-t border-default-200"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-warning" /><span className="text-xs text-default-600">{t('userHeader.pendingVerification')}</span></div></div></div>)}
  </Card.Content></Card>
);

const LoadingSkeleton = () => (<Card variant="default" className="w-full"><Card.Content><div className="flex flex-col items-center gap-4 py-8"><Skeleton className="h-12 w-12 rounded-full" /><div className="space-y-2 w-3/4"><Skeleton className="h-4 w-full rounded" /><Skeleton className="h-3 w-4/5 rounded" /></div></div></Card.Content></Card>);
const LoadingState = ({ t }: { t: TFn }) => (<Card variant="default" className="w-full"><Card.Content><div className="flex flex-col items-center justify-center gap-4 py-8"><span className="inline-flex shrink-0 size-4 items-center justify-center"><Spinner color="current" size="sm" className="size-4!" /></span><p className="text-sm text-default-500">{t('states.verifying.title')}</p></div></Card.Content></Card>);
const VerifyingState = ({ t }: { t: TFn }) => (<Card variant="default" className="w-full"><Card.Content><div className="text-center py-8 space-y-4"><span className="inline-flex shrink-0 size-4 items-center justify-center"><Spinner color="current" size="sm" className="size-4!" /></span><h1 className="text-xl font-semibold">{t('states.verifying.title')}</h1><p className="text-sm text-default-600">{t('states.verifying.description')}</p></div></Card.Content></Card>);
const SuccessState = ({ t }: { t: TFn }) => (<Card variant="default" className="w-full"><Card.Content><div className="text-center py-8 space-y-4"><div className="flex justify-center"><div className="rounded-full bg-success/20 p-4"><CircleCheck className="text-success" size={48} /></div></div><h1 className="text-xl font-semibold text-success">{t('states.verified.title')}</h1><p className="text-sm text-default-600">{t('states.verified.description')}</p><div className="flex items-center justify-center gap-2 text-xs text-default-500 mt-2"><Spinner size="sm" /><span>{t('states.verified.redirecting')}</span></div></div></Card.Content></Card>);

function ResendBtn({ t, onResend, resendLoading, resendCooldown }: { t: TFn; onResend?: () => void; resendLoading?: boolean; resendCooldown: number }) {
  if (!onResend) return null;
  return (<Button variant="primary" isDisabled={resendCooldown > 0 || resendLoading} onClick={onResend} className="w-full">
    {resendLoading ? 'Carregando...' : resendCooldown > 0 ? (<><RefreshCw className="w-4 h-4 mr-2" />{t('resendButton.waiting', { seconds: resendCooldown })}</>) : (<><RefreshCw className="w-4 h-4 mr-2" />{t('resendButton.ready')}</>)}
  </Button>);
}
function EmailDisplay({ email }: { email?: string }) { if (!email) return null; return (<div className="text-xs text-default-500 bg-default-100 p-3 rounded-lg mt-2"><Mail className="inline w-4 h-4 mr-1" />{email}</div>); }

const ErrorState = ({ t, error, onResend, resendLoading, resendCooldown, userEmail }: { t: TFn; error: VerificationError; onResend?: () => void; resendLoading?: boolean; resendCooldown: number; userEmail?: string }) => (
  <Card variant="default" className="w-full"><Card.Content><div className="text-center py-8 space-y-4"><div className="flex justify-center"><div className="rounded-full bg-danger/20 p-4"><CircleX className="text-danger" size={48} /></div></div><h1 className="text-xl font-semibold text-danger">{t('states.error.title')}</h1><p className="text-sm text-default-600">{error.message}</p><EmailDisplay email={userEmail} />{error.canRetry && onResend && (<div className="space-y-3 mt-4"><p className="text-sm text-default-600">{t('states.error.canRetry')}</p><ResendBtn t={t} onResend={onResend} resendLoading={resendLoading} resendCooldown={resendCooldown} /></div>)}</div></Card.Content></Card>
);

interface WaitingProps { t: TFn; userEmail?: string; onResend?: () => void; resendLoading?: boolean; resendCooldown: number; }
const WaitingState = ({ t, userEmail, onResend, resendLoading, resendCooldown }: WaitingProps) => (
  <Card variant="default" className="w-full"><Card.Content><div className="text-center py-8 space-y-4"><div className="flex justify-center"><div className="rounded-full bg-primary/20 p-4"><Mail className="text-primary" size={48} /></div></div><h1 className="text-xl font-semibold">{t('states.waiting.title')}</h1><p className="text-sm text-default-600">{t('description')}</p><EmailDisplay email={userEmail} /><div className="space-y-3 mt-4"><p className="text-xs text-default-500">{t('states.waiting.noReceived')}</p><ResendBtn t={t} onResend={onResend} resendLoading={resendLoading} resendCooldown={resendCooldown} /></div></div></Card.Content></Card>
);
const TokenExpiredState = ({ t, userEmail, onResend, resendLoading, resendCooldown }: WaitingProps) => (
  <Card variant="default" className="w-full"><Card.Content><div className="text-center py-8 space-y-4"><div className="flex justify-center"><div className="rounded-full bg-warning/20 p-4"><Clock className="text-warning" size={48} /></div></div><h1 className="text-xl font-semibold text-warning">{t('states.tokenExpired.title')}</h1><p className="text-sm text-default-600">{t('states.tokenExpired.description')}</p><EmailDisplay email={userEmail} /><div className="space-y-3 mt-4"><p className="text-xs text-default-500">{t('states.tokenExpired.checkInbox')}</p><ResendBtn t={t} onResend={onResend} resendLoading={resendLoading} resendCooldown={resendCooldown} /></div></div></Card.Content></Card>
);
