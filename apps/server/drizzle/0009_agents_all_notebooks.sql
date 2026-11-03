-- Owner decision (2026-11-01): a notebook switched to «for agents» is reached at once by every
-- connected agent of its owner, without reconnecting. A grant with all_notebooks ignores its
-- notebook_ids list; grants made before this change get it, as the owner asked.
ALTER TABLE "agent_grants" ADD COLUMN "all_notebooks" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_codes" ADD COLUMN "all_notebooks" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "agent_grants" SET "all_notebooks" = true WHERE "revoked_at" IS NULL;--> statement-breakpoint
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
          AND (g.all_notebooks OR n.id = ANY (g.notebook_ids))
          AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > now())
          AND (NOT need_write OR g.permission = 'read_write')
      )
    )
$$;
