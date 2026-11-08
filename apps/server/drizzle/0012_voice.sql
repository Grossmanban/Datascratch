CREATE TABLE "voice_usage" (
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "voice_usage_user_id_month_pk" PRIMARY KEY("user_id","month")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "voice_enabled" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "voice_minutes_quota" integer;--> statement-breakpoint
ALTER TABLE "voice_usage" ADD CONSTRAINT "voice_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;