'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, Button, Chip } from '@heroui/react';
import { ArrowLeft, LogIn, UserPlus, Link2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PublicQuoteData } from '@/services/quote-workflow.service';
import { linkQuoteToClientOrganizationAction } from '../actions';

interface PublicQuoteViewProps {
  data: PublicQuoteData;
  publicToken: string;
  user: { id: string; email: string | null } | null;
  userOrganizations: { id: string; name: string }[];
}

export function PublicQuoteView({
  data,
  publicToken,
  user,
  userOrganizations,
}: PublicQuoteViewProps) {
  const t = useTranslations('Quote.Public');
  const tStatus = useTranslations('Simulations.Status');
  const [state, formAction, isPending] = useActionState(
    linkQuoteToClientOrganizationAction,
    null
  );

  const clientEmail = data.quote.clientEmail?.toLowerCase().trim();
  const userEmail = user?.email?.toLowerCase().trim();
  const emailMatches = !!clientEmail && !!userEmail && clientEmail === userEmail;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" />
              {t('back')}
            </Button>
          </Link>
          <Chip size="sm" color="default" variant="soft">
            {tStatus(data.quote.status as 'SENT')}
          </Chip>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{data.quote.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('fromSeller', { name: data.quote.sellerOrganizationName })}
          </p>
        </div>

        {data.quote.isRecalculationNeeded && (
          <div className="rounded-lg border border-warning bg-warning/10 px-4 py-3">
            <p className="text-sm font-medium text-warning-foreground">
              {t('staleMessage')}
            </p>
          </div>
        )}

        <Card>
          <Card.Header>
            <Card.Title>{t('items')}</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">{t('product')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('sku')}</th>
                    <th className="px-4 py-2 text-right font-medium">{t('qty')}</th>
                    <th className="px-4 py-2 text-right font-medium">{t('unitPrice')}</th>
                    <th className="px-4 py-2 text-right font-medium">{t('totalBrl')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.sku ?? '—'}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(Number(item.priceUsd), 'en-US', 'USD')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(Number(item.landedCostTotalSnapshot), 'pt-BR', 'BRL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>{t('summary')}</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('totalFobUsd')}</span>
              <span>{formatCurrency(data.summary.totalFobUsd, 'en-US', 'USD')}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>{t('totalLandedCostBrl')}</span>
              <span>{formatCurrency(data.summary.totalLandedCostBrl, 'pt-BR', 'BRL')}</span>
            </div>
          </Card.Content>
        </Card>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="font-semibold">{t('nextSteps')}</h2>

          {!user ? (
            <div className="flex flex-wrap gap-3">
              <Link href={`/login?next=/quote/${publicToken}`}>
                <Button variant="primary" className="inline-flex items-center gap-2">
                  <LogIn className="size-4" />
                  {t('login')}
                </Button>
              </Link>
              <Link href={`/register/owner?next=/quote/${publicToken}`}>
                <Button variant="outline" className="inline-flex items-center gap-2">
                  <UserPlus className="size-4" />
                  {t('createAccount')}
                </Button>
              </Link>
            </div>
          ) : !emailMatches ? (
            <p className="text-sm text-muted-foreground">{t('emailMismatch')}</p>
          ) : userOrganizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noOrganization')}</p>
          ) : (
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="quoteId" value={data.quote.id} />
              <input type="hidden" name="publicToken" value={publicToken} />
              {userOrganizations.length === 1 ? (
                <input
                  type="hidden"
                  name="clientOrganizationId"
                  value={userOrganizations[0].id}
                />
              ) : (
                <div className="space-y-2">
                  <label htmlFor="clientOrganizationId" className="text-sm font-medium">
                    {t('selectOrganization')}
                  </label>
                  <select
                    id="clientOrganizationId"
                    name="clientOrganizationId"
                    required
                    aria-describedby={state?.error ? 'clientOrg-error' : undefined}
                    aria-invalid={!!state?.error}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t('selectOrganizationPlaceholder')}</option>
                    {userOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {state?.error && (
                <p id="clientOrg-error" className="text-sm text-danger" role="alert">
                  {state.error}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                isDisabled={isPending}
                isPending={isPending}
                className="inline-flex items-center gap-2 self-start"
              >
                <Link2 className="size-4" />
                {t('linkToMyOrganization')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
