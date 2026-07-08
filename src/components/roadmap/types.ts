import type { ResourceKind } from "@/lib/schemas/content";

export type DrawerResource = {
  kind: ResourceKind;
  title: string;
  url: string;
  domain: string;
};

export type DrawerTopic = {
  nodeId: string;
  eyebrow: string; // e.g. "Topic 04"
  title: string;
  bodyHtml: string;
  resources: DrawerResource[];
};
