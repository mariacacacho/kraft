import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();
router.use(authenticate);

async function getMemberRole(
  projectId: string,
  userId: string
): Promise<'owner' | 'member' | null> {
  const result = await query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return (result.rows[0]?.role as 'owner' | 'member') ?? null;
}

// List projects the user belongs to (as owner or member)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT p.*,
        pm.role AS my_role,
        (SELECT COUNT(*) FROM tickets t WHERE t.project_id = p.id) AS ticket_count,
        (SELECT COUNT(*) FROM project_members m WHERE m.project_id = p.id) AS member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       ORDER BY p.created_at ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create project — owner email only
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  if (ownerEmail && req.userEmail !== ownerEmail) {
    res.status(403).json({ error: 'Only the app owner can create projects' });
    return;
  }

  const { name, description, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const projectResult = await query(
      `INSERT INTO projects (name, description, color, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, color || '#6366f1', req.userId]
    );
    const project = projectResult.rows[0];

    await query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [project.id, req.userId]
    );

    res.status(201).json({ ...project, my_role: 'owner' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const result = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    res.json({ ...result.rows[0], my_role: role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project — owner only
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, color } = req.body;
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (role !== 'owner') {
      res.status(403).json({ error: 'Only the project owner can edit project settings' });
      return;
    }
    const result = await query(
      `UPDATE projects
       SET name = COALESCE($1, name), description = COALESCE($2, description),
           color = COALESCE($3, color), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, description, color, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project — owner only
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (role !== 'owner') {
      res.status(403).json({ error: 'Only the project owner can delete this project' });
      return;
    }
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List members
router.get('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const result = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.role ASC, pm.joined_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member by email — owner only
router.post('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (role !== 'owner') {
      res.status(403).json({ error: 'Only the project owner can add members' });
      return;
    }

    const userResult = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!userResult.rows[0]) {
      res.status(404).json({ error: `No user found with email "${email}"` });
      return;
    }

    const targetUser = userResult.rows[0];
    const existing = await getMemberRole(req.params.id, targetUser.id);
    if (existing) {
      res.status(409).json({ error: 'User is already a member of this project' });
      return;
    }

    await query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member')`,
      [req.params.id, targetUser.id]
    );

    res.status(201).json({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: 'member',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member — owner only (cannot remove themselves if owner)
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await getMemberRole(req.params.id, req.userId!);
    if (!role) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (role !== 'owner') {
      res.status(403).json({ error: 'Only the project owner can remove members' });
      return;
    }

    const targetRole = await getMemberRole(req.params.id, req.params.userId);
    if (!targetRole) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (req.params.userId === req.userId) {
      res.status(400).json({ error: 'You cannot remove yourself from a project you own' });
      return;
    }

    await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
