import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { RoadmapGraph } from "@/lib/schemas/graph";

// The real EditorCanvas renders React Flow (needs a laid-out DOM); stub it so the
// test targets the palette / panel / top-bar / autosave wiring, not RF internals.
vi.mock("@/components/editor/EditorCanvas", () => ({
  EditorCanvas: () => <div data-testid="canvas" />,
}));
vi.mock("@/components/layout/AppHeader", () => ({ AppHeader: () => null }));
// Stub the AI-assist popover (needs a SessionProvider + the BYOK store); this test
// targets the palette / panel / autosave wiring, and the popover is covered by
// AiAssistPopover.test.tsx.
vi.mock("@/components/editor/AiAssistPopover", () => ({
  AiAssistPopover: () => <div data-testid="ai-assist" />,
}));

import { EditorScreen } from "./EditorScreen";

const graph: RoadmapGraph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "My Path", level: "beginner", estHours: 8 },
  nodes: [
    {
      id: "t",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "My Path" },
    },
    {
      id: "a",
      type: "topic",
      position: { x: 0, y: 120 },
      data: { label: "A", slug: "a" },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "t",
      target: "a",
      data: { style: "solid", kind: "sequence" },
    },
  ],
};

function renderEditor() {
  return render(
    <EditorScreen
      roadmapId="r1"
      initialGraph={graph}
      initialTitle="My Path"
      initialVisibility="private"
    />,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("EditorScreen", () => {
  it("shows the title in the top bar and an empty properties panel", () => {
    renderEditor();
    expect(screen.getByLabelText("Roadmap title")).toHaveValue("My Path");
    expect(screen.getByText(/Select a node to edit it/)).toBeInTheDocument();
  });

  it("adds a topic from the palette, auto-selecting it in the panel", () => {
    renderEditor();
    fireEvent.click(screen.getByText("+ Topic"));
    // The new node is selected → the panel shows its editable label + a delete action.
    expect(screen.getByLabelText("Node label")).toHaveValue("New topic");
    expect(
      screen.getByRole("button", { name: "Delete node" }),
    ).toBeInTheDocument();
  });

  it("renames the selected node via the panel label field", () => {
    renderEditor();
    fireEvent.click(screen.getByText("+ Subtopic"));
    const label = screen.getByLabelText("Node label");
    fireEvent.change(label, { target: { value: "Indexes" } });
    expect(label).toHaveValue("Indexes");
  });

  it("autosaves a valid edit to PATCH /api/editor/[id]", async () => {
    renderEditor();
    fireEvent.click(screen.getByText("+ Topic"));

    await waitFor(
      () =>
        expect(fetch).toHaveBeenCalledWith(
          "/api/editor/r1",
          expect.objectContaining({ method: "PATCH" }),
        ),
      { timeout: 2000 },
    );

    const body = JSON.parse(
      (
        vi
          .mocked(fetch)
          .mock.calls.find((c) => c[0] === "/api/editor/r1")![1] as RequestInit
      ).body as string,
    );
    expect(body.graph.nodes).toHaveLength(3); // title + original topic + the new one
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });
});
