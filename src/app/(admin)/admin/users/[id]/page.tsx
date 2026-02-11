import { notFound } from 'next/navigation';
import { getProfileById, getProfileMemberships } from '@/services/admin';
import { UserEditForm } from './user-edit-form';

interface AdminUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  const { id } = await params;

  const [profile, memberships] = await Promise.all([
    getProfileById(id),
    getProfileMemberships(id),
  ]);

  if (!profile) {
    notFound();
  }

  return <UserEditForm profile={profile} memberships={memberships} />;
}
