import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('Login API: Received login request');
    const body = await request.json();
    
    // Convert to form data format that matches OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', body.email); // FastAPI OAuth2 expects 'username'
    formData.append('password', body.password);
    formData.append('grant_type', 'password'); // Required by OAuth2
    
    console.log('Login API: Attempting to connect to backend at', BACKEND_URL);
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData.toString(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('Login API: Received response with status:', response.status);
      
      // Read response text first
      const responseText = await response.text();
      console.log('Login API: Raw response:', responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Login API: Failed to parse response as JSON:', e);
        return NextResponse.json(
          { detail: 'Invalid response from server' },
          { status: 500 }
        );
      }

      if (!response.ok) {
        console.error('Login API: Login failed:', data);
        return NextResponse.json(
          { detail: data.detail || 'Login failed' },
          { status: response.status }
        );
      }

      console.log('Login API: Login successful');
      return NextResponse.json(data);
    } catch (error) {
      console.error('Login API: Fetch error:', error);
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { detail: 'Login request timed out' },
          { status: 504 }
        );
      }
      if (error.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { detail: 'Could not connect to authentication server' },
          { status: 503 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Login API: Unexpected error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 