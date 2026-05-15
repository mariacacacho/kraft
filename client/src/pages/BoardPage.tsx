import { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderOpen } from 'lucide-react';
import { Ticket, TicketStatus } from '../types';
import { useProjectStore } from '../store/project';
import api from '../lib/api';
import KanbanColumn from '../components/KanbanColumn';
import CreateTicketModal from '../components/CreateTicketModal';

const STATUSES: TicketStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export default function BoardPage() {
  const { activeProjectId, projects } = useProjectStore();
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState<{ open: boolean; status: TicketStatus }>({
    open: false,
    status: 'todo',
  });

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets', activeProjectId],
    queryFn: async () => {
      const { data } = await api.get('/tickets', { params: { projectId: activeProjectId } });
      return data;
    },
    enabled: !!activeProjectId,
  });

  const ticketsByStatus = useCallback(
    (status: TicketStatus) =>
      tickets.filter((t) => t.status === status).sort((a, b) => a.position - b.position),
    [tickets]
  );

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TicketStatus;

    queryClient.setQueryData<Ticket[]>(['tickets', activeProjectId], (old = []) => {
      return old.map((t) =>
        t.id === draggableId
          ? { ...t, status: newStatus, position: destination.index }
          : t
      );
    });

    try {
      await api.put(`/tickets/${draggableId}`, {
        status: newStatus,
        position: destination.index,
      });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['tickets', activeProjectId] });
    }
  }

  const activeProject = projects.find((p) => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No project selected</h2>
        <p className="text-gray-500 text-sm">Create a project to start managing your tickets.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeProject?.color || '#6366f1' }}
          />
          <h1 className="font-semibold text-gray-900 truncate">{activeProject?.name}</h1>
          <span className="text-gray-400 text-sm hidden sm:inline">Board</span>
        </div>
        <button
          onClick={() => setCreateModal({ open: true, status: 'todo' })}
          className="btn-primary flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create ticket</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex gap-5 h-full min-w-max">
              {STATUSES.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tickets={ticketsByStatus(status)}
                  onAddTicket={(s) => setCreateModal({ open: true, status: s })}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      )}

      {createModal.open && (
        <CreateTicketModal
          defaultStatus={createModal.status}
          onClose={() => setCreateModal({ open: false, status: 'todo' })}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['tickets', activeProjectId] })}
        />
      )}
    </div>
  );
}
