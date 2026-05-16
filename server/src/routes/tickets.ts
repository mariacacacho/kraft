import { Router, Response, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

// Returns true if the user is a member (owner or member) of the project
async function isMember(projectId: string, userId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows.length > 0;
}

// Returns true if the user is a member of the project that contains the ticket
async function isMemberOfTicketProject(ticketId: string, userId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM project_members pm
     JOIN tickets t ON t.project_id = pm.project_id
     WHERE t.id = $1 AND pm.user_id = $2`,
    [ticketId, userId]
  );
  return result.rows.length > 0;
}

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { projectId, status } = req.query;
  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }
  try {
    if (!(await isMember(projectId as string, req.userId!))) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    let sql = `
      SELECT t.*,
        u.name AS creator_name,
        u.avatar_url AS creator_avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.ticket_id = t.id) AS comment_count,
        (SELECT COUNT(*) FROM attachments a WHERE a.ticket_id = t.id) AS attachment_count
      FROM tickets t
      JOIN users u ON u.id = t.created_by
      WHERE t.project_id = $1
    `;
    const params: unknown[] = [projectId];

    if (status) {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    sql += ' ORDER BY t.position ASC, t.created_at ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, status, priority, type, projectId, dueDate, tags } = req.body;

  if (!title || !projectId) {
    res.status(400).json({ error: 'title and projectId are required' });
    return;
  }

  try {
    if (!(await isMember(projectId, req.userId!))) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const posResult = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tickets WHERE project_id = $1 AND status = $2',
      [projectId, status || 'todo']
    );

    const result = await query(
      `INSERT INTO tickets (title, description, status, priority, type, project_id, created_by, due_date, tags, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        title,
        description || null,
        status || 'todo',
        priority || 'medium',
        type || 'ajuste',
        projectId,
        req.userId,
        dueDate || null,
        tags || [],
        posResult.rows[0].next_pos,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await isMemberOfTicketProject(req.params.id, req.userId!))) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const result = await query(
      `SELECT t.*, u.name AS creator_name, u.avatar_url AS creator_avatar
       FROM tickets t
       JOIN users u ON u.id = t.created_by
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const ticket = result.rows[0];

    const [attachments, comments] = await Promise.all([
      query(
        `SELECT a.*, u.name AS uploader_name FROM attachments a
         JOIN users u ON u.id = a.uploaded_by WHERE a.ticket_id = $1 ORDER BY a.created_at ASC`,
        [ticket.id]
      ),
      query(
        `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar FROM comments c
         JOIN users u ON u.id = c.author_id WHERE c.ticket_id = $1 ORDER BY c.created_at ASC`,
        [ticket.id]
      ),
    ]);

    res.json({ ...ticket, attachments: attachments.rows, comments: comments.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, status, priority, type, dueDate, tags, position } = req.body;

  try {
    if (!(await isMemberOfTicketProject(req.params.id, req.userId!))) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const result = await query(
      `UPDATE tickets SET
        title       = COALESCE($1, title),
        description = COALESCE($2, description),
        status      = COALESCE($3, status),
        priority    = COALESCE($4, priority),
        type        = COALESCE($5, type),
        due_date    = COALESCE($6, due_date),
        tags        = COALESCE($7, tags),
        position    = COALESCE($8, position),
        updated_at  = NOW()
       WHERE id = $9 RETURNING *`,
      [title, description, status, priority, type, dueDate, tags, position, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await isMemberOfTicketProject(req.params.id, req.userId!))) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    await query('DELETE FROM tickets WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/attachments', upload.single('file'), async (req: AuthRequest & Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  try {
    if (!(await isMemberOfTicketProject(req.params.id, req.userId!))) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const url = `/uploads/${req.file.filename}`;
    const result = await query(
      `INSERT INTO attachments (ticket_id, filename, original_name, mime_type, size, url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, url, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/comments', async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }
  try {
    if (!(await isMemberOfTicketProject(req.params.id, req.userId!))) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const result = await query(
      `INSERT INTO comments (ticket_id, content, author_id) VALUES ($1, $2, $3)
       RETURNING *, (SELECT name FROM users WHERE id = $3) AS author_name`,
      [req.params.id, content, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
