'use client';

import { useTranslations } from 'next-intl';
import { Button, Card } from '@heroui/react';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import type { Terminal } from '@/services/admin';

interface TerminalsSectionProps {
  terminals: Terminal[];
}

export function TerminalsSection({ terminals }: TerminalsSectionProps) {
  const t = useTranslations('Admin.Settings');

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-2">{t('Terminals.title')}</h2>
      <p className="text-sm text-muted mb-4">{t('Terminals.description')}</p>
      <div className="flex justify-between items-center mb-4">
        <Link href="/admin/settings/terminals/new">
          <Button variant="primary">
            <Plus className="size-4" />
            {t('Terminals.addTerminal')}
          </Button>
        </Link>
      </div>
      {terminals.length === 0 ? (
        <p className="text-muted">{t('Terminals.noTerminals')}</p>
      ) : (
        <ul className="space-y-2">
          {terminals.map((term) => (
            <li
              key={term.id}
              className="flex items-center justify-between p-3 rounded-lg bg-default-100"
            >
              <div>
                <span className="font-medium">{term.name}</span>
                {term.code && (
                  <span className="text-sm text-muted ml-2">({term.code})</span>
                )}
              </div>
              <Link href={`/admin/settings/terminals/${term.id}`}>
                <Button size="sm" variant="secondary">
                  <Pencil className="size-4" />
                  {t('Terminals.edit')}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
