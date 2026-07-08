/** Marketing copy for the home page. Roadmap cards now come from the DB
 *  (see src/lib/db/roadmaps.ts listCatalog); the changelog is static prose. */

export type ChangelogEntry = {
  date: string;
  text: string;
};

export const changelog: ChangelogEntry[] = [
  {
    date: "Jun 28",
    text: "Team paths — share one roadmap, see everyone's progress",
  },
  { date: "Jun 14", text: "Tutor can now cite the exact node it's explaining" },
  { date: "May 30", text: "List view for every canvas — full keyboard path" },
];
