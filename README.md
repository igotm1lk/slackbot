# Slack PageSpeed Insights Bot

A Slack bot that analyzes website page speed performance using Google's PageSpeed Insights API. Get detailed performance metrics directly in your Slack workspace with a simple slash command.

## Features

- 🚀 **Quick Analysis**: Get comprehensive page speed reports with a simple `/psi` command
- 📊 **Detailed Metrics**: View performance scores, Core Web Vitals (LCP, FCP, TBT, CLS), and more
- 📱 **Mobile & Desktop**: Test both mobile and desktop strategies
- 🔄 **Multiple Tests**: Run multiple tests and get average scores for more accurate results
- 🎨 **Beautiful Reports**: Formatted Slack messages with color-coded scores and easy-to-read metrics

## Prerequisites

- Node.js 18.0.0 or higher
- A Slack workspace where you can install apps
- A Google PageSpeed Insights API key ([Get one here](https://developers.google.com/speed/docs/insights/v5/get-started))

## Setup Instructions

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "PageSpeed Bot") and select your workspace
4. Click **"Create App"**

### 2. Configure OAuth & Permissions

1. In the sidebar, go to **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Add the following scopes:
   - `chat:write` - Send messages
   - `commands` - Handle slash commands
4. Scroll up and click **"Install to Workspace"**
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 3. Get Your Signing Secret

1. In the sidebar, go to **"Basic Information"**
2. Scroll to **"App Credentials"**
3. Copy the **Signing Secret**

### 4. Set Up ngrok (For Local Development)

1. Install ngrok from [ngrok.com](https://ngrok.com/)
2. Start your bot (see step 8 below)
3. In a new terminal, run:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 5. Create a Slash Command

1. In the sidebar, go to **"Slash Commands"**
2. Click **"Create New Command"**
3. Fill in:
   - **Command**: `/psi`
   - In **"Event Subscriptions"** (if enabled), set Request URL to the same
      - **Requested URL**: `https://your-ngrok-url.ngrok.io/slack/events` (use your ngrok 'URL'/slack/events) and the verification test will pass
   - **Short Description**: `Analyze website page speed`
   - **Usage Hint**: `[url] [count] [strategy]`
4. Click **"Save"**

**Note**: If your ngrok URL changes, update the Request URL in your Slack app settings.

### 6. Get PageSpeed Insights API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **PageSpeed Insights API**
4. Go to **"Credentials"** → **"Create Credentials"** → **"API Key"**
5. Copy your API key

### 7. Install Dependencies

```bash
npm install
```

### 8. Configure Environment Variables

1. Create a `.env` file in the project root

2. Add your credentials:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_SIGNING_SECRET=your-signing-secret-here
   PAGESPEED_API_KEY=your-api-key-here
   PORT=3000
   ```

**Note**: `SLACK_APP_TOKEN` is not needed when using HTTP mode with ngrok.

### 9. Run the Bot

1. Start the bot:
   ```bash
   npm start
   ```

2. In a separate terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Copy the ngrok HTTPS URL and update your Slack app's slash command Request URL if needed.


## Usage

### Basic Usage

```
/psi https://example.com
```

This will analyze the website using the mobile strategy (default) and return a single test result.

### Multiple Tests

```
/psi https://example.com 3
```

This will run 3 tests and return an average report.

### Desktop Strategy

```
/psi https://example.com 1 desktop
```

This will analyze using the desktop strategy.

### Multiple Tests with Desktop Strategy

```
/psi https://example.com 5 desktop
```

This will run 5 desktop tests and return an average report.

## Command Syntax

```
/psi [url] [count] [strategy]
```

- **url** (required): The website URL to analyze (must start with http:// or https://)
- **count** (optional): Number of tests to run (1-10, default: 1)
- **strategy** (optional): `mobile` or `desktop` (default: `mobile`)

## Report Metrics

The bot provides the following metrics:

### Scores (0-100)
- **Performance**: Overall performance score
- **Accessibility**: Accessibility score
- **Best Practices**: Best practices score
- **SEO**: SEO score

### Core Web Vitals
- **Largest Contentful Paint (LCP)**: Time to render the largest content element
- **First Contentful Paint (FCP)**: Time to first content render
- **Total Blocking Time (TBT)**: Total time the page is blocked from responding
- **Cumulative Layout Shift (CLS)**: Visual stability metric

### Additional Metrics
- **Speed Index**: How quickly content is visually displayed
- **Time to Interactive (TTI)**: Time until the page is fully interactive

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

