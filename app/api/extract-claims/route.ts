import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Parse the request body
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
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
        return NextResponse.json({ claims: [] });
      }
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      return NextResponse.json(
        { error: 'Failed to generate content with the AI model' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'Failed to parse claims from the AI response' },
        { status: 500 }
      );
    }

    // Filter out any empty or invalid claims
    const validClaims = claims
      .map(claim => claim.trim())
      .filter(claim => claim.length > 10 && claim.length < 500); // Reasonable length limits

    return NextResponse.json({ claims: validClaims });
  } catch (error) {
    console.error('Error extracting claims:', error);
    return NextResponse.json(
      { error: 'Failed to extract claims from the text' },
      { status: 500 }
    );
  }
}
