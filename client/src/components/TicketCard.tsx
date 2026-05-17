import { MessageSquare, Paperclip, Calendar, GripVertical, Clock, DollarSign } from 'lucide-react';
import { Ticket } from '../types';
import { PRIORITY_CONFIG, TYPE_CONFIG, PAYMENT_STATUS_CONFIG, cn, formatDate, isOverdue, formatCost } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { DraggableProvided } from '@hello-pangea/dnd';

interface Props {
  ticket: Ticket;
  provided: DraggableProvided;
  isDragging: boolean;
}

export default function TicketCard({ ticket, provided, isDragging }: Props) {
  const navigate = useNavigate();
  const priority = PRIORITY_CONFIG[ticket.priority];
  const type = TYPE_CONFIG[ticket.type];
  const payment = PAYMENT_STATUS_CONFIG[ticket.payment_status];
  const overdue = isOverdue(ticket.due_date) && ticket.status !== 'done';

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-4 cursor-pointer group transition-all duration-150',
        'hover:border-primary-200 hover:shadow-md',
        isDragging && 'shadow-xl rotate-1 border-primary-300'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <span className={cn('badge', type.bg, type.color)}>{type.label}</span>
          {ticket.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="badge bg-gray-100 text-gray-500">{tag}</span>
          ))}
        </div>
        <div
          {...provided.dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug">
        {ticket.title}
      </h3>

      <div className="flex items-center gap-1.5 mb-3">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.dot)} />
        <span className={cn('text-xs font-medium', priority.color)}>{priority.label}</span>
      </div>

      {ticket.due_date && (
        <div className={cn('flex items-center gap-1.5 mb-3 text-xs', overdue ? 'text-red-500' : 'text-gray-400')}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(ticket.due_date)}</span>
        </div>
      )}

      {ticket.estimated_hours && (
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {ticket.estimated_hours}h
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
            <DollarSign className="w-3.5 h-3.5" />
            {formatCost(ticket.estimated_hours)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {ticket.comment_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Paperclip className="w-3.5 h-3.5" />
            {ticket.attachment_count ?? 0}
          </span>
        </div>
        <span className={cn('badge', payment.bg, payment.color)}>{payment.label}</span>
      </div>
    </div>
  );
}
