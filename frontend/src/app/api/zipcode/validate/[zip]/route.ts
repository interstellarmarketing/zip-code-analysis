import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { zip: string } }
) {
  try {
    console.log('Validating ZIP code:', params.zip);
    
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Making request to backend:', `${BACKEND_URL}/zipcodes/validate/${params.zip}`);
    
    // Forward request to backend
    const response = await fetch(
      `${BACKEND_URL}/zipcodes/validate/${params.zip}`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('Backend response:', { status: response.status, data });

    if (!response.ok) {
      console.error('Backend error:', data);
      return NextResponse.json(
        { error: data.detail || 'Failed to validate ZIP code' },
        { status: response.status }
      );
    }

    if (!data.city || !data.state) {
      console.error('Invalid backend response:', data);
      return NextResponse.json(
        { error: 'Invalid response from backend: missing city or state data' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('ZIP validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 