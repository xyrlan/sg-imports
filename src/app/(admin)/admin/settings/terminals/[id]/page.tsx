import { notFound } from 'next/navigation';
import { getTerminalWithRules } from '@/services/admin';
import { TerminalEditForm } from './terminal-edit-form';

interface TerminalEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TerminalEditPage({ params }: TerminalEditPageProps) {
  const { id } = await params;
  const terminal = await getTerminalWithRules(id);
  if (!terminal) notFound();
  return (
    <div className="max-w-4xl">
      <TerminalEditForm terminal={terminal} />
    </div>
  );
}
