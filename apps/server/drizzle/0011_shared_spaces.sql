ALTER TYPE "public"."doc_kind" ADD VALUE 'space';--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"wrapped_key" "bytea" NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"key_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_rotation_pending" boolean DEFAULT false NOT NULL,
	"pending_since_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_one_target";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_one_target";--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "space_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "space_id" uuid;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "space_id" uuid;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spaces_user_idx" ON "spaces" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitations_space_idx" ON "invitations" USING btree ("space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_space_user_idx" ON "members" USING btree ("space_id","user_id");--> statement-breakpoint
CREATE INDEX "notebooks_space_idx" ON "notebooks" USING btree ("space_id");--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_one_target" CHECK (num_nonnulls("invitations"."notebook_id", "invitations"."note_id", "invitations"."space_id") = 1);--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_one_target" CHECK (num_nonnulls("members"."notebook_id", "members"."note_id", "members"."space_id") = 1);--> statement-breakpoint
-- A member who had the key is gone: the owner's client must rotate the key (crypto.md §10.3, §11.4).
CREATE OR REPLACE FUNCTION ds_member_gone() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wrapped_key IS NOT NULL THEN
    IF OLD.notebook_id IS NOT NULL THEN
      UPDATE notebooks SET key_rotation_pending = true,
        pending_since_version = CASE WHEN key_rotation_pending THEN pending_since_version ELSE key_version END
        WHERE id = OLD.notebook_id;
    ELSIF OLD.space_id IS NOT NULL THEN
      UPDATE spaces SET key_rotation_pending = true,
        pending_since_version = CASE WHEN key_rotation_pending THEN pending_since_version ELSE key_version END
        WHERE id = OLD.space_id;
    ELSE
      UPDATE docs SET key_rotation_pending = true,
        pending_since_version = CASE WHEN key_rotation_pending THEN pending_since_version ELSE key_version END
        WHERE id = OLD.note_id;
    END IF;
  END IF;
  RETURN OLD;
END $$;
--> statement-breakpoint
-- Agents of a member of a shared space (D-62, as the D-54 amendment): the space's agent-mode
-- notebooks, with the member's role. «All notebooks» of a grant still means the user's own.
CREATE OR REPLACE FUNCTION ds_agent_notebooks(need_write boolean) RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id
  FROM notebooks n
  WHERE n.mode = 'agent'
    AND (
      n.user_id = ds_agent_user_id()
      OR EXISTS (
        SELECT 1 FROM members m
        WHERE (m.notebook_id = n.id OR (n.space_id IS NOT NULL AND m.space_id = n.space_id))
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
