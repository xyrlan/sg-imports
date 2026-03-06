import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, Button } from '@heroui/react';
import { FileQuestion } from 'lucide-react';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card variant="default" className="w-full max-w-md">
        <Card.Content className="p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted/20 p-4">
                <FileQuestion className="text-muted" size={48} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t('title')}
              </h1>
              <p className="text-sm text-muted">
                {t('description')}
              </p>
            </div>
            <Link href="/login">
              <Button variant="primary" className="w-full" size="lg">
                {t('backHome')}
              </Button>
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
