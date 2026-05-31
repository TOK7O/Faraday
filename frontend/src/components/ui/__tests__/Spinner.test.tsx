import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Spinner } from "../Spinner";

describe("Spinner", () => {
  it("should render spinner container and the inner SVG icon", () => {
    const { container } = render(<Spinner />);
    
    const containerDiv = container.querySelector(".spinner-container");
    expect(containerDiv).toBeInTheDocument();
    
    // Lucide-react Loader2 renders as an SVG
    const svgIcon = container.querySelector("svg");
    expect(svgIcon).toBeInTheDocument();
    expect(svgIcon).toHaveClass("animate-spin");
  });

  it("should apply default size (24) and color (currentColor) if props are not provided", () => {
    const { container } = render(<Spinner />);
    const svgIcon = container.querySelector("svg");
    
    expect(svgIcon).toHaveAttribute("width", "24");
    expect(svgIcon).toHaveAttribute("height", "24");
    expect(svgIcon).toHaveAttribute("stroke", "currentColor");
  });

  it("should apply custom size and color from props", () => {
    const { container } = render(<Spinner size={48} color="#ff0000" />);
    const svgIcon = container.querySelector("svg");
    
    expect(svgIcon).toHaveAttribute("width", "48");
    expect(svgIcon).toHaveAttribute("height", "48");
    expect(svgIcon).toHaveAttribute("stroke", "#ff0000");
  });

  it("should append custom className to the container", () => {
    const { container } = render(<Spinner className="extra-class-123" />);
    const containerDiv = container.querySelector(".spinner-container");
    
    expect(containerDiv).toHaveClass("extra-class-123");
  });
});
