import { NextResponse } from "next/server";

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
  status: number = 500,
  message: string = "An error occurred",
  errors = {}
) {
  // Standardize error messages for frontend alignment
  const standardizedMessage = message
    .replace(/^Invalid /, "")
    .replace(/\.$/, "");

  return NextResponse.json(
    {
      success: false,
      message: standardizedMessage,
      ...(errors && { errors }),
    },
    { status }
  );
}
