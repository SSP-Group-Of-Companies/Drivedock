export {};

declare global {
  interface Window {
    Jscanify?: new () => {
      highlightPaper: (source: HTMLCanvasElement) => HTMLCanvasElement;
      extractPaper: (source: HTMLCanvasElement, w?: number, h?: number) => HTMLCanvasElement;
    };
  }
}
