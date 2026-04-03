

## Agent Performance Tracking System

### Overview
Build an agent role and performance tracking system so social media agents who take orders via Messenger can be assigned to POS orders, and their performance (orders, revenue, items sold) can be tracked by admins and viewed by agents themselves.

### Database Changes

**1. Add `agent` to the `app_role` enum**
- Allows assigning the "agent" role to users via the existing User Roles admin page

**2. Create `orders.assigned_agent_id` column**
- New nullable UUID column on the `orders` table to link an order to the agent who took it
- No foreign key to `auth.users` (following project convention)

**3. Update RLS** — No new policies needed; existing admin policies cover reads/writes on orders

### POS Changes (`AdminPOS.tsx`)

- Add an "Assign Agent" dropdown in the order form (under Order Source or near customer details)
- Fetch all users with `agent` role (join `user_roles` + `profiles`) to populate the dropdown
- Save selected agent ID to `orders.assigned_agent_id` on order creation
- Include agent name in the order status history note

### Agent Performance Page (`/admin/agents`)

**New admin page** with:
- **Agent list table** showing each agent's:
  - Name, phone, email
  - Total orders assigned
  - Total revenue generated
  - Total items sold
  - Average order value
- **Date range filter** (Today, 7d, 30d, 90d, custom)
- **Order source filter** (filter by specific sources like Facebook, Instagram, etc.)
- **Click into agent** to see their individual order breakdown

Data source: Query `orders` where `assigned_agent_id` is set, join with `order_items` for item counts, join with `profiles` for agent names.

### Agent Self-Service Dashboard (`/account/performance`)

- Agents with the `agent` role who log in see a "My Performance" link
- Shows their own stats: orders taken, revenue, items sold, filtered by date
- Uses RLS — agents can only see orders where `assigned_agent_id = auth.uid()`
- Add a new RLS SELECT policy on `orders`: agents can view orders assigned to them

### Sidebar & Routing

- Add "Agents" menu item in admin sidebar under Main Menu
- Add route `/admin/agents` → `AdminAgents.tsx`
- Add route `/account/performance` for agent self-view
- Update auth redirect logic: agents go to `/account/performance` after login

### Files to Create
- `src/pages/admin/AdminAgents.tsx` — Admin agent performance dashboard
- `src/pages/AgentPerformance.tsx` — Agent self-service view

### Files to Modify
- `src/pages/admin/AdminPOS.tsx` — Add agent assignment dropdown
- `src/components/admin/AdminSidebar.tsx` — Add Agents nav item
- `src/App.tsx` — Add new routes
- `src/pages/Account.tsx` — Add "My Performance" link for agents

### Migration SQL Summary
```sql
ALTER TYPE public.app_role ADD VALUE 'agent';
ALTER TABLE public.orders ADD COLUMN assigned_agent_id uuid;
-- RLS policy for agents to view their assigned orders
CREATE POLICY "Agents can view their assigned orders"
  ON public.orders FOR SELECT TO authenticated
  USING (assigned_agent_id = auth.uid());
```

