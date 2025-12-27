type SplitterOptions = {
  minLeftWidth?: number;
  maxLeftWidth?: number;
  onResizeEnd?: (width: number) => void;
};

export class HorizontalSplitter {
  private isDragging = false;
  private containerRect!: DOMRect;

  constructor(
    private readonly container: HTMLElement,
    private readonly left: HTMLElement,
    private readonly resizer: HTMLElement,
    private readonly options: SplitterOptions = {},
  ) {
    this.bind();
  }

  private bind() {
    this.resizer.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = () => {
    this.isDragging = true;

    this.containerRect = this.container.getBoundingClientRect();

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const mouseX = e.clientX;
    const relativeX = mouseX - this.containerRect.left;

    const { minLeftWidth = 200, maxLeftWidth = Infinity } = this.options;

    const width = Math.max(minLeftWidth, Math.min(relativeX, maxLeftWidth));

    this.left.style.width = `${width}px`;
  };

  private onMouseUp = () => {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const width = this.left.getBoundingClientRect().width;
    this.options.onResizeEnd?.(Math.round(width));
  };

  setLeftWidth(width: number) {
    this.left.style.width = `${width}px`;
  }

  dispose() {
    this.resizer.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}
