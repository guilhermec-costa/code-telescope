type IvyLayoutResizerOptions = {
  minHeight?: number;
  maxHeight?: number;
  onResizeEnd?: (heightVh: number) => void;
};

export class HorizontalLayoutResizer {
  private isDragging = false;

  private readonly container: HTMLElement;
  private readonly resizer: HTMLElement;
  private startMouseY = 0;
  private startHeight = 0;

  constructor(private readonly options: IvyLayoutResizerOptions = {}) {
    this.container = document.getElementById("container");
    this.resizer = document.getElementById("horizontal-resizer")!;

    this.bind();
  }

  private bind() {
    this.resizer.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;

    this.startMouseY = e.clientY;
    this.startHeight = this.container.getBoundingClientRect().height;

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const deltaY = e.clientY - this.startMouseY;

    const { minHeight = 150, maxHeight = Infinity } = this.options;

    const nextHeight = Math.max(minHeight, Math.min(this.startHeight - deltaY, maxHeight));

    this.container.style.height = `${Math.round(nextHeight)}px`;
  };

  private onMouseUp = () => {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const heightPx = this.container.getBoundingClientRect().height;
    const viewportHeight = window.innerHeight;

    const heightVh = Math.floor(Number(((heightPx / viewportHeight) * 100).toFixed(2)));

    this.options.onResizeEnd?.(heightVh);
  };

  dispose() {
    this.resizer.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}
