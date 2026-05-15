import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Zap, LogOut, ChevronDown, Plus, X } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useProjectStore } from '../store/project';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Project } from '../types';
import { getInitials, cn } from '../lib/utils';
import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const { activeProjectId, setActiveProject, setProjects } = useProjectStore();
  const navigate = useNavigate();
  const [projectsOpen, setProjectsOpen] = useState(true);

  const canCreate = user?.canCreateProjects ?? false;

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      setProjects(data);
      if (!activeProjectId && data.length > 0) setActiveProject(data[0].id);
      return data;
    },
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleNav(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <aside
      className={cn(
        // Mobile: fixed overlay sliding in from left
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0',
        'transform transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: static, always visible
        'md:relative md:translate-x-0 md:w-60 md:z-auto md:transition-none'
      )}
    >
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Kraft</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Main</p>

        <NavLink
          to="/board"
          onClick={onClose}
          className={({ isActive }) =>
            cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          Board
        </NavLink>

        <NavLink
          to="/projects"
          onClick={onClose}
          className={({ isActive }) =>
            cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <FolderOpen className="w-4 h-4" />
          Projects
        </NavLink>

        <div className="pt-4">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center justify-between w-full px-2 mb-2 group"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</p>
            <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', projectsOpen ? '' : '-rotate-90')} />
          </button>

          {projectsOpen && (
            <div className="space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleNav(() => { setActiveProject(project.id); navigate('/board'); })}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    activeProjectId === project.id
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                  {project.ticket_count !== undefined && (
                    <span className="ml-auto text-xs text-gray-400">{project.ticket_count}</span>
                  )}
                </button>
              ))}

              {canCreate && (
                <NavLink
                  to="/projects"
                  onClick={onClose}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New project
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary-700">
              {user ? getInitials(user.name) : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
