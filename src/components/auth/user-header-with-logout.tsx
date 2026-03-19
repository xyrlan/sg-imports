'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, User } from 'lucide-react';
import { Card, Button } from '@heroui/react';
import { createClient } from '@/lib/supabase/client';

export interface UserHeaderWithLogoutProps {
  email: string;
  name?: string | null;
  /** Max width class - defaults to max-w-md for create-organization/verify-email */
  maxWidth?: 'max-w-md' | 'max-w-2xl' | 'max-w-6xl';
  /** Compact mode - reduces padding for onboarding */
  compact?: boolean;
}

/**
 * Reusable header with user info and logout button.
 * Used in verify-email, create-organization, and onboarding pages.
 */
export function UserHeaderWithLogout({ email, name, maxWidth = 'max-w-md', compact = false }: UserHeaderWithLogoutProps) {
  const t = useTranslations('Auth.userHeader');
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <Card variant="secondary" className={`w-full ${maxWidth} shadow-md border border-border/50`}>
      <Card.Content>
        <div className={`flex items-center justify-between ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <User className="text-primary w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {name || t('userLabel')}
              </span>
              <span className="text-xs text-muted">{email}</span>
            </div>
          </div>

          <Button variant="danger" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" />
            {t('logout')}
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
