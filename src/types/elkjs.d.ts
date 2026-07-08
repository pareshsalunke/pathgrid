declare module "elkjs/lib/elk.bundled.js" {
  export interface ElkNode {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    children?: ElkNode[];
  }
  export interface ElkLayoutArgs {
    id: string;
    layoutOptions?: Record<string, string>;
    children?: Array<{ id: string; width: number; height: number }>;
    edges?: Array<{ id: string; sources: string[]; targets: string[] }>;
  }
  export default class ELK {
    layout(graph: ElkLayoutArgs): Promise<ElkNode>;
  }
}
