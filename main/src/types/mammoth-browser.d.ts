// src/types/mammoth-browser.d.ts

declare module "mammoth" {
  // Very small surface area we use; expand later if needed.
  export type MammothMessage = { type?: string; message?: string };

  export type ConvertToHtmlInput = { arrayBuffer: ArrayBuffer } | { arrayBuffer: Uint8Array };

  export interface ConvertToHtmlResult {
    value: string; // HTML string
    messages: MammothMessage[]; // warnings/info
  }

  // Options kept loose; you can tighten if you start using them.
  export function convertToHtml(input: ConvertToHtmlInput, options?: unknown): Promise<ConvertToHtmlResult>;
}

declare module "mammoth/mammoth.browser" {
  export * from "mammoth";
}
