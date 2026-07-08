/** Typed access to the env vars that drive absolute URLs + indexing.
 *  All absolute URLs derive from APP_URL; robots/meta indexing obeys SEO_INDEXING.
 *  Never hardcode the deployment host anywhere else (docs/08 Phase 0). */

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const env = {
  /** Canonical base URL for the current deployment. */
  appUrl: APP_URL,
  /** Parsed form, for metadataBase and URL building. */
  appUrlObject: new URL(APP_URL),
  /** true only when SEO_INDEXING=on; otherwise emit site-wide noindex. */
  seoIndexingOn: process.env.SEO_INDEXING === "on",
  /** true when AI_DISABLED=1 — kill switch for every runtime AI route (docs/05 §4). */
  aiDisabled: process.env.AI_DISABLED === "1",
};
