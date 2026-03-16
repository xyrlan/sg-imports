import { Suspense } from 'react';
import { VerifyEmailContent } from './components/verify-email-content';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
