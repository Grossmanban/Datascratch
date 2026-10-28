-- D-54 amendment (owner, 2026-10-28): a member's own agent tokens reach an agent-mode notebook
-- shared with that member, with the member's rights: editor read+write, viewer read only. A
-- member still awaiting the owner's confirmation (account created after the invitation, no
-- key yet) gets nothing. The grant's notebook list, when it has one, still narrows the scope.
CREATE OR REPLACE FUNCTION ds_agent_notebooks(need_write boolean) RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id
  FROM notebooks n
  WHERE n.mode = 'agent'
    AND (
      n.user_id = ds_agent_user_id()
      OR EXISTS (
        SELECT 1 FROM members m
        WHERE m.notebook_id = n.id
          AND m.user_id = ds_agent_user_id()
          AND (NOT m.account_created_after_invite OR m.wrapped_key IS NOT NULL)
          AND (NOT need_write OR m.role = 'editor')
      )
    )
    AND (
      ds_agent_grant_id() IS NULL
      OR EXISTS (
        SELECT 1 FROM agent_grants g
        WHERE g.id = ds_agent_grant_id()
          AND g.user_id = ds_agent_user_id()
          AND n.id = ANY (g.notebook_ids)
          AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > now())
          AND (NOT need_write OR g.permission = 'read_write')
      )
    )
$$;
--> statement-breakpoint
-- The owner of a notebook (notes created by a member's agent belong to the owner, D-54).
CREATE OR REPLACE FUNCTION ds_notebook_owner(nb uuid) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM notebooks WHERE id = nb
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_notebook_owner(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ds_notebook_owner(uuid) TO ds_agent;
--> statement-breakpoint
DROP POLICY agent_insert ON docs;
--> statement-breakpoint
CREATE POLICY agent_insert ON docs FOR INSERT TO ds_agent
  WITH CHECK (kind = 'note' AND notebook_id IN (SELECT ds_agent_notebooks(true))
    AND user_id = ds_notebook_owner(notebook_id));
--> statement-breakpoint
-- A note moves only between notebooks of its owner: a member's agent can never take a note
-- out of a shared notebook into the member's own (moving out is the owner's, api.md).
DROP POLICY agent_update ON docs;
--> statement-breakpoint
CREATE POLICY agent_update ON docs FOR UPDATE TO ds_agent
  USING (notebook_id IN (SELECT ds_agent_notebooks(true)))
  WITH CHECK (notebook_id IN (SELECT ds_agent_notebooks(true)) AND user_id = ds_notebook_owner(notebook_id));
