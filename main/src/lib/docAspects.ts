export const DOC_ASPECTS = {
  ID: 1.6,
  PASSPORT: 1.42,
  LETTER_PORTRAIT: 8.5 / 11,
  LETTER_LANDSCAPE: 11 / 8.5,
  A4_PORTRAIT: 210 / 297,
  A4_LANDSCAPE: 297 / 210,
  FREE: null,
} as const;
export type DocAspectKey = keyof typeof DOC_ASPECTS;
