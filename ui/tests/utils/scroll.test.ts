import { describe, expect, it, vi } from "vitest";
import { centerElementVertically } from "../../utils/scroll";

describe("centerElementVertically", () => {
  it("centers vertically without changing horizontal scroll", () => {
    const container = document.createElement("div");
    const element = document.createElement("span");
    container.appendChild(element);
    container.scrollTop = 100;
    container.scrollLeft = 72;
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 200 });
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({ top: 20 } as DOMRect);
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ top: 170, height: 20 } as DOMRect);

    centerElementVertically(container, element, "instant");

    expect(container.scrollTop).toBe(160);
    expect(container.scrollLeft).toBe(72);
  });

  it("passes the existing horizontal position to smooth scrolling", () => {
    const container = document.createElement("div");
    const element = document.createElement("span");
    container.appendChild(element);
    container.scrollLeft = 48;
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 100 });
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ top: 150, height: 20 } as DOMRect);
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo;

    centerElementVertically(container, element, "smooth");

    expect(scrollTo).toHaveBeenCalledWith({ top: 110, left: 48, behavior: "smooth" });
  });
});
