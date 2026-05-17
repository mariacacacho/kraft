import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Calendar, Tag, Paperclip, MessageSquare,
  Trash2, Edit2, Check, X, Upload, Send, Clock, DollarSign
} from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority, TicketType, PaymentStatus } from '../types';
import api from '../lib/api';
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG, PAYMENT_STATUS_CONFIG, cn, formatDate, isOverdue, formatCost, HOURLY_RATE } from '../lib/utils';
import { useProjectStore } from '../store/project';
import { useAuthStore } from '../store/auth';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeProjectId } = useProjectStore();
  const { user } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Ticket>>({});
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data } = await api.get(`/tickets/${id}`);
      return data;
    },
  });

  async function handleSave() {
    if (!ticket) return;
    try {
      await api.put(`/tickets/${ticket.id}`, editData);
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets', activeProjectId] });
      setEditing(false);
      setEditData({});
    } catch {
      alert('Failed to update ticket');
    }
  }

  async function handleDelete() {
    if (!ticket || !confirm('Delete this ticket? This action cannot be undone.')) return;
    await api.delete(`/tickets/${ticket.id}`);
    queryClient.invalidateQueries({ queryKey: ['tickets', activeProjectId] });
    navigate('/board');
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !ticket) return;
    setSubmittingComment(true);
    try {
      await api.post(`/tickets/${ticket.id}/comments`, { content: comment });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setComment('');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/tickets/${ticket.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    } finally {
      setUploadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  const currentData = editing ? { ...ticket, ...editData } : ticket;
  const status = STATUS_CONFIG[currentData.status];
  const priority = PRIORITY_CONFIG[currentData.priority];
  const type = TYPE_CONFIG[currentData.type];
  const payment = PAYMENT_STATUS_CONFIG[currentData.payment_status];
  const overdue = isOverdue(ticket.due_date) && ticket.status !== 'done';
  const editedHours = editData.estimated_hours ?? ticket.estimated_hours;
  const previewCost = editedHours ? editedHours * HOURLY_RATE : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-gray-400 text-sm">Back to board</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                {editing ? (
                  <input
                    className="input text-xl font-bold"
                    value={editData.title ?? ticket.title}
                    onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
                  />
                ) : (
                  <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSave} className="btn-primary py-1.5">
                      <Check className="w-4 h-4" /> Save
                    </button>
                    <button onClick={() => { setEditing(false); setEditData({}); }} className="btn-secondary py-1.5">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn-secondary py-1.5">
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={handleDelete} className="btn-danger py-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={cn('badge', type.bg, type.color)}>{type.label}</span>
              <span className={cn('badge', status.bg, status.color)}>{status.label}</span>
              {ticket.tags.map((tag) => (
                <span key={tag} className="badge bg-gray-100 text-gray-500">{tag}</span>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
              {editing ? (
                <textarea
                  className="input resize-none"
                  rows={5}
                  placeholder="Add a description..."
                  value={editData.description ?? ticket.description ?? ''}
                  onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {ticket.description || <span className="text-gray-400 italic">No description</span>}
                </p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({ticket.attachments?.length ?? 0})
              </h2>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary py-1.5 text-xs"
                disabled={uploadingFile}
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadingFile ? 'Uploading...' : 'Upload'}
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {ticket.attachments && ticket.attachments.length > 0 ? (
              <div className="space-y-2">
                {ticket.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{att.original_name}</p>
                      <p className="text-xs text-gray-400">
                        {(att.size / 1024).toFixed(0)} KB · {formatDate(att.created_at)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No attachments yet</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4" />
              Comments ({ticket.comments?.length ?? 0})
            </h2>
            <div className="space-y-4 mb-4">
              {ticket.comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary-700">
                    {c.author_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{c.author_name}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary-700">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 relative">
                <textarea
                  className="input resize-none pr-10"
                  rows={2}
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!comment.trim() || submittingComment}
                  className="absolute right-2 bottom-2 p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                {editing ? (
                  <select
                    className="input text-sm"
                    value={editData.status ?? ticket.status}
                    onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value as TicketStatus }))}
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <span className={cn('badge', status.bg, status.color)}>{status.label}</span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Priority</p>
                {editing ? (
                  <select
                    className="input text-sm"
                    value={editData.priority ?? ticket.priority}
                    onChange={(e) => setEditData((d) => ({ ...d, priority: e.target.value as TicketPriority }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full', priority.dot)} />
                    <span className={cn('text-sm', priority.color)}>{priority.label}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Type</p>
                {editing ? (
                  <select
                    className="input text-sm"
                    value={editData.type ?? ticket.type}
                    onChange={(e) => setEditData((d) => ({ ...d, type: e.target.value as TicketType }))}
                  >
                    <option value="ajuste">Ajuste</option>
                    <option value="cotizacion">Cotización</option>
                  </select>
                ) : (
                  <span className={cn('badge', type.bg, type.color)}>{type.label}</span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due Date
                </p>
                {editing ? (
                  <input
                    type="date"
                    className="input text-sm"
                    value={editData.due_date ?? ticket.due_date ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, due_date: e.target.value }))}
                  />
                ) : ticket.due_date ? (
                  <span className={cn('text-sm', overdue ? 'text-red-500 font-medium' : 'text-gray-700')}>
                    {formatDate(ticket.due_date)}
                    {overdue && ' (Overdue)'}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 italic">No due date</span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </p>
                {editing ? (
                  <input
                    className="input text-sm"
                    placeholder="#tag1, #tag2"
                    value={editData.tags?.join(', ') ?? ticket.tags.join(', ')}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      }))
                    }
                  />
                ) : ticket.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.tags.map((tag) => (
                      <span key={tag} className="badge bg-gray-100 text-gray-500">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">No tags</span>
                )}
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billing</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Estimated hours
                </p>
                {editing ? (
                  <input
                    type="number"
                    className="input text-sm"
                    placeholder="0"
                    min="0"
                    step="0.5"
                    value={editData.estimated_hours ?? ticket.estimated_hours ?? ''}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        estimated_hours: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-700">
                    {ticket.estimated_hours ? `${ticket.estimated_hours}h` : <span className="text-gray-400 italic">Not set</span>}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Development cost
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {editing && previewCost > 0
                    ? `$${previewCost.toFixed(2)}`
                    : formatCost(ticket.estimated_hours)}
                  <span className="text-xs text-gray-400 font-normal ml-1">(${HOURLY_RATE}/hr)</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Payment status</p>
                {editing ? (
                  <select
                    className="input text-sm"
                    value={editData.payment_status ?? ticket.payment_status}
                    onChange={(e) => setEditData((d) => ({ ...d, payment_status: e.target.value as PaymentStatus }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                ) : (
                  <span className={cn('badge', payment.bg, payment.color)}>{payment.label}</span>
                )}
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><span className="text-gray-400">Created:</span> {formatDate(ticket.created_at)}</p>
              <p><span className="text-gray-400">Updated:</span> {formatDate(ticket.updated_at)}</p>
              <p><span className="text-gray-400">By:</span> {ticket.creator_name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
