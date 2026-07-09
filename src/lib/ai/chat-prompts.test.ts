import { describe, it, expect } from "vitest";
import {
  buildPathOutline,
  tutorSystemPrompt,
  summarizePrompts,
} from "./chat-prompts";
import type { RoadmapGraph } from "@/lib/schemas/graph";

const graph: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "Frontend", level: "beginner", estHours: 10 },
  nodes: [
    { id: "title", type: "title", data: { label: "Frontend" } },
    { id: "sec", type: "section", data: { label: "Basics", order: 1 } },
    { id: "css", type: "topic", data: { label: "CSS", slug: "css", order: 3 } },
    {
      id: "html",
      type: "topic",
      data: { label: "HTML", slug: "html", order: 2 },
    },
    {
      id: "a11y",
      type: "subtopic",
      data: { label: "Accessibility", slug: "a11y", optional: true },
    },
  ],
  edges: [],
};

describe("buildPathOutline", () => {
  it("orders content nodes by data.order, statuses default pending, undefined order last", () => {
    const outline = buildPathOutline(graph, { html: "done", css: "learning" });
    expect(outline.split("\n")).toEqual([
      "1. HTML — done",
      "2. CSS — learning",
      "3. Accessibility — pending (optional)",
    ]);
  });

  it("skips title/section nodes entirely", () => {
    const outline = buildPathOutline(graph, {});
    expect(outline).not.toContain("Frontend");
    expect(outline).not.toContain("Basics");
  });
});

describe("tutorSystemPrompt", () => {
  const roadmap = { title: "Frontend", outline: "1. HTML — done" };

  it("uses the doc 06 §3.7 skeleton with the path outline", () => {
    const system = tutorSystemPrompt({ roadmap });
    expect(system).toContain(
      'You are the tutor for the "Frontend" learning path on Pathgrid.',
    );
    expect(system).toContain("PATH OUTLINE (node · status):");
    expect(system).toContain("1. HTML — done");
    expect(system).toContain("plain text");
    expect(system).not.toContain("CURRENTLY OPEN TOPIC");
    expect(system).not.toContain("EARLIER CONVERSATION SUMMARY");
  });

  it("general-tutor variant when no roadmap grounds the thread", () => {
    const system = tutorSystemPrompt({});
    expect(system).toContain("You are the tutor on Pathgrid");
    expect(system).not.toContain("PATH OUTLINE");
  });

  it("includes the open topic body, capped", () => {
    const system = tutorSystemPrompt({
      roadmap,
      openTopic: { title: "HTML", bodyMd: "x".repeat(3000) },
    });
    expect(system).toContain("CURRENTLY OPEN TOPIC: HTML");
    expect(system).toContain("x".repeat(2000) + "…");
    expect(system).not.toContain("x".repeat(2001));
  });

  it("label-only topics (generated maps) get the own-knowledge note", () => {
    const system = tutorSystemPrompt({
      roadmap,
      openTopic: { title: "Hooks", bodyMd: null },
    });
    expect(system).toContain("CURRENTLY OPEN TOPIC: Hooks");
    expect(system).toContain("No stored notes for this topic");
  });

  it("appends the rolling summary block when present", () => {
    const system = tutorSystemPrompt({ roadmap, summary: "Learner knows JS." });
    expect(system).toContain(
      "EARLIER CONVERSATION SUMMARY:\nLearner knows JS.",
    );
  });
});

describe("summarizePrompts", () => {
  it("folds new turns into the prior summary", () => {
    const { system, prompt } = summarizePrompts({
      priorSummary: "Learner knows JS.",
      messages: [
        { role: "user", content: "What about CSS?" },
        { role: "assistant", content: "Start with selectors." },
      ],
    });
    expect(system).toContain("compress tutoring conversations");
    expect(prompt).toContain(
      "Existing summary of even earlier turns:\nLearner knows JS.",
    );
    expect(prompt).toContain("user: What about CSS?");
    expect(prompt).toContain("assistant: Start with selectors.");
    expect(prompt).toContain("at most 200 words");
  });

  it("handles the first summarization (no prior summary) and caps long messages", () => {
    const { prompt } = summarizePrompts({
      priorSummary: null,
      messages: [{ role: "user", content: "y".repeat(1500) }],
    });
    expect(prompt).toContain("There is no existing summary.");
    expect(prompt).toContain("y".repeat(1000) + "…");
    expect(prompt).not.toContain("y".repeat(1001));
  });
});
