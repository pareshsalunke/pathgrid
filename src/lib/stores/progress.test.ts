import { describe, it, expect, beforeEach } from "vitest";
import { useProgress, progressPct } from "./progress";

describe("progress store", () => {
  beforeEach(() => {
    useProgress.setState({ byRoadmap: {} });
    localStorage.clear();
  });

  it("sets and reads a node status", () => {
    useProgress.getState().setStatus("r1", "n1", "done");
    expect(useProgress.getState().byRoadmap.r1.n1).toBe("done");
  });

  it("keeps statuses per roadmap and per node", () => {
    const { setStatus } = useProgress.getState();
    setStatus("r1", "n1", "done");
    setStatus("r1", "n2", "learning");
    setStatus("r2", "n1", "skipped");
    const state = useProgress.getState().byRoadmap;
    expect(state.r1).toEqual({ n1: "done", n2: "learning" });
    expect(state.r2).toEqual({ n1: "skipped" });
  });

  it("computes progress percent from done nodes", () => {
    const { setStatus } = useProgress.getState();
    setStatus("r1", "n1", "done");
    setStatus("r1", "n2", "learning");
    const map = useProgress.getState().byRoadmap.r1;
    expect(progressPct(map, ["n1", "n2", "n3", "n4"])).toBe(25);
    expect(progressPct(undefined, ["n1"])).toBe(0);
    expect(progressPct({}, [])).toBe(0);
  });
});
