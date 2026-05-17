export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  canCreateProjects?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  owner_id: string;
  my_role?: 'owner' | 'member';
  ticket_count?: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export type TicketStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketType = 'cotizacion' | 'ajuste';
export type PaymentStatus = 'pending' | 'paid';

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  project_id: string;
  created_by: string;
  creator_name?: string;
  creator_avatar?: string;
  due_date?: string;
  tags: string[];
  position: number;
  estimated_hours?: number | null;
  payment_status: PaymentStatus;
  cost?: number;
  comment_count?: number;
  attachment_count?: number;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
  comments?: Comment[];
}

export interface Attachment {
  id: string;
  ticket_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by: string;
  uploader_name?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  content: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  created_at: string;
  updated_at: string;
}
