import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/generated", () => ({ listGeneratedRoadmaps: vi.fn() }));

import { auth } from "@/auth";
import { listGeneratedRoadmaps } from "@/lib/db/generated";
import { GET } from "./route";

const authMock = vi.mocked(auth);
const listMock = vi.mocked(listGeneratedRoadmaps);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/me/library", () => {
  it("401 when signed out", async () => {
    authMock.mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the caller's generated items", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } } as never);
    listMock.mockResolvedValue([
      {
        itemId: "gi-1",
        roadmapId: "rm-1",
        title: "TS Path",
        createdAt: "2026-07-09T00:00:00.000Z",
        stageCount: 4,
        topicCount: 18,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ roadmapId: "rm-1", topicCount: 18 });
    expect(listMock).toHaveBeenCalledWith("u1");
  });
});
