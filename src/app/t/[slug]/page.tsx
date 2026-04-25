import { redirect } from 'next/navigation';

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * Tenant root URL — superseded by the dashboard sidebar + settings hub.
 *
 * This file used to render its own card-grid settings page, but after the
 * dashboard chrome was rebranded the dashboard's `/settings` route is the
 * canonical hub. Keeping a second hub here meant tenant-level settings
 * breadcrumbs ("← Settings") landed on a chromeless page that looked like
 * a navigation glitch. Now `/t/{slug}` just sends staff to the dashboard
 * overview, the same place every other login flow lands.
 */
export default async function TenantHomePage({ params }: Params) {
  const { slug } = await params;
  redirect(`/t/${slug}/overview`);
}
