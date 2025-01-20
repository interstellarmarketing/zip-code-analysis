type RequiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export const checkEnvironmentVariables = (): boolean => {
  const requiredEnvVars: RequiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };

  const missingEnvVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  // Validate URL format
  try {
    new URL(requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be a valid URL'
    );
  }

  return true;
}; 