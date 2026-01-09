type ClassicLayoutResizerOptions = {
  minWidth?: number;
  maxWidth?: number;
  onResizeEnd?: (leftWidthVw: number, rightWidthVw: number) => void;
};

export class VerticalLayoutResizer {
  private isDragging = false;
  private containerRect!: DOMRect;

  private readonly container: HTMLElement;
  private readonly target: HTMLElement;
  private readonly resizer: HTMLElement;
  private readonly previewSide: HTMLElement;

  constructor(
    private readonly options: ClassicLayoutResizerOptions = {},
    targetElId: string,
  ) {
    this.container = document.getElementById("split")!;
    this.target = document.getElementById(targetElId)!;
    this.resizer = document.getElementById("vertical-resizer")!;
    this.previewSide = document.getElementById("preview-side")!;

    this.bind();
  }

  private bind() {
    this.resizer.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  private get searchResultsSideVw() {
    const viewportWidth = window.innerWidth;
    const widthPx = this.target.getBoundingClientRect().width;
    return Math.round((widthPx / viewportWidth) * 100);
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

    const { minWidth = 200, maxWidth = Infinity } = this.options;
    const leftSideWidth = Math.max(minWidth, Math.min(relativeX, maxWidth));

    this.target.style.width = `${leftSideWidth}px`;
    this.previewSide.style.width = `${this.container.clientWidth - leftSideWidth}px`;
  };

  private onMouseUp = () => {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const leftVw = this.searchResultsSideVw;
    const rightVw = 100 - leftVw;

    this.options.onResizeEnd?.(leftVw, rightVw);
  };

  dispose() {
    this.resizer.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}
