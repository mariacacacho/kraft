# Kraft — Ticket Manager

Personal ticket management app with Kanban board, multi-project support, and file attachments.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript (BFF pattern — serves frontend in production)
- **Database**: PostgreSQL (via `pg` driver, raw SQL)
- **Auth**: JWT (7-day expiry, stored in `localStorage` as `kraft_token`)
- **State**: Zustand (auth + active project), TanStack Query (server state)
- **Drag & Drop**: `@hello-pangea/dnd`

## Project Structure

```
kraft/
├── .env                  # DATABASE_URL, JWT_SECRET, PORT, CLIENT_URL
├── package.json          # Root: runs both server + client via concurrently
├── client/               # React app (Vite, port 5173 in dev)
│   └── src/
│       ├── pages/        # LoginPage, BoardPage, TicketDetailPage, ProjectsPage
│       ├── components/   # Sidebar, TopBar, KanbanColumn, TicketCard, CreateTicketModal
│       ├── layouts/      # DashboardLayout
│       ├── store/        # auth.ts (Zustand), project.ts (Zustand + persist)
│       ├── lib/          # api.ts (axios), utils.ts (cn, STATUS_CONFIG, etc.)
│       └── types/        # index.ts (User, Project, Ticket, Attachment, Comment)
└── server/               # Express app (port 3001 in dev)
    └── src/
        ├── db/           # index.ts (pool), migrate.ts, seed.ts
        ├── middleware/   # auth.ts (JWT middleware, adds userId to req)
        └── routes/       # auth.ts, projects.ts, tickets.ts
```

## Database Schema

- **users**: id, email, password_hash, name, avatar_url, timestamps
- **projects**: id, name, description, color (#hex), owner_id → users, timestamps
- **tickets**: id, title, description, status (enum), priority (enum), type (enum), project_id → projects, created_by → users, due_date, tags (text[]), position (int), timestamps
- **attachments**: id, ticket_id → tickets, filename, original_name, mime_type, size, url, uploaded_by → users, created_at
- **comments**: id, ticket_id → tickets, content, author_id → users, timestamps

### Enums

- `ticket_status`: `todo`, `in_progress`, `in_review`, `done`
- `ticket_priority`: `low`, `medium`, `high`
- `ticket_type`: `cotizacion`, `ajuste`

## API Endpoints

All routes under `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/login | No | Returns `{token, user}` |
| POST | /auth/register | No | Returns `{token, user}` |
| GET | /auth/me | Yes | Current user |
| GET | /projects | Yes | List user's projects (includes ticket_count) |
| POST | /projects | Yes | Create project |
| GET | /projects/:id | Yes | Get project |
| PUT | /projects/:id | Yes | Update project |
| DELETE | /projects/:id | Yes | Delete project + all tickets |
| GET | /tickets?projectId= | Yes | List tickets for project |
| POST | /tickets | Yes | Create ticket |
| GET | /tickets/:id | Yes | Ticket detail (with attachments + comments) |
| PUT | /tickets/:id | Yes | Update ticket (partial update via COALESCE) |
| DELETE | /tickets/:id | Yes | Delete ticket |
| POST | /tickets/:id/attachments | Yes | Upload file (multipart) |
| POST | /tickets/:id/comments | Yes | Add comment |

## Development

### Setup

```bash
# 1. Install deps
npm run install:all

# 2. Copy and fill env
cp .env.example .env

# 3. Run migrations
npm run db:migrate

# 4. Seed with sample data (optional)
npm run db:seed
# Creates: admin@kraft.app / admin123

# 5. Start dev servers
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

### Environment Variables (.env)

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/kraft
JWT_SECRET=change-this-in-production
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## Key Design Decisions

- **BFF pattern**: In production (`NODE_ENV=production`), Express serves the Vite build from `client/dist`. In dev, Vite proxies `/api` and `/uploads` to port 3001.
- **Partial updates**: Ticket/project PUT endpoints use `COALESCE($n, column)` so only sent fields are updated.
- **Optimistic drag-and-drop**: Kanban drag updates local cache immediately, rolls back on API error.
- **File uploads**: Stored locally in `uploads/` folder (served as static files). Max 10MB per file.
- **Authorization**: All ticket/project queries filter by `owner_id = req.userId` — users only see their own data.

## UI Conventions

- **Colors**: Uses `primary-*` (indigo/6366f1) as brand color. Status colors: slate (todo), blue (in_progress), amber (in_review), emerald (done).
- **Type badges**: violet for Cotización, sky for Ajuste.
- **Component classes**: `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `input`, `card`, `badge` — defined in `index.css` as Tailwind `@layer components`.
- **cn()**: Use `cn()` from `lib/utils.ts` for conditional classNames (clsx + tailwind-merge).
