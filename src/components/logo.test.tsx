import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("is announced as Thevio and follows the text colour", () => {
    render(<Logo />);
    const logo = screen.getByRole("img", { name: "Thevio" });
    expect(logo.getAttribute("fill")).toBe("currentColor");
    expect(logo.querySelectorAll("path")).toHaveLength(3);
  });

  it("stays silent when the name is written next to it", () => {
    const { container } = render(<Logo decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
