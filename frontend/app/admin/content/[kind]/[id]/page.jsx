'use client';
import { useParams } from 'next/navigation';
import ContentAdministration from '@/components/features/admin/ContentAdministration';
export default function ContentReview() {
  const { kind, id } = useParams();
  return <ContentAdministration kind={kind} id={id} />;
}
