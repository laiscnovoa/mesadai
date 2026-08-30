LOCK TABLE "families" IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
ALTER TABLE "families" ALTER COLUMN "pin" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "parent_pin_lookup" text;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'families_pin_unique'
      AND conrelid = 'families'::regclass
  ) THEN
    ALTER TABLE "families"
      ADD CONSTRAINT "families_pin_unique" UNIQUE ("pin");
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'families_parent_pin_lookup_unique'
      AND conrelid = 'families'::regclass
  ) THEN
    ALTER TABLE "families"
      ADD CONSTRAINT "families_parent_pin_lookup_unique" UNIQUE ("parent_pin_lookup");
  END IF;
END
$$;