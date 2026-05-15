import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, Trash2, Edit2, Check, X, Users, UserPlus, Crown, UserMinus, ChevronDown } from 'lucide-react';
import { Project, ProjectMember } from '../types';
import api from '../lib/api';
import { PROJECT_COLORS, cn, formatDate, getInitials } from '../lib/utils';
import { useProjectStore } from '../store/project';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

function MembersPanel({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', project.id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${project.id}/members`);
      return data;
    },
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.post(`/projects/${project.id}/members`, { email: email.trim() });
      queryClient.invalidateQueries({ queryKey: ['project-members', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEmail('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      queryClient.invalidateQueries({ queryKey: ['project-members', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Failed to remove member');
    }
  }

  const isOwner = project.my_role === 'owner';

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Members ({members.length})
        </h4>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary-700">
              {getInitials(member.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
              <p className="text-xs text-gray-400 truncate">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {member.role === 'owner' ? (
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              ) : (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Member</span>
              )}
              {isOwner && member.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Add by email..."
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              type="email"
            />
            <button type="submit" className="btn-primary py-1.5 px-3" disabled={adding || !email.trim()}>
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { activeProjectId, setActiveProject } = useProjectStore();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.canCreateProjects ?? false;

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const [openMembersId, setOpenMembersId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/projects', {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        color: newColor,
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setActiveProject(data.id);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewColor(PROJECT_COLORS[0]);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(project: Project) {
    await api.put(`/projects/${project.id}`, { name: editName, color: editColor });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project and all its tickets? This cannot be undone.')) return;
    await api.delete(`/projects/${id}`);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    if (activeProjectId === id) setActiveProject(null);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New project
          </button>
        )}
      </div>

      {canCreate && showCreate && (
        <form onSubmit={handleCreate} className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Create Project</h2>
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Project name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn('w-7 h-7 rounded-full transition-transform hover:scale-110',
                      newColor === c && 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className={cn('card p-5 transition-all', activeProjectId === project.id && 'ring-2 ring-primary-200')}
          >
            {editingId === project.id ? (
              <div className="space-y-3">
                <input
                  className="input font-semibold"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={cn('w-6 h-6 rounded-full transition-transform hover:scale-110',
                        editColor === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(project)} className="btn-primary py-1.5 text-xs">
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary py-1.5 text-xs">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <Folder className="w-5 h-5" style={{ color: project.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {project.my_role === 'owner' ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Owner
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Member</span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 truncate">{project.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {project.ticket_count} ticket{Number(project.ticket_count) !== 1 ? 's' : ''} · {project.member_count} member{Number(project.member_count) !== 1 ? 's' : ''} · Created {formatDate(project.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setActiveProject(project.id); navigate('/board'); }}
                      className="btn-secondary py-1.5 text-xs"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setOpenMembersId(openMembersId === project.id ? null : project.id)}
                      className={cn(
                        'flex items-center gap-1.5 py-1.5 px-2.5 text-xs rounded-lg border transition-colors',
                        openMembersId === project.id
                          ? 'bg-primary-50 text-primary-700 border-primary-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <ChevronDown className={cn('w-3 h-3 transition-transform', openMembersId === project.id && 'rotate-180')} />
                    </button>
                    {project.my_role === 'owner' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(project.id);
                            setEditName(project.name);
                            setEditColor(project.color);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {openMembersId === project.id && (
                  <MembersPanel
                    project={project}
                    onClose={() => setOpenMembersId(null)}
                  />
                )}
              </>
            )}
          </div>
        ))}

        {projects.length === 0 && !showCreate && (
          <div className="text-center py-12 text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No projects yet. Create your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
