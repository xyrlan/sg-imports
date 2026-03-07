'use client';

import { useRouter } from 'next/navigation';
import { Button, Dropdown, Spinner } from '@heroui/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useOrganizationState } from '@/contexts/organization-context';
import { useNotifications } from '@/hooks/use-notifications';

function formatRelativeTime(
  date: Date,
  t: (key: string, values?: Record<string, number>) => string
): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('timeNow');
  if (diffMins < 60) return t('timeMinutes', { count: diffMins });
  if (diffHours < 24) return t('timeHours', { count: diffHours });
  if (diffDays < 7) return t('timeDays', { count: diffDays });
  return date.toLocaleDateString();
}

function getTypeColor(
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
): 'default' | 'warning' | 'success' | 'danger' {
  switch (type) {
    case 'WARNING':
      return 'warning';
    case 'SUCCESS':
      return 'success';
    case 'ERROR':
      return 'danger';
    case 'INFO':
    default:
      return 'default';
  }
}

export function NotificationBell() {
  const t = useTranslations('Navbar.Notifications');
  const router = useRouter();
  const { profile } = useOrganizationState();
  const profileId = profile?.id;

  const {
    unreadCount,
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(profileId);

  if (!profileId) return null;

  const handleNotificationClick = (actionUrl: string | null, id: string) => {
    if (actionUrl) {
      router.push(actionUrl);
    }
    markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        className="relative flex items-center justify-center p-2 rounded-lg hover:bg-default-100 transition-colors outline-none min-w-10 min-h-10"
        aria-label={
          unreadCount > 0
            ? t('ariaLabelUnread', { count: unreadCount })
            : t('ariaLabel')
        }
      >
        <Bell className="w-5 h-5 text-foreground" aria-hidden />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-danger-foreground px-1"
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className="min-w-80 max-w-sm">
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('title')}</h3>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onPress={handleMarkAllAsRead}
                aria-label={t('markAllAsRead')}
                className="gap-1.5"
              >
                <CheckCheck className="w-4 h-4 shrink-0" />
                {t('markAllAsRead')}
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              {t('empty')}
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((n) => {
                const createdAt =
                  n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt);
                const typeColor = getTypeColor(n.type ?? 'INFO');

                return (
                  <button
                    key={n.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-default-100 transition-colors border-b border-default-100 last:border-b-0 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                    onClick={() => handleNotificationClick(n.actionUrl, n.id)}
                    aria-label={`${n.title}: ${n.message}`}
                  >
                    <div className="flex gap-2">
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          typeColor === 'danger'
                            ? 'bg-danger'
                            : typeColor === 'warning'
                              ? 'bg-warning'
                              : typeColor === 'success'
                                ? 'bg-success'
                                : 'bg-default-400'
                        }`}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            !n.read ? 'text-foreground' : 'text-muted'
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-muted line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {formatRelativeTime(createdAt, t)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
