# ClaimeAI - AI Fact Checking System

A comprehensive AI-powered fact-checking system built with Next.js, Gemini AI, and Tavily search. This system extracts factual claims from text and verifies them against real-world evidence using advanced AI techniques.

## 🚀 Features

- **Claim Extraction**: Uses the Claimify methodology to extract verifiable claims from text
- **Evidence Verification**: Searches the web using Tavily to find supporting evidence
- **AI-Powered Analysis**: Uses Gemini AI to analyze evidence and determine claim accuracy
- **User Authentication**: Secure authentication with Clerk
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **Real-time Processing**: Fast fact-checking with detailed results

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **AI**: Google Gemini AI (instead of OpenAI)
- **Search**: Tavily Search API
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **Workflow**: LangGraph for orchestration
- **Forms**: React Hook Form with Zod validation

## 📋 Prerequisites

Before you begin, ensure you have the following:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** or **pnpm**
3. **Google AI API Key** (Gemini)
4. **Tavily API Key**
5. **Clerk Account** for authentication

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mumbai-hack
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```

4. **Configure your API keys in `.env.local`**:
   ```env
   # Gemini API Key (Google AI)
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Tavily Search API Key
   TAVILY_API_KEY=your_tavily_api_key_here
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
   CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
   ```

## 🔑 API Key Setup

### 1. Google Gemini AI
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env.local` file

### 2. Tavily Search
1. Go to [Tavily](https://tavily.com/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your `.env.local` file

### 3. Clerk Authentication
1. Go to [Clerk](https://clerk.com/)
2. Create a new application
3. Copy your publishable key and secret key
4. Add them to your `.env.local` file

## 🚀 Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

2. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Sign in and start fact-checking**
   - Click "Sign In" to authenticate with Clerk
   - Enter a question and answer to fact-check
   - View detailed results with evidence

## 📁 Project Structure

```
mumbai-hack/
├── app/
│   ├── api/
│   │   └── fact-check/
│   │       └── route.ts          # Fact-checking API endpoint
│   ├── layout.tsx                # Root layout with Clerk provider
│   ├── page.tsx                  # Main fact-checking interface
│   └── globals.css               # Global styles
├── lib/
│   ├── claim-extractor.ts        # Claim extraction logic
│   ├── claim-verifier.ts         # Claim verification logic
│   ├── fact-checker.ts           # Main orchestrator
│   ├── types.ts                  # TypeScript type definitions
│   ├── config.ts                 # Configuration and validation
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🔍 How It Works

### 1. Claim Extraction
The system uses the **Claimify methodology** to extract factual claims from input text:
- Analyzes question-answer pairs
- Identifies verifiable statements
- Categorizes claims as factual, opinion, or ambiguous
- Assigns confidence scores

### 2. Evidence Search
For each factual claim, the system:
- Searches the web using Tavily
- Collects relevant evidence
- Ranks sources by relevance

### 3. AI Analysis
Gemini AI analyzes the evidence to:
- Determine if claims are supported, refuted, or ambiguous
- Provide confidence scores
- Generate reasoning for decisions

### 4. Results Display
The interface shows:
- Overall accuracy score
- Individual claim analysis
- Supporting evidence with links
- Processing time and metadata

## 🎯 Usage Examples

### Example 1: Fact-checking a news claim
**Question**: "What is the current population of Tokyo?"
**Answer**: "Tokyo has a population of over 37 million people."

### Example 2: Verifying a historical statement
**Question**: "When did World War II end?"
**Answer**: "World War II ended in 1945 with the surrender of Japan."

### Example 3: Checking a scientific claim
**Question**: "What is the boiling point of water?"
**Answer**: "Water boils at 100 degrees Celsius at sea level."

## 🔧 Configuration

You can customize the system behavior by modifying `lib/config.ts`:

```typescript
export const config = {
  gemini: {
    model: 'gemini-1.5-flash',
    temperature: 0.1,
    maxTokens: 4096,
  },
  tavily: {
    searchDepth: 'basic',
    maxResults: 10,
  },
  factChecker: {
    maxClaimsPerRequest: 20,
    maxSearchResultsPerClaim: 5,
    verificationTimeout: 30000,
    retryAttempts: 3,
  },
};
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claimify Methodology**: Based on research by Metropolitansky & Larson
- **SAFE Methodology**: Inspired by Wei et al.'s Search-Augmented Factuality Evaluator
- **LangGraph**: For workflow orchestration
- **Clerk**: For authentication
- **Tavily**: For web search capabilities

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include your environment and error logs

## 🔄 Updates

Stay updated with the latest features and improvements by:
- Watching the repository
- Checking the releases page
- Following the changelog

---

**Built with ❤️ for combating misinformation and promoting factual accuracy**
