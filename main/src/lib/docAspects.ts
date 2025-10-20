export const DOC_ASPECTS = {
  ID: 1.6,                 // typical ID/driver's licence
  PASSPORT: 1.42,          // MRZ page approx
  LETTER_PORTRAIT: 8.5/11, // 0.7727
  FREE: null,
} as const;
export type DocAspectKey = keyof typeof DOC_ASPECTS;
