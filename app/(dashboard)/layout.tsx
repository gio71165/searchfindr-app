import { Sidebar } from '@/components/layout/Sidebar';
import { Navigation } from '@/components/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
