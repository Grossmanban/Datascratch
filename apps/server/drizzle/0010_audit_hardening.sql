-- Security review 2026-11-02.
-- 1. Per-account storage limit: null = the server default (existing accounts keep it); new
--    accounts get a smaller one at signup (NEW_USER_STORAGE_QUOTA_BYTES).
ALTER TABLE "users" ADD COLUMN "storage_quota_bytes" bigint;--> statement-breakpoint
-- Owner, bytes used and the account's own limit for a document (quota checks on every write path).
CREATE OR REPLACE FUNCTION ds_quota_of_doc(doc uuid) RETURNS TABLE (owner uuid, used bigint, quota bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.storage_bytes, u.storage_quota_bytes FROM docs d JOIN users u ON u.id = d.user_id WHERE d.id = doc;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_quota_of_doc(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ds_quota_of_doc(uuid) TO ds_agent;
--> statement-breakpoint
-- 2. «All notebooks» of an agent grant means the user's own notebooks: someone else's notebook
--    shared with the user reaches the agent only when picked by name.
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
          AND ((g.all_notebooks AND n.user_id = ds_agent_user_id()) OR n.id = ANY (g.notebook_ids))
          AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > now())
          AND (NOT need_write OR g.permission = 'read_write')
      )
    )
$$;
