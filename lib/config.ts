export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash',
    temperature: 0.1,
    maxTokens: 4096,
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || '',
    searchDepth: 'basic',
    maxResults: 10,
  },
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    secretKey: process.env.CLERK_SECRET_KEY || '',
  },
} as const;

export const validateConfig = () => {
  const requiredKeys = [
    'GEMINI_API_KEY',
    'TAVILY_API_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }
};
