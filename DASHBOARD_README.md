# Athena.ai Dashboard System

## Overview

The Athena.ai Dashboard is a comprehensive fact-checking platform that combines RSS feed aggregation with AI-powered analysis to provide real-time fact-checking insights. The system automatically processes claims from multiple credible sources and presents them in an intuitive dashboard interface.

## Architecture

### Core Components

1. **Main Dashboard** (`/dashboard`)
   - RSS feed display with real-time updates
   - Interactive filtering and search
   - Analytics and trending topics
   - Navigation to fact-check tool

2. **RSS Feed System** (`/api/dashboard/rss-feed/`)
   - Multi-source RSS aggregation
   - Automated fact-checking pipeline
   - Caching and performance optimization
   - Auto-refresh system (every 1 hour)

3. **Fact-Check Integration** (`/fact-check`)
   - Enhanced analysis system
   - Conversation history
   - Real-time verification

### Data Flow

```
RSS Sources → Aggregation → Processing → Fact-Checking → Dashboard Display
     ↓              ↓           ↓            ↓              ↓
  Snopes,      RSS Parser   AI Analysis   Enhanced      User Interface
  PolitiFact,  & Caching    Pipeline      Fact-Check    & Analytics
  FactCheck.org
```

## Features

### Phase 1 (Implemented)
- RSS feed aggregation from 10+ credible sources
- Automated fact-checking pipeline (15 claims/hour)
- Real-time dashboard with filtering and search
- Auto-refresh system (every 1 hour)
- User authentication and data isolation
- Responsive UI with modern design

### Phase 2 (Implemented)
- Advanced filtering (category, source type, time range)
- Trending topics analysis
- Source credibility scoring
- Interactive claim cards with quick actions
- Analytics dashboard with statistics
- Background processing system

## Technical Implementation

### RSS Sources

The system aggregates from 10+ high-credibility sources:

- **Fact-Checkers**: Snopes, PolitiFact, FactCheck.org, Full Fact
- **News Outlets**: BBC Reality Check, AP Fact Check, Reuters Fact Check
- **Government**: WHO Myth Busters, CDC Fact Sheets, NIH News

### Database Schema

```sql
-- RSS Cache Table
CREATE TABLE rss_cache (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  claims JSONB NOT NULL,
  stats JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  last_processed_at TIMESTAMP WITH TIME ZONE
);
```

### API Endpoints

#### RSS Feed Management
- `GET /api/dashboard/rss-feed` - Fetch RSS data
- `POST /api/dashboard/rss-feed/refresh` - Manual refresh
- `POST /api/dashboard/rss-feed/process` - Process claims
- `POST /api/dashboard/rss-feed/auto-process` - Automated processing

#### Fact-Check Integration
- `POST /api/enhanced-fact-check` - Enhanced analysis
- `GET /api/fact-check/history` - Conversation history

## Getting Started

### Prerequisites

1. **Environment Variables**
```bash
# Add to .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CRON_SECRET=your-secret-key
```

2. **Database Setup**
```bash
# Run Supabase migration
supabase db push
```

3. **Dependencies**
```bash
npm install
```

### Running the Application

1. **Development Mode**
```bash
npm run dev
```

2. **Production Mode**
```bash
npm run build
npm start
```

3. **Set up Cron Jobs**
```bash
# Add to your cron scheduler
0 * * * * curl -X POST http://localhost:3000/api/dashboard/rss-feed/auto-process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## User Experience

### Dashboard Features

1. **Real-time Feed**
   - Live RSS updates every hour
   - 15 automated fact-checks per hour
   - Trending topics and analytics

2. **Smart Filtering**
   - Category filters (Politics, Health, Science, etc.)
   - Source type filters (Government, Academic, News)
   - Time range filters (1h, 24h, 7d, 30d)
   - Full-text search

3. **Interactive Elements**
   - Quick actions (Save, Share, Fact Check)
   - Source credibility indicators
   - Verdict badges with confidence scores
   - Trending indicators

4. **Analytics Dashboard**
   - Total claims processed
   - Verification statistics
   - Source performance metrics
   - Trending topics visualization

### Navigation Flow

```
Landing Page → Dashboard → Fact-Check Tool
     ↓              ↓           ↓
  Sign Up      RSS Feed    Enhanced
  Sign In      Display     Analysis
              Analytics
```

## Automated Processing

### RSS Refresh Cycle

1. **Every Hour**: Fetch new RSS data
2. **Processing**: Run through fact-checking pipeline
3. **Caching**: Store results in database
4. **Display**: Update dashboard in real-time

### Fact-Checking Pipeline

1. **Claim Extraction**: Parse RSS items
2. **Categorization**: Auto-categorize by topic
3. **AI Analysis**: Run through enhanced fact-check API
4. **Source Verification**: Cross-reference with credible sources
5. **Confidence Scoring**: Calculate reliability metrics

## UI/UX Design

### Design Principles

- **Minimal & Clean**: Gemini-inspired interface
- **Responsive**: Works on all devices
- **Accessible**: Screen reader support
- **Interactive**: Hover effects and animations
- **Informative**: Clear data visualization

### Color Scheme

- **Primary**: Blue (#2563eb)
- **Success**: Green (#16a34a)
- **Warning**: Yellow (#ca8a04)
- **Error**: Red (#dc2626)
- **Neutral**: Gray (#6b7280)

## Performance Optimization

### Caching Strategy

1. **RSS Data**: Cached for 1 hour
2. **Fact-Check Results**: Cached indefinitely
3. **User Preferences**: Cached in browser
4. **API Responses**: Cached with TTL

### Rate Limiting

- **RSS Fetching**: 3 concurrent requests
- **Fact-Checking**: 15 claims per hour per user
- **API Calls**: Respect external rate limits

## Security Features

### Authentication

- **Clerk Integration**: Secure user management
- **Row Level Security**: Database-level access control
- **API Authentication**: JWT-based authentication

### Data Protection

- **User Isolation**: Each user sees only their data
- **Secure Headers**: CORS and security headers
- **Input Validation**: Sanitized RSS data

## Deployment

### Vercel Deployment

1. **Environment Setup**
```bash
# Add environment variables in Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
CRON_SECRET=your-cron-secret
```

2. **Database Migration**
```bash
supabase db push
```

3. **Cron Job Setup**
```bash
# Use Vercel Cron Jobs or external service
# Schedule: 0 * * * * (every hour)
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring & Analytics

### Key Metrics

1. **RSS Performance**
   - Feed fetch success rate
   - Processing time per claim
   - Cache hit ratio

2. **User Engagement**
   - Dashboard visits
   - Filter usage
   - Fact-check requests

3. **System Health**
   - API response times
   - Error rates
   - Database performance

### Logging

- **Structured Logging**: JSON format
- **Error Tracking**: Detailed error logs
- **Performance Metrics**: Response time tracking
- **User Actions**: Audit trail

## Future Enhancements

### Phase 3 (Planned)

1. **Advanced Analytics**
   - Misinformation pattern detection
   - Source reliability tracking
   - Impact metrics

2. **Social Features**
   - Claim discussions
   - Expert insights
   - Community verification

3. **API Development**
   - Public API access
   - Webhook support
   - Mobile SDK

4. **AI Improvements**
   - Better context understanding
   - Bias detection
   - Multi-language support

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

## Support

### Documentation

- **API Docs**: `/api/docs`
- **Component Library**: Storybook
- **Database Schema**: Supabase docs

### Troubleshooting

1. **RSS Feed Issues**: Check source availability
2. **Processing Errors**: Verify API keys
3. **UI Problems**: Check browser console
4. **Performance**: Monitor database queries

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **RSS Sources**: All fact-checking organizations
- **AI Models**: Google Gemini AI
- **Infrastructure**: Vercel, Supabase
- **UI Framework**: Next.js, Tailwind CSS

---

**Built with love by the Athena.ai team**
