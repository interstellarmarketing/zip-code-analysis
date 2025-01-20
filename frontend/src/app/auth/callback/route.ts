import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${origin}/auth/error`);
    }
  }

  // URL to redirect to after sign in process completes
  if (redirectTo) {
    // Ensure the redirect URL is relative to prevent open redirect vulnerabilities
    const redirectUrl = new URL(redirectTo, origin);
    if (redirectUrl.origin === origin) {
      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  // Default redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`);
} 