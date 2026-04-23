CREATE TABLE "game_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"game_state_index" integer NOT NULL,
	"relics" text[] NOT NULL,
	"relic_tip_map" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"seed" text NOT NULL,
	"channel" text NOT NULL,
	"game" text NOT NULL,
	"character" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "game_states" ADD CONSTRAINT "game_states_run_id_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("run_id") ON DELETE no action ON UPDATE no action;