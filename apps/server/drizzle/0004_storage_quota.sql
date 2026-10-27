ALTER TABLE "users" ADD COLUMN "storage_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Per-account storage counter (security audit 2026-10-27, item 4). Kept by triggers so that
-- every write path (users, guests, agents under RLS) is counted. SECURITY DEFINER: the
-- agent role cannot touch users.
CREATE OR REPLACE FUNCTION ds_storage_add(owner uuid, delta bigint) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE users SET storage_bytes = greatest(storage_bytes + delta, 0) WHERE id = owner;
$$;
--> statement-breakpoint
-- Updates and snapshots belong to the owner of their document. When the document itself is
-- deleted its rows go by cascade after it, so the owner is no longer found here: the
-- docs trigger below takes the whole document off instead.
CREATE OR REPLACE FUNCTION ds_storage_doc_rows() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO owner FROM docs WHERE id = NEW.doc_id;
    IF owner IS NOT NULL THEN PERFORM ds_storage_add(owner, octet_length(NEW.payload)); END IF;
    RETURN NEW;
  END IF;
  SELECT user_id INTO owner FROM docs WHERE id = OLD.doc_id;
  IF owner IS NOT NULL THEN PERFORM ds_storage_add(owner, -octet_length(OLD.payload)); END IF;
  RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER doc_updates_storage AFTER INSERT OR DELETE ON doc_updates
  FOR EACH ROW EXECUTE FUNCTION ds_storage_doc_rows();
--> statement-breakpoint
CREATE TRIGGER doc_snapshots_storage AFTER INSERT OR DELETE ON doc_snapshots
  FOR EACH ROW EXECUTE FUNCTION ds_storage_doc_rows();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ds_storage_doc_delete() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM ds_storage_add(OLD.user_id, -(
    (SELECT coalesce(sum(octet_length(payload)), 0) FROM doc_updates WHERE doc_id = OLD.id) +
    (SELECT coalesce(sum(octet_length(payload)), 0) FROM doc_snapshots WHERE doc_id = OLD.id)));
  RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER docs_storage BEFORE DELETE ON docs
  FOR EACH ROW EXECUTE FUNCTION ds_storage_doc_delete();
--> statement-breakpoint
-- Attachments count with their declared size from the moment they are registered.
CREATE OR REPLACE FUNCTION ds_storage_attachment() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM ds_storage_add(NEW.user_id, NEW.size);
    RETURN NEW;
  END IF;
  PERFORM ds_storage_add(OLD.user_id, -OLD.size);
  RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER attachments_storage AFTER INSERT OR DELETE ON attachments
  FOR EACH ROW EXECUTE FUNCTION ds_storage_attachment();
--> statement-breakpoint
-- Bytes stored by the owner of a document (quota checks on every write path).
CREATE OR REPLACE FUNCTION ds_storage_of_doc(doc uuid) RETURNS bigint
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.storage_bytes FROM docs d JOIN users u ON u.id = d.user_id WHERE d.id = doc;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_storage_add(uuid, bigint) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_storage_of_doc(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION ds_storage_of_doc(uuid) TO ds_agent;
--> statement-breakpoint
UPDATE users u SET storage_bytes =
  coalesce((SELECT sum(octet_length(x.payload)) FROM doc_updates x JOIN docs d ON d.id = x.doc_id WHERE d.user_id = u.id), 0) +
  coalesce((SELECT sum(octet_length(x.payload)) FROM doc_snapshots x JOIN docs d ON d.id = x.doc_id WHERE d.user_id = u.id), 0) +
  coalesce((SELECT sum(a.size) FROM attachments a WHERE a.user_id = u.id), 0);
