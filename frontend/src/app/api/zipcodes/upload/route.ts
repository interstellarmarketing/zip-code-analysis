import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export async function POST(request: NextRequest) {
  try {
    console.log('API route: Received upload request');
    const formData = await request.formData();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      console.log('API route: No authorization header found');
      return NextResponse.json(
        { detail: 'No authorization token provided' },
        { status: 401 }
      );
    }
    
    // Get the file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { detail: 'No file provided' },
        { status: 400 }
      );
    }

    // Log file details
    console.log('API route: File details:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { detail: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { detail: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }
    
    // Log the form data entries
    console.log('API route: Form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`- ${key}: ${value instanceof File ? `File(${value.name}, ${(value.size / 1024).toFixed(2)} KB)` : value}`);
    }
    
    console.log('API route: Forwarding request to backend at', BACKEND_URL);
    try {
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      console.log('API route: Sending request with auth header:', authHeader.substring(0, 15) + '...');
      
      // Create the full URL and log it
      const url = `${BACKEND_URL}/zipcodes/upload`;
      console.log('API route: Full URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': authHeader,
          // Don't set Content-Type, let the browser set it with the boundary
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('API route: Backend response status:', response.status);
      
      // Try to read the response text first
      const responseText = await response.text();
      console.log('API route: Raw response:', responseText);
      
      // Then parse it as JSON if possible
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('API route: Failed to parse response as JSON:', e);
        return NextResponse.json(
          { detail: 'Invalid JSON response from server' },
          { status: 500 }
        );
      }
      
      console.log('API route: Backend response data:', data);

      if (!response.ok) {
        console.error('API route: Backend request failed:', data);
        return NextResponse.json(
          { detail: data.detail || 'Failed to upload file' },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('API route: Backend request error:', error);
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { detail: 'Backend request timed out after 30 seconds' },
          { status: 504 }
        );
      }
      if (error.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { detail: 'Could not connect to backend server' },
          { status: 503 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 