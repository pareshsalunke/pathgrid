import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { TopicMeta, ResourceInput, Seo } from "@/lib/schemas/content";

export type TopicFixture = {
  nodeId: string; // matches a graph node id
  slug: string; // matches that node's data.slug
  title: string;
  bodyMd: string;
  meta?: TopicMeta;
  resources?: ResourceInput[];
};

export type RoadmapFixture = {
  slug: string;
  title: string;
  brief: string;
  category: "role" | "skill";
  graph: RoadmapGraph;
  topics: TopicFixture[];
  seo: Seo;
};
