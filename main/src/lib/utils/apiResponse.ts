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
  statusOrError: number | unknown,
  msgOrError?: string | unknown,
  extraErrors: Record<string, any> = {}
) {
  let status = 500;
  let message = "An error occurred";

  // Case: errorResponse(error)
  if (typeof statusOrError !== "number") {
    const err = statusOrError;

    if (err instanceof mongoose.Error.ValidationError) {
      status = 400;
      message = formatMongooseValidationError(err);
    } else if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
  }

  // Case: errorResponse(400, "My message")
  else {
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
