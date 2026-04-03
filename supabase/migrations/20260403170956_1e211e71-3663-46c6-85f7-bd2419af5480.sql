
ALTER TYPE public.app_role ADD VALUE 'agent';

ALTER TABLE public.orders ADD COLUMN assigned_agent_id uuid;

CREATE POLICY "Agents can view their assigned orders"
  ON public.orders FOR SELECT TO authenticated
  USING (assigned_agent_id = auth.uid());
