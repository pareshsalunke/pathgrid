import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Container } from "./Container";

describe("Container", () => {
  it("renders its children", () => {
    render(<Container>hello</Container>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("caps width at 1280px by default and 1440px when wide", () => {
    const { rerender, container } = render(<Container>x</Container>);
    expect(container.firstChild).toHaveClass("max-w-[1280px]");

    rerender(<Container wide>x</Container>);
    expect(container.firstChild).toHaveClass("max-w-[1440px]");
  });
});
