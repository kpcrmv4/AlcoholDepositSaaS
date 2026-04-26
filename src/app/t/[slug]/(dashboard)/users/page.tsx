import { redirect } from 'next/navigation';

/**
 * Legacy `/t/{slug}/users` list page — superseded by `/settings/users` which
 * merges invite + direct-create flows. The deeper page `/users/[id]/permissions`
 * still exists; only the list view was deduplicated.
 */
export default async function LegacyUsersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/t/${slug}/settings/users`);
}
