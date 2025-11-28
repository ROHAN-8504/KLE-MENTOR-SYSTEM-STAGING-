import { useRecoilValue } from 'recoil';
import { cn } from '../../lib/utils';
import { sidebarOpenState } from '../../store/atoms';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const sidebarOpen = useRecoilValue(sidebarOpenState);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarOpen ? 'pl-64' : 'pl-20'
        )}
      >
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
};
