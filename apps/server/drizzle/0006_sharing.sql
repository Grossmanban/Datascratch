CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"notebook_id" uuid,
	"note_id" uuid,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "invitations_one_target" CHECK (num_nonnulls("invitations"."notebook_id", "invitations"."note_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"notebook_id" uuid,
	"note_id" uuid,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"account_created_after_invite" boolean NOT NULL,
	"wrapped_key" "bytea",
	"key_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_one_target" CHECK (num_nonnulls("members"."notebook_id", "members"."note_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "doc_snapshots" ADD COLUMN "authors" jsonb;--> statement-breakpoint
ALTER TABLE "doc_updates" ADD COLUMN "author" jsonb;--> statement-breakpoint
ALTER TABLE "docs" ADD COLUMN "key_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "docs" ADD COLUMN "owner_wrapped_key" "bytea";--> statement-breakpoint
ALTER TABLE "docs" ADD COLUMN "key_chain" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "docs" ADD COLUMN "key_rotation_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "key_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "key_chain" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "key_rotation_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "box_public_key" "bytea";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "box_wrapped_secret_key" "bytea";--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_note_id_docs_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_note_id_docs_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitations_owner_idx" ON "invitations" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_notebook_idx" ON "invitations" USING btree ("notebook_id");--> statement-breakpoint
CREATE INDEX "invitations_note_idx" ON "invitations" USING btree ("note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_notebook_user_idx" ON "members" USING btree ("notebook_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_note_user_idx" ON "members" USING btree ("note_id","user_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
-- A member who had the key is gone (removed, left, or deleted the account): the owner's client
-- must rotate the key (crypto.md §10.3). When the target itself is being deleted the update
-- finds no row, which is fine.
CREATE OR REPLACE FUNCTION ds_member_gone() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wrapped_key IS NOT NULL THEN
    IF OLD.notebook_id IS NOT NULL THEN
      UPDATE notebooks SET key_rotation_pending = true WHERE id = OLD.notebook_id;
    ELSE
      UPDATE docs SET key_rotation_pending = true WHERE id = OLD.note_id;
    END IF;
  END IF;
  RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER members_gone AFTER DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION ds_member_gone();
--> statement-breakpoint
REVOKE ALL ON FUNCTION ds_member_gone() FROM PUBLIC;
--> statement-breakpoint
-- Authors of the updates stored so far (D-54): before sharing only the owner wrote as a user;
-- agents are known by their device id; guests' share ids are not recoverable.
UPDATE doc_updates u SET author = CASE
    WHEN u.device_id LIKE 'agent:%' THEN jsonb_build_object('kind', 'agent', 'tokenId', substr(u.device_id, 7))
    ELSE jsonb_build_object('kind', 'user', 'userId', d.user_id)
  END
  FROM docs d
  WHERE d.id = u.doc_id AND u.author IS NULL AND u.device_id NOT LIKE 'guest:%';
