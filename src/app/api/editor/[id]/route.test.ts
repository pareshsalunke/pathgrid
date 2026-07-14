import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/editor", () => ({
  updateRoadmapGraph: vi.fn(),
  setRoadmapVisibility: vi.fn(),
  setRoadmapTitle: vi.fn(),
}));
vi.mock("@/lib/track", () => ({ track: vi.fn(async () => {}) }));

import { auth } from "@/auth";
import {
  updateRoadmapGraph,
  setRoadmapVisibility,
  setRoadmapTitle,
} from "@/lib/db/editor";
import { track } from "@/lib/track";
import { PATCH } from "./route";

const authMock = vi.mocked(auth);
const updateMock = vi.mocked(updateRoadmapGraph);
const visibilityMock = vi.mocked(setRoadmapVisibility);
const titleMock = vi.mocked(setRoadmapTitle);
const trackMock = vi.mocked(track);

const USER_ID = "3f8b8f60-0f4b-4d5f-9d5c-000000000000";
const ROADMAP_ID = "3f8b8f60-0f4b-4d5f-9d5c-111111111111";

const graph = {
  $schema: "pathgrid/roadmap-graph/v1",
  meta: { title: "Map", level: "beginner", estHours: 2 },
  nodes: [
    {
      id: "t",
      type: "title",
      position: { x: 0, y: 0 },
      data: { label: "Map" },
    },
    {
      id: "a",
      type: "topic",
      position: { x: 0, y: 1 },
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

function patch(body: unknown) {
  return new Request(`http://localhost/api/editor/${ROADMAP_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ id: ROADMAP_ID }) };
const run = (body: unknown) => PATCH(patch(body), ctx);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
  updateMock.mockResolvedValue({ ok: true });
  visibilityMock.mockResolvedValue({ ok: true });
  titleMock.mockResolvedValue({ ok: true });
});

describe("PATCH /api/editor/[id] — guards", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null as never);
    expect((await run({ graph })).status).toBe(401);
  });

  it("400 invalid_body when no field is present", async () => {
    const res = await run({});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 invalid_body on a graph that fails schema validation", async () => {
    // two title nodes → superRefine fails
    const bad = {
      ...graph,
      nodes: [
        ...graph.nodes,
        {
          id: "t2",
          type: "title",
          position: { x: 0, y: 9 },
          data: { label: "X" },
        },
      ],
    };
    const res = await run({ graph: bad });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("404 when the caller does not own the roadmap", async () => {
    updateMock.mockResolvedValue({ ok: false });
    const res = await run({ graph });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });
});

describe("PATCH /api/editor/[id] — writes", () => {
  it("saves the graph, owner-scoped, and logs an event", async () => {
    const res = await run({ graph });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({
      roadmapId: ROADMAP_ID,
      ownerId: USER_ID,
      graph,
    });
    expect(trackMock).toHaveBeenCalledWith(
      "editor_graph_saved",
      expect.objectContaining({ roadmapId: ROADMAP_ID, nodes: 2 }),
      USER_ID,
    );
  });

  it("flips visibility", async () => {
    const res = await run({ visibility: "unlisted" });
    expect(res.status).toBe(200);
    expect(visibilityMock).toHaveBeenCalledWith({
      roadmapId: ROADMAP_ID,
      ownerId: USER_ID,
      visibility: "unlisted",
    });
    expect(trackMock).toHaveBeenCalledWith(
      "editor_visibility_set",
      { roadmapId: ROADMAP_ID, visibility: "unlisted" },
      USER_ID,
    );
  });

  it("updates the title (trimmed)", async () => {
    const res = await run({ title: "  New Name  " });
    expect(res.status).toBe(200);
    expect(titleMock).toHaveBeenCalledWith({
      roadmapId: ROADMAP_ID,
      ownerId: USER_ID,
      title: "New Name",
    });
  });

  it("applies graph + visibility + title together", async () => {
    const res = await run({ graph, visibility: "private", title: "Combo" });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledOnce();
    expect(visibilityMock).toHaveBeenCalledOnce();
    expect(titleMock).toHaveBeenCalledOnce();
  });
});
