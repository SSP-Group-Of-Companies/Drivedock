import { NextResponse } from "next/server";

export function successResponse(
  status: number = 200,
  message: string = "Request successful",
  data: Record<string, unknown> = {}
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
  errors?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors && { errors }),
    },
    { status }
  );
}
