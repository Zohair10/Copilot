# GitHub Copilot Analytics Dashboard

A Next.js application that provides comprehensive analytics for GitHub Copilot usage, including organization metrics, language usage, editor statistics, and billing information.

## Features

- **Organization Analytics**: Track active vs engaged users daily and weekly
- **Language Usage**: Visualize code completion usage across different programming languages
- **Editor Statistics**: Monitor usage across different IDEs and editors
- **Billing Dashboard**: Track seat allocation and usage patterns
- **Interactive Charts**: Built with Chart.js and React Chart.js 2
- **Real-time Data**: MongoDB integration for live data updates

## Tech Stack

- **Frontend & Backend**: Next.js 14 with App Router
- **Database**: MongoDB
- **Charts**: Chart.js with React Chart.js 2
- **Styling**: CSS Modules
- **Language**: TypeScript

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── organization/       # Organization metrics endpoint
│   │   ├── languages/          # Language usage endpoint
│   │   ├── editors/            # Editor statistics endpoint
│   │   └── billing/            # Billing data endpoint
│   ├── components/             # React components
│   │   └── Dashboard.tsx       # Main dashboard component
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── lib/
│   └── mongodb.ts              # MongoDB connection utility
├── scripts/
│   ├── fetch-metrics.js        # Script to fetch metrics data
│   └── fetch-billing.js        # Script to fetch billing data
├── .env                        # Environment variables
├── package.json
├── tsconfig.json
└── next.config.js
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/
   GITHUB_BILLING_URL=your_github_api_url
   GITHUB_TOKEN=your_github_token
   ```

3. Start MongoDB (if running locally):
   ```bash
   mongod
   ```

## Usage

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Data Fetching

Fetch metrics data from GitHub API:
```bash
npm run fetch-metrics
```

Fetch billing data from GitHub API:
```bash
npm run fetch-billing
```

### Production

Build and start the production server:
```bash
npm run build
npm start
```

## API Endpoints

- `GET /api/organization` - Organization metrics and feature usage
- `GET /api/languages` - Language-specific usage statistics
- `GET /api/editors` - Editor and IDE usage data
- `GET /api/billing` - Billing and seat information

## Database Collections

- `GitHubCopilotData.GetMetricsData` - Organization and usage metrics
- `GitHubCopilotData.BillingSeats` - Billing and seat allocation data

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `GITHUB_BILLING_URL` | GitHub API endpoint for Copilot data | Yes |
| `GITHUB_TOKEN` | GitHub personal access token | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Migration from Flask

This Next.js application replaces the previous Flask-based implementation with the following improvements:

- **Unified Stack**: Both frontend and backend in a single Next.js application
- **Modern UI**: React-based components with TypeScript
- **Better Performance**: Server-side rendering and API routes
- **Improved Developer Experience**: Hot reload, TypeScript support, and modern tooling

### Removed Files (from Flask version):
- `app_flask.py` - Replaced by Next.js API routes
- `app.js` - Replaced by React components
- `app.css` - Replaced by CSS modules
- `index.html` - Replaced by React JSX
- `billing.py` - Replaced by `scripts/fetch-billing.js`
- `insert_to_mongo.py` - Replaced by `scripts/fetch-metrics.js`
