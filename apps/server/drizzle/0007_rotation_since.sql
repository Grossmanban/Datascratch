ALTER TABLE "docs" ADD COLUMN "pending_since_version" integer;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "pending_since_version" integer;--> statement-breakpoint
-- The flag now also remembers the key version it was set at (D-54): a second device of the
-- owner can tell whether step 1 of the rotation (rotate) is already done.
UPDATE notebooks SET pending_since_version = key_version WHERE key_rotation_pending;
--> statement-breakpoint
UPDATE docs SET pending_since_version = key_version WHERE key_rotation_pending;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ds_member_gone() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wrapped_key IS NOT NULL THEN
    IF OLD.notebook_id IS NOT NULL THEN
      UPDATE notebooks SET key_rotation_pending = true,
        pending_since_version = CASE WHEN key_rotation_pending THEN pending_since_version ELSE key_version END
        WHERE id = OLD.notebook_id;
    ELSE
      UPDATE docs SET key_rotation_pending = true,
        pending_since_version = CASE WHEN key_rotation_pending THEN pending_since_version ELSE key_version END
        WHERE id = OLD.note_id;
    END IF;
  END IF;
  RETURN OLD;
END $$;
