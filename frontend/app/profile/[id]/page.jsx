'use client';
import { useParams } from 'next/navigation';
import AccountAdministration from '@/components/features/accounts/AccountAdministration';
export default function ManagedProfile() {
  const { id } = useParams();
  return <AccountAdministration accountId={id} />;
}
