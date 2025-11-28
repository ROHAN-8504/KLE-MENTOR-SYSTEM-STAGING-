import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  Users,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  LayoutDashboard,
  UserCircle,
  BookOpen,
  ClipboardList,
  BarChart,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { sidebarOpenState, userState } from '../../store/atoms';
import { Avatar } from '../ui/Avatar';
import { getFullName } from '../../lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Groups', href: '/admin/groups', icon: UserCircle },
  { title: 'Meetings', href: '/admin/meetings', icon: Calendar },
  { title: 'Posts', href: '/admin/posts', icon: FileText },
  { title: 'Chat', href: '/admin/chat', icon: MessageSquare },
  { title: 'Reports', href: '/admin/reports', icon: BarChart },
  { title: 'Activity Logs', href: '/admin/logs', icon: ClipboardList },
  { title: 'Admin Management', href: '/admin/admin-management', icon: Shield },
];

const mentorNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/mentor/dashboard', icon: LayoutDashboard },
  { title: 'My Groups', href: '/mentor/groups', icon: Users },
  { title: 'Meetings', href: '/mentor/meetings', icon: Calendar },
  { title: 'Posts', href: '/mentor/posts', icon: FileText },
  { title: 'Chat', href: '/mentor/chat', icon: MessageSquare },
  { title: 'Interactions', href: '/mentor/interactions', icon: BookOpen },
];

const studentNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { title: 'My Mentor', href: '/student/mentor', icon: UserCircle },
  { title: 'Meetings', href: '/student/meetings', icon: Calendar },
  { title: 'Attendance', href: '/student/attendance', icon: ClipboardList },
  { title: 'Posts', href: '/student/posts', icon: FileText },
  { title: 'Chat', href: '/student/chat', icon: MessageSquare },
  { title: 'Academics', href: '/student/academics', icon: BookOpen },
  { title: 'Interactions', href: '/student/interactions', icon: Users },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const user = useRecoilValue(userState);
  const [isOpen, setIsOpen] = useRecoilState(sidebarOpenState);

  const navItems = user?.role === 'admin'
    ? adminNavItems
    : user?.role === 'mentor'
    ? mentorNavItems
    : studentNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {isOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">K</span>
              </div>
              <span className="font-semibold text-lg">KLE Mentor</span>
            </Link>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', !isOpen && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
                  isActive && 'bg-primary/10 text-primary font-medium'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {isOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 mb-2',
              location.pathname === '/settings' && 'bg-primary/10 text-primary'
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {isOpen && <span>Settings</span>}
          </Link>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isOpen && <span>Sign Out</span>}
          </button>

          {isOpen && user && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Avatar
                src={user.avatar}
                firstName={user.profile.firstName}
                lastName={user.profile.lastName}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getFullName(user.profile.firstName, user.profile.lastName)}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
