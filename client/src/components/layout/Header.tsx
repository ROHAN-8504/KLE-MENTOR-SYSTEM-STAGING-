import { Link } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Bell, Menu, Moon, Sun, Search } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { cn } from '../../lib/utils';
import { sidebarOpenState, mobileSidebarOpenState, userState } from '../../store/atoms';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { Button } from '../ui/Button';
import { Dropdown, DropdownItem, DropdownSeparator } from '../ui/Dropdown';
import { formatRelativeTime } from '../../lib/utils';

export const Header: React.FC = () => {
  const [, setMobileSidebarOpen] = useRecoilState(mobileSidebarOpenState);
  const sidebarOpen = useRecoilValue(sidebarOpenState);
  const user = useRecoilValue(userState);
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Build role-aware notifications link
  const notificationsLink = user?.role ? `/${user.role}/notifications` : '/notifications';

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-all',
        // Desktop: adjust left position based on sidebar state
        'lg:left-20',
        sidebarOpen && 'lg:left-64',
        // Mobile: full width
        'left-0'
      )}
    >
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo for mobile */}
        <Link to="/" className="lg:hidden flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">K</span>
          </div>
          <span className="font-semibold text-base hidden xs:inline">KLE Mentor</span>
        </Link>

        {/* Search - hidden on mobile */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              className="h-9 w-48 lg:w-64 rounded-md border border-input bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Dropdown
          trigger={
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          }
          className="w-72 md:w-80"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <DropdownSeparator />
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No notifications
              </p>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownItem
                  key={notification._id}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                  className={cn(!notification.isRead && 'bg-primary/5')}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">
                      {notification.title || notification.type?.replace(/_/g, ' ') || 'Notification'}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                </DropdownItem>
              ))
            )}
          </div>
          {notifications.length > 5 && (
            <>
              <DropdownSeparator />
              <Link
                to={notificationsLink}
                className="block px-2 py-1.5 text-center text-sm text-primary hover:underline"
              >
                View all notifications
              </Link>
            </>
          )}
        </Dropdown>

        {/* User button */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8 md:h-9 md:w-9',
            },
          }}
        />
      </div>
    </header>
  );
};
