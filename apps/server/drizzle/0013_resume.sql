CREATE TABLE "server_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_docs" (
	"user_id" uuid NOT NULL,
	"doc_id" uuid NOT NULL,
	"granted_pos" bigint NOT NULL,
	"removed_pos" bigint,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_docs_user_id_doc_id_pk" PRIMARY KEY("user_id","doc_id")
);
--> statement-breakpoint
ALTER TABLE "docs" ADD COLUMN "changed_pos" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_docs" ADD CONSTRAINT "user_docs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Agent edits append updates too, so their transactions set the change-log position (sync protocol 3).
GRANT UPDATE (changed_pos) ON docs TO ds_agent;
