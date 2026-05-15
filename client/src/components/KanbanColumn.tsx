import { Plus } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Ticket, TicketStatus } from '../types';
import { STATUS_CONFIG, cn } from '../lib/utils';
import TicketCard from './TicketCard';

interface Props {
  status: TicketStatus;
  tickets: Ticket[];
  onAddTicket: (status: TicketStatus) => void;
}

const COLUMN_ACCENT: Record<TicketStatus, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-400',
  in_review: 'bg-amber-400',
  done: 'bg-emerald-400',
};

export default function KanbanColumn({ status, tickets, onAddTicket }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', COLUMN_ACCENT[status])} />
          <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
          <span className={cn('badge ml-1', config.bg, config.color)}>{tickets.length}</span>
        </div>
        <button
          onClick={() => onAddTicket(status)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 space-y-3 min-h-24 rounded-xl p-1 transition-colors',
              snapshot.isDraggingOver && 'bg-primary-50'
            )}
          >
            {tickets.map((ticket, index) => (
              <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                {(draggableProvided, draggableSnapshot) => (
                  <TicketCard
                    ticket={ticket}
                    provided={draggableProvided}
                    isDragging={draggableSnapshot.isDragging}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {tickets.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-xs text-gray-400">Drop here</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
