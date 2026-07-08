import { z } from "zod";

/** Per-node learning status (docs/04 §2 user_topic_progress). */
export const progressStatus = z.enum([
  "pending",
  "learning",
  "done",
  "skipped",
]);
export type ProgressStatus = z.infer<typeof progressStatus>;
