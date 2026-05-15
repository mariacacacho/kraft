import { Search, Bell, Menu } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useProjectStore } from '../store/project';
import { format } from 'date-fns';

interface Props {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: Props) {
  const user = useAuthStore((s) => s.user);
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-100 px-4 md:px-6 flex items-center justify-between flex-shrink-0 gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors md:hidden flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="min-w-0 flex-1 md:flex-none">
        <p className="text-gray-400 text-xs hidden md:block">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
        <h2 className="font-semibold text-gray-900 text-sm md:text-base truncate">
          {activeProject ? (
            <span>{activeProject.name}</span>
          ) : (
            <>Welcome, <span className="text-primary-600">{user?.name?.split(' ')[0]}</span></>
          )}
        </h2>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search: icon only on mobile, full bar on desktop */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-48 md:w-56 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors sm:hidden">
          <Search className="w-5 h-5" />
        </button>

        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
