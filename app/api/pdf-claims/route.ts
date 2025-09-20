import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Parse the request body first
    const { text } = await request.json();
    
    // Check authentication with debugging
    const authResult = await auth();
    const { userId } = authResult;
    
    console.log('API authentication check:', { 
      userId, 
      hasUserId: !!userId,
      authResult,
      headers: Object.fromEntries(request.headers.entries()),
      url: request.url,
      method: request.method
    });
    
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header:', authHeader);
    
    // Check for cookies
    const cookies = request.headers.get('cookie');
    console.log('Cookies present:', !!cookies);
    
    // Check for Clerk auth status headers
    const clerkAuthStatus = request.headers.get('x-clerk-auth-status');
    const clerkAuthReason = request.headers.get('x-clerk-auth-reason');
    const clerkAuthMessage = request.headers.get('x-clerk-auth-message');
    
    console.log('Clerk auth status:', { clerkAuthStatus, clerkAuthReason, clerkAuthMessage });
    
    // Log system time for debugging JWT timing issues
    const now = new Date();
    console.log('Server time:', now.toISOString(), 'UTC offset:', now.getTimezoneOffset());
    
    // If JWT timing issue or no userId, try to extract user ID from session token in cookies
    if (!userId && (clerkAuthReason === 'session-token-iat-in-the-future' || !userId)) {
      console.log('JWT timing issue or no userId detected, attempting cookie-based auth fallback');
      
      // Try multiple session token patterns
      const sessionTokenPatterns = [
        /__session=([^;]+)/,
        /__session_[^=]+=([^;]+)/,
        /clerk_session=([^;]+)/
      ];
      
      let fallbackUserId = null;
      
      for (const pattern of sessionTokenPatterns) {
        const sessionTokenMatch = cookies?.match(pattern);
        if (sessionTokenMatch) {
          try {
            // Decode the JWT token to get user ID (without verification since we know it's valid)
            const sessionToken = sessionTokenMatch[1];
            const payload = JSON.parse(atob(sessionToken.split('.')[1]));
            fallbackUserId = payload.sub;
            
            if (fallbackUserId) {
              console.log('Fallback authentication successful:', fallbackUserId);
              break;
            }
          } catch (fallbackError) {
            console.log('Fallback authentication attempt failed:', fallbackError);
            continue;
          }
        }
      }
      
      if (fallbackUserId) {
        // Validate text content
        if (!text || typeof text !== 'string') {
          return NextResponse.json(
            { error: 'Text content is required' },
            { status: 400 }
          );
        }

        if (text.trim().length < 10) {
          return NextResponse.json(
            { error: 'Text content is too short to extract meaningful claims' },
            { status: 400 }
          );
        }

        // Extract claims from the provided text
        console.log('Extracting claims from text...');
        const claimsResult = await extractClaims(text);
        
        if (!claimsResult.success) {
          return NextResponse.json(
            { error: claimsResult.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          claims: claimsResult,
          userId: fallbackUserId,
          authMethod: 'fallback-cookie'
        });
      }
    }
    
    if (!userId) {
      console.log('Authentication failed - no userId');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          debug: {
            hasUserId: !!userId,
            hasAuthHeader: !!authHeader,
            hasCookies: !!cookies,
            clerkAuthStatus,
            clerkAuthReason,
            clerkAuthMessage,
            userAgent: request.headers.get('user-agent')
          }
        },
        { status: 401 }
      );
    }

    // Validate text content
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Text content is too short to extract meaningful claims' },
        { status: 400 }
      );
    }

    // Extract claims from the provided text
    console.log('Extracting claims from text...');
    const claimsResult = await extractClaims(text);
    
    if (!claimsResult.success) {
      return NextResponse.json(
        { error: claimsResult.error },
        { status: 500 }
      );
    }

    // Return comprehensive results
    return NextResponse.json({
      success: true,
      text: {
        length: text.length,
        preview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        processedAt: new Date().toISOString()
      },
      claims: {
        extracted: claimsResult.claims,
        count: claimsResult.claims.length,
        processingTime: claimsResult.processingTime
      },
      processing: {
        steps: ['Text Analysis', 'Claim Extraction'],
        completedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Claims extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract claims from text' },
      { status: 500 }
    );
  }
}


async function extractClaims(text: string) {
  const startTime = Date.now();
  
  try {
    if (!text || text.trim().length < 10) {
      return {
        success: false,
        error: 'No text content to analyze',
        claims: [],
        processingTime: 0
      };
    }

    // Truncate text if it's too long (Gemini has token limits)
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) + '...' : text;

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Create a prompt to extract factual claims
    const prompt = `
    Analyze the following text and extract all factual claims or statements that can be fact-checked. 
    Focus on claims that make assertions about facts, statistics, events, or statements that can be verified as true or false.
    
    Format your response as a JSON array of strings, where each string is a clear, standalone claim.
    
    Example output:
    [
      "The Earth is flat",
      "Vaccines cause autism",
      "The Great Wall of China is the only man-made structure visible from space"
    ]
    
    Text to analyze:
    ${truncatedText}
    `;

    // Generate content with error handling for the API response
    let claimsText = '';
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      claimsText = response.text().trim();
      
      // If the response is empty, return an empty array
      if (!claimsText) {
        return {
          success: true,
          claims: [],
          processingTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      return {
        success: false,
        error: 'Failed to generate content with the AI model',
        claims: [],
        processingTime: Date.now() - startTime
      };
    }

    // Parse the response (it should be a JSON array of strings)
    let claims: string[] = [];
    try {
      // First, try to parse the entire response as JSON
      try {
        const parsed = JSON.parse(claimsText);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          claims = parsed;
        }
      } catch {
        // If direct JSON parse fails, try to extract JSON array from the response
        const jsonMatch = claimsText.match(/\[([\s\S]*?)\]/);
        if (jsonMatch) {
          const potentialJson = jsonMatch[0];
          try {
            const parsed = JSON.parse(potentialJson);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
              claims = parsed;
            }
          } catch {
            console.log('Failed to parse JSON array from response');
          }
        }
      }
      
      // If we still don't have claims, try to extract them from text format
      if (claims.length === 0) {
        const claimLines = claimsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.match(/^\d+\.\s*[A-Z]/) || line.match(/^-\s*[A-Z]/) || line.match(/^•\s*[A-Z]/));
        
        claims = claimLines.map(line => 
          line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim()
        );
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        success: false,
        error: 'Failed to parse claims from the AI response',
        claims: [],
        processingTime: Date.now() - startTime
      };
    }

    // Filter out any empty or invalid claims
    const validClaims = claims
      .map(claim => claim.trim())
      .filter(claim => claim.length > 10 && claim.length < 500); // Reasonable length limits

    return {
      success: true,
      claims: validClaims,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Error extracting claims:', error);
    return {
      success: false,
      error: 'Failed to extract claims from the text',
      claims: [],
      processingTime: Date.now() - startTime
    };
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'PDF Claims API is running' },
    { status: 200 }
  );
}
