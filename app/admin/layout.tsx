import { AdminTopBar } from '@/components/AdminTopBar';
import { AdminTabs } from '@/components/admin/AdminTabs';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminTopBar />
      <AdminTabs />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </>
  );
}
