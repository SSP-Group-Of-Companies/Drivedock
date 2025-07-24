import { NextResponse } from 'next/server';

export const GET = () => {
  return NextResponse.json({ message: 'Dummy GET request successful!' });
} 
 