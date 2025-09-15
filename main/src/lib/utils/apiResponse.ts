// src/lib/utils/apiResponse.ts
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import formatMongooseValidationError from "./formatMongooseValidationError";
import { EEApiErrorType } from "@/types/apiError.types";

export function successResponse(status: number = 200, message: string = "Request successful", data = {}) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export class AppError extends Error {
  status: number;
  code?: EEApiErrorType;
  /** optional metadata to help clients or the response builder (e.g., clearCookieHeader, reason, etc.) */
  meta?: Record<string, unknown>;

  constructor(status: number, message: string, code?: EEApiErrorType, meta?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

export function errorResponse(statusOrError: unknown, msgOrError?: unknown, extraErrors: Record<string, unknown> = {}) {
  let status = 500;
  let message = "An error occurred";
  let code: EEApiErrorType | undefined;
  let meta: Record<string, unknown> | undefined;

  if (typeof statusOrError !== "number") {
    const err = statusOrError;

    if (err instanceof AppError) {
      status = err.status;
      message = err.message;
      code = err.code;
      meta = err.meta;
    } else if (err instanceof mongoose.Error.ValidationError) {
      status = 400;
      message = formatMongooseValidationError(err);
      code = EEApiErrorType.VALIDATION_ERROR;
    } else if (err instanceof Error) {
      message = err.message;
      code = EEApiErrorType.INTERNAL;
    } else if (typeof err === "string") {
      message = err;
      code = EEApiErrorType.INTERNAL;
    }
  } else {
    status = statusOrError;
    if (typeof msgOrError === "string") {
      message = msgOrError;
    } else if (msgOrError instanceof Error) {
      message = (msgOrError as Error).message;
    }
  }

  const payload: any = {
    success: false,
    message,
  };
  if (code) payload.code = code;
  if (meta && Object.keys(meta).length > 0) payload.meta = meta;
  if (extraErrors && Object.keys(extraErrors).length > 0) payload.errors = extraErrors;

  const res = NextResponse.json(payload, { status });

  // If the thrown AppError included a cookie to clear or any Set-Cookie headers, append them.
  // We avoid importing other utils here to prevent circular deps; instead callers provide headers via meta.
  if (meta && typeof meta === "object") {
    const clearCookieHeader = (meta as any).clearCookieHeader as string | undefined;
    const setCookies = (meta as any).setCookies as string[] | undefined;

    if (clearCookieHeader) {
      res.headers.append("set-cookie", clearCookieHeader);
    }
    if (Array.isArray(setCookies)) {
      for (const c of setCookies) res.headers.append("set-cookie", c);
    }
  }

  return res;
}
