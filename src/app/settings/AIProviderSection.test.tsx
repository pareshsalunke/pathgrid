import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIProviderSection } from "./AIProviderSection";
import { useAIProvider } from "@/lib/stores/ai-provider";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("AIProviderSection", () => {
  beforeEach(() => {
    useAIProvider.setState({ provider: "anthropic", keys: {}, models: {} });
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders provider pills and the active provider's key field", () => {
    render(<AIProviderSection />);
    expect(
      screen.getByRole("button", { name: "Anthropic" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OpenAI" })).toBeInTheDocument();
    expect(screen.getByLabelText("Anthropic API key")).toBeInTheDocument();
  });

  it("switching provider updates the key label and model options", () => {
    render(<AIProviderSection />);
    fireEvent.click(screen.getByRole("button", { name: "OpenAI" }));
    expect(screen.getByLabelText("OpenAI API key")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "gpt-4o" })).toBeInTheDocument();
  });

  it("Show/Hide toggles the key input type", () => {
    render(<AIProviderSection />);
    const input = screen.getByLabelText(
      "Anthropic API key",
    ) as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(input.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(input.type).toBe("password");
  });

  it("choosing Custom… reveals a free-text model input", () => {
    render(<AIProviderSection />);
    const smart = screen.getByLabelText("Smart model") as HTMLSelectElement;
    fireEvent.change(smart, { target: { value: "__custom__" } });
    expect(
      screen.getByLabelText("Smart model (custom id)"),
    ).toBeInTheDocument();
  });

  it("Test key reports a valid key on success", async () => {
    useAIProvider.setState({ keys: { anthropic: "sk-ant-1" } });
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AIProviderSection />);
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    expect(await screen.findByText(/Key valid/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/test-key",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("Test key surfaces the mapped provider error", async () => {
    useAIProvider.setState({ keys: { anthropic: "bad" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          ok: false,
          code: "invalid_key",
          message: "That key was rejected.",
        }),
      ),
    );
    render(<AIProviderSection />);
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    expect(
      await screen.findByText(/That key was rejected/),
    ).toBeInTheDocument();
  });

  it("prompts for a key and does not call the API when none is set", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AIProviderSection />);
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    expect(
      await screen.findByText(/Add your API key first/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
