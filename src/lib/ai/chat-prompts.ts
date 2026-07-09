import type { RoadmapGraph } from "@/lib/schemas/graph";
import type { ProgressStatus } from "@/lib/schemas/progress";

/**
 * Prompt builders for the tutor chat (docs/06 §3.7 skeleton). Context is always
 * assembled server-side from the DB — never trusted from the client (doc 05 §4).
 * Pure module — safe to unit test without any SDK.
 */

/** Keep the drawer body from dominating the context window. */
const TOPIC_BODY_CAP = 2_000;
/** Per-message cap inside the summarizer transcript. */
const SUMMARY_MSG_CAP = 1_000;

/**
 * Compact "node · status" outline (doc 06 §3.7): content nodes only, in
 * data.order sequence, one line each — `3. CSS — learning (optional)`.
 */
export function buildPathOutline(
  graph: RoadmapGraph,
  statuses: Record<string, ProgressStatus>,
): string {
  const content = graph.nodes
    .filter((n) => n.type === "topic" || n.type === "subtopic")
    .map((n, i) => ({ n, i }))
    .sort((a, b) => {
      const ao = a.n.data.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.n.data.order ?? Number.MAX_SAFE_INTEGER;
      return ao === bo ? a.i - b.i : ao - bo; // undefined order last, stable
    })
    .map(({ n }) => n);

  return content
    .map((n, i) => {
      const status = statuses[n.id] ?? "pending";
      const optional = n.data.optional ? " (optional)" : "";
      return `${i + 1}. ${n.data.label} — ${status}${optional}`;
    })
    .join("\n");
}

export type TutorOpenTopic = {
  title: string;
  /** null for AI-generated maps (no topics rows) — the tutor answers from its own knowledge. */
  bodyMd: string | null;
};

export function tutorSystemPrompt({
  roadmap,
  openTopic,
  summary,
}: {
  roadmap?: { title: string; outline: string } | null;
  openTopic?: TutorOpenTopic | null;
  summary?: string | null;
}): string {
  const lines: string[] = [];

  if (roadmap) {
    // doc 06 §3.7 skeleton, ProductName = Pathgrid.
    lines.push(
      `You are the tutor for the "${roadmap.title}" learning path on Pathgrid. ` +
        'Ground every answer in the path below; when the user asks "what next", use ' +
        "their progress. Be concise; prefer pointing to a node over long lectures; " +
        "say when something is outside this path.",
    );
  } else {
    lines.push(
      "You are the tutor on Pathgrid, a learning-roadmap site. Answer one-off " +
        "questions about learning technical skills. Be concise and practical; when a " +
        "question is really a whole learning path, suggest generating a roadmap on Pathgrid.",
    );
  }

  lines.push(
    "Reply in plain text: short paragraphs and simple numbered or dashed lists only — " +
      "no markdown headings, bold, tables, or code fences unless the user explicitly asks for code.",
  );

  if (roadmap) {
    lines.push("", "PATH OUTLINE (node · status):", roadmap.outline);
  }

  if (openTopic) {
    const body = openTopic.bodyMd?.trim()
      ? truncate(openTopic.bodyMd.trim(), TOPIC_BODY_CAP)
      : "(No stored notes for this topic yet — explain it from your own knowledge, scoped to this path.)";
    lines.push("", `CURRENTLY OPEN TOPIC: ${openTopic.title}`, body);
  }

  if (summary?.trim()) {
    lines.push("", "EARLIER CONVERSATION SUMMARY:", summary.trim());
  }

  return lines.join("\n");
}

/**
 * Rolling-summary prompts (doc 05 §4 "cap history ~20; summarize older turns").
 * Runs on the fast tier; folds `messages` into the prior summary.
 */
export function summarizePrompts({
  priorSummary,
  messages,
}: {
  priorSummary: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
}): { system: string; prompt: string } {
  const transcript = messages
    .map((m) => `${m.role}: ${truncate(m.content, SUMMARY_MSG_CAP)}`)
    .join("\n");
  return {
    system:
      "You compress tutoring conversations into concise memory notes for the tutor's " +
      "own later use. Keep facts, learner goals, decisions, and progress; drop pleasantries.",
    prompt: [
      priorSummary?.trim()
        ? `Existing summary of even earlier turns:\n${priorSummary.trim()}`
        : "There is no existing summary.",
      "",
      "New conversation turns to fold in:",
      transcript,
      "",
      "Return the updated summary as plain text, at most 200 words. No preamble.",
    ].join("\n"),
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
