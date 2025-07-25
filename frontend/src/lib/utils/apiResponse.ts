// utils/apiResponse.ts
import { NextResponse } from 'next/server';

type JsonValue = string | number | boolean | null | Record<string, any> | Array<any>;

export function successResponse(
  status: number = 200,
  message: string = 'Request successful',
  data: JsonValue = {}
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
  message: string = 'An error occurred',
  errors?: Record<string, any>
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
