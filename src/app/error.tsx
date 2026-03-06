'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, Button } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations('Error');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card variant="default" className="w-full max-w-md">
        <Card.Content className="p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/20 p-4">
                <AlertTriangle className="text-danger" size={48} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t('title')}
              </h1>
              <p className="text-sm text-muted">
                {t('description')}
              </p>
              {process.env.NODE_ENV === 'development' && error.message && (
                <p className="mt-3 text-xs text-muted font-mono bg-muted/20 p-3 rounded-lg break-all">
                  {error.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" onClick={reset} className="w-full" size="lg">
                {t('tryAgain')}
              </Button>
              <Link href="/login">
                <Button variant="outline" className="w-full" size="lg">
                  {t('backHome')}
                </Button>
              </Link>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
