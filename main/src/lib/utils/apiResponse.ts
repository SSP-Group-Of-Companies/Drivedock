import mongoose from "mongoose";
import { NextResponse } from "next/server";
import formatMongooseValidationError from "./formatMongooseValidationError";

export function successResponse(
  status: number = 200,
  message: string = "Request successful",
  data = {}
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function errorResponse(
  statusOrError: unknown,
  msgOrError?: unknown,
  extraErrors: Record<string, unknown> = {}
) {
  let status = 500;
  let message = "An error occurred";

  if (typeof statusOrError !== "number") {
    const err = statusOrError;

    if (err instanceof AppError) {
      status = err.status;
      message = err.message;
    } else if (err instanceof mongoose.Error.ValidationError) {
      status = 400;
      message = formatMongooseValidationError(err);
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
  } else {
    status = statusOrError;
    if (typeof msgOrError === "string") {
      message = msgOrError;
    } else if (msgOrError instanceof Error) {
      message = msgOrError.message;
    }
  }

  return NextResponse.json(
    {
      success: false,
      message,
      ...(extraErrors && { errors: extraErrors }),
    },
    { status }
  );
}

export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
