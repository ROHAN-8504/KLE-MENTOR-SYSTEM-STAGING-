import { useRecoilValue } from 'recoil';
import { cn } from '../../lib/utils';
import { sidebarOpenState, mobileSidebarOpenState } from '../../store/atoms';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const sidebarOpen = useRecoilValue(sidebarOpenState);
  const mobileSidebarOpen = useRecoilValue(mobileSidebarOpenState);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          // Desktop: adjust padding based on sidebar state
          'lg:pl-20',
          sidebarOpen && 'lg:pl-64',
          // Mobile: no left padding
          'pl-0'
        )}
      >
        <div className="p-4 md:p-6 lg:container lg:py-6">
          {children}
        </div>
      </main>
      
      {/* Mobile overlay when sidebar is open */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => {}}
        />
      )}
    </div>
  );
};
