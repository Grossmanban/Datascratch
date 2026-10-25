-- Row-Level Security for agent access (D-30). The application connects as the
-- table owner, which bypasses RLS. Every agent operation runs in a transaction
-- that does `SET LOCAL ROLE ds_agent` and `SET LOCAL ds.agent_token_id = '<id>'`;
-- the policies below then restrict it to the notebooks granted to that token.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ds_agent') THEN
    CREATE ROLE ds_agent NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
GRANT ds_agent TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO ds_agent;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ds_agent_token_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('ds.agent_token_id', true), '')::uuid
$$;
--> statement-breakpoint
-- Notebooks the current agent token may access. `need_write` restricts to read_write tokens.
CREATE OR REPLACE FUNCTION ds_agent_notebooks(need_write boolean) RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT atn.notebook_id
  FROM agent_token_notebooks atn
  JOIN agent_tokens t ON t.id = atn.token_id
  JOIN notebooks n ON n.id = atn.notebook_id
  WHERE t.id = ds_agent_token_id()
    AND t.revoked_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND n.mode = 'agent'
    AND n.user_id = t.user_id
    AND (NOT need_write OR t.permission = 'read_write')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_agent_notebooks(boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ds_agent_notebooks(boolean) TO ds_agent;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ds_agent_token_id() TO ds_agent;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ds_agent_doc_allowed(doc uuid, need_write boolean) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM docs d
    WHERE d.id = doc AND d.notebook_id IN (SELECT ds_agent_notebooks(need_write))
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_agent_doc_allowed(uuid, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ds_agent_doc_allowed(uuid, boolean) TO ds_agent;
--> statement-breakpoint
GRANT SELECT ON notebooks, docs, doc_updates, doc_snapshots, attachments, attachment_chunks, agent_audit TO ds_agent;
--> statement-breakpoint
GRANT INSERT ON docs, doc_updates, doc_snapshots, attachments, attachment_chunks, agent_audit TO ds_agent;
--> statement-breakpoint
GRANT UPDATE (last_seq, snapshot_seq, updates_since_snapshot, bytes_since_snapshot, updated_at) ON docs TO ds_agent;
--> statement-breakpoint
GRANT UPDATE (completed_at) ON attachments TO ds_agent;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE agent_audit_id_seq TO ds_agent;
--> statement-breakpoint
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE doc_updates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE doc_snapshots ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE attachment_chunks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE agent_audit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY agent_read ON notebooks FOR SELECT TO ds_agent
  USING (id IN (SELECT ds_agent_notebooks(false)));
--> statement-breakpoint
CREATE POLICY agent_read ON docs FOR SELECT TO ds_agent
  USING (notebook_id IN (SELECT ds_agent_notebooks(false)));
--> statement-breakpoint
CREATE POLICY agent_insert ON docs FOR INSERT TO ds_agent
  WITH CHECK (kind = 'note' AND notebook_id IN (SELECT ds_agent_notebooks(true))
    AND user_id = (SELECT n.user_id FROM notebooks n WHERE n.id = notebook_id));
--> statement-breakpoint
CREATE POLICY agent_update ON docs FOR UPDATE TO ds_agent
  USING (notebook_id IN (SELECT ds_agent_notebooks(true)))
  WITH CHECK (notebook_id IN (SELECT ds_agent_notebooks(true)));
--> statement-breakpoint
CREATE POLICY agent_read ON doc_updates FOR SELECT TO ds_agent
  USING (ds_agent_doc_allowed(doc_id, false));
--> statement-breakpoint
CREATE POLICY agent_insert ON doc_updates FOR INSERT TO ds_agent
  WITH CHECK (ds_agent_doc_allowed(doc_id, true));
--> statement-breakpoint
CREATE POLICY agent_read ON doc_snapshots FOR SELECT TO ds_agent
  USING (ds_agent_doc_allowed(doc_id, false));
--> statement-breakpoint
CREATE POLICY agent_insert ON doc_snapshots FOR INSERT TO ds_agent
  WITH CHECK (ds_agent_doc_allowed(doc_id, true));
--> statement-breakpoint
CREATE POLICY agent_read ON attachments FOR SELECT TO ds_agent
  USING (ds_agent_doc_allowed(note_id, false));
--> statement-breakpoint
CREATE POLICY agent_insert ON attachments FOR INSERT TO ds_agent
  WITH CHECK (ds_agent_doc_allowed(note_id, true));
--> statement-breakpoint
CREATE POLICY agent_update ON attachments FOR UPDATE TO ds_agent
  USING (ds_agent_doc_allowed(note_id, true));
--> statement-breakpoint
CREATE POLICY agent_read ON attachment_chunks FOR SELECT TO ds_agent
  USING (attachment_id IN (SELECT id FROM attachments));
--> statement-breakpoint
CREATE POLICY agent_insert ON attachment_chunks FOR INSERT TO ds_agent
  WITH CHECK (attachment_id IN (SELECT a.id FROM attachments a WHERE ds_agent_doc_allowed(a.note_id, true)));
--> statement-breakpoint
CREATE POLICY agent_own ON agent_audit FOR ALL TO ds_agent
  USING (token_id = ds_agent_token_id())
  WITH CHECK (token_id = ds_agent_token_id());
--> statement-breakpoint
-- Blob cleanup: whenever a chunk row disappears (directly or by cascade from an
-- attachment, note, notebook or user), queue its storage key for deletion.
CREATE OR REPLACE FUNCTION ds_queue_chunk_blob() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO storage_trash (key) VALUES ('att/' || OLD.attachment_id || '/' || OLD.index);
  RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER attachment_chunks_blob_cleanup AFTER DELETE ON attachment_chunks
  FOR EACH ROW EXECUTE FUNCTION ds_queue_chunk_blob();
