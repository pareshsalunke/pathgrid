import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize) // model-generated markdown is untrusted (CLAUDE.md guardrail)
  .use(rehypeStringify);

/** Render markdown to sanitized HTML. Server-only so no parser ships to the client. */
export async function renderMarkdown(md: string): Promise<string> {
  if (!md.trim()) return "";
  const file = await processor.process(md);
  return String(file);
}
