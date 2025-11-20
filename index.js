const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

// Initialize Slack app (HTTP mode for ngrok)
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  port: process.env.PORT || 3000
});

// PageSpeed Insights API endpoint
const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * Fetch PageSpeed Insights data for a URL
 */
async function getPageSpeedInsights(url, strategy = 'mobile') {
  try {
    const response = await axios.get(PSI_API_URL, {
      params: {
        url: url,
        key: process.env.PAGESPEED_API_KEY,
        strategy: strategy
      }
    });
    
    // Check for API errors in response
    if (response.data.error) {
      throw new Error(response.data.error.message || 'PageSpeed Insights API error');
    }
    
    // Validate response structure
    if (!response.data.lighthouseResult) {
      throw new Error('Invalid response from PageSpeed Insights API');
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // API returned an error response
      const errorMsg = error.response.data?.error?.message || error.response.statusText;
      throw new Error(`PageSpeed Insights API error: ${errorMsg}`);
    }
    console.error('Error fetching PageSpeed Insights:', error.message);
    throw error;
  }
}

/**
 * Extract key metrics from PageSpeed Insights data
 */
function extractMetrics(data) {
  const lighthouseResult = data.lighthouseResult;
  
  if (!lighthouseResult) {
    throw new Error('Missing lighthouseResult in API response');
  }
  
  const categories = lighthouseResult.categories || {};
  const audits = lighthouseResult.audits || {};
  
  // Helper function to safely get score
  const getScore = (category) => {
    if (!category || category.score === undefined || category.score === null) {
      return 0;
    }
    return Math.round(category.score * 100);
  };
  
  // Helper function to safely get numeric value
  const getNumericValue = (audit, defaultValue = 0) => {
    if (!audit || audit.numericValue === undefined || audit.numericValue === null) {
      return defaultValue;
    }
    return audit.numericValue;
  };
  
  return {
    performance: getScore(categories.performance),
    accessibility: getScore(categories.accessibility),
    bestPractices: getScore(categories['best-practices']),
    seo: getScore(categories.seo),
    firstContentfulPaint: getNumericValue(audits['first-contentful-paint']),
    largestContentfulPaint: getNumericValue(audits['largest-contentful-paint']),
    totalBlockingTime: getNumericValue(audits['total-blocking-time']),
    cumulativeLayoutShift: getNumericValue(audits['cumulative-layout-shift']),
    speedIndex: getNumericValue(audits['speed-index']),
    timeToInteractive: getNumericValue(audits['interactive']),
    url: lighthouseResult.finalUrl || lighthouseResult.requestedUrl || 'Unknown'
  };
}

/**
 * Format metrics for Slack message
 */
function formatMetricsMessage(metrics, strategy, testNumber = null) {
  const title = testNumber 
    ? `*PageSpeed Insights Report (${strategy.toUpperCase()}) - Test ${testNumber}*`
    : `*PageSpeed Insights Report (${strategy.toUpperCase()})*`;
  
  const scoreEmoji = (score) => {
    if (score >= 90) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
  };

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Performance:*\n${scoreEmoji(metrics.performance)} ${metrics.performance}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Accessibility:*\n${scoreEmoji(metrics.accessibility)} ${metrics.accessibility}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Best Practices:*\n${scoreEmoji(metrics.bestPractices)} ${metrics.bestPractices}/100`
          },
          {
            type: 'mrkdwn',
            text: `*SEO:*\n${scoreEmoji(metrics.seo)} ${metrics.seo}/100`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Core Web Vitals & Metrics:*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Largest Contentful Paint (LCP):*\n${(metrics.largestContentfulPaint / 1000).toFixed(2)}s`
          },
          {
            type: 'mrkdwn',
            text: `*First Contentful Paint (FCP):*\n${(metrics.firstContentfulPaint / 1000).toFixed(2)}s`
          },
          {
            type: 'mrkdwn',
            text: `*Total Blocking Time (TBT):*\n${metrics.totalBlockingTime.toFixed(0)}ms`
          },
          {
            type: 'mrkdwn',
            text: `*Cumulative Layout Shift (CLS):*\n${metrics.cumulativeLayoutShift.toFixed(3)}`
          },
          {
            type: 'mrkdwn',
            text: `*Speed Index:*\n${(metrics.speedIndex / 1000).toFixed(2)}s`
          },
          {
            type: 'mrkdwn',
            text: `*Time to Interactive (TTI):*\n${(metrics.timeToInteractive / 1000).toFixed(2)}s`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🌐 *URL:* ${metrics.url}`
          }
        ]
      }
    ]
  };
}

/**
 * Calculate average metrics from multiple test results
 */
function calculateAverageMetrics(metricsArray) {
  const count = metricsArray.length;
  const averages = {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    totalBlockingTime: 0,
    cumulativeLayoutShift: 0,
    speedIndex: 0,
    timeToInteractive: 0,
    url: metricsArray[0].url
  };

  metricsArray.forEach(metrics => {
    averages.performance += metrics.performance;
    averages.accessibility += metrics.accessibility;
    averages.bestPractices += metrics.bestPractices;
    averages.seo += metrics.seo;
    averages.firstContentfulPaint += metrics.firstContentfulPaint;
    averages.largestContentfulPaint += metrics.largestContentfulPaint;
    averages.totalBlockingTime += metrics.totalBlockingTime;
    averages.cumulativeLayoutShift += metrics.cumulativeLayoutShift;
    averages.speedIndex += metrics.speedIndex;
    averages.timeToInteractive += metrics.timeToInteractive;
  });

  // Calculate averages
  Object.keys(averages).forEach(key => {
    if (key !== 'url') {
      averages[key] = averages[key] / count;
    }
  });

  return averages;
}

/**
 * Format average metrics message
 */
function formatAverageMetricsMessage(averages, strategy, testCount) {
  const scoreEmoji = (score) => {
    if (score >= 90) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
  };

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `*PageSpeed Insights Average Report (${strategy.toUpperCase()}) - ${testCount} Tests*`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Performance:*\n${scoreEmoji(averages.performance)} ${Math.round(averages.performance)}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Accessibility:*\n${scoreEmoji(averages.accessibility)} ${Math.round(averages.accessibility)}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Best Practices:*\n${scoreEmoji(averages.bestPractices)} ${Math.round(averages.bestPractices)}/100`
          },
          {
            type: 'mrkdwn',
            text: `*SEO:*\n${scoreEmoji(averages.seo)} ${Math.round(averages.seo)}/100`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Average Core Web Vitals & Metrics:*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Largest Contentful Paint (LCP):*\n${(averages.largestContentfulPaint / 1000).toFixed(2)}s`
          },
          {
            type: 'mrkdwn',
            text: `*First Contentful Paint (FCP):*\n${(averages.firstContentfulPaint / 1000).toFixed(2)}s`
          },
          {
            type: 'mrkdwn',
            text: `*Total Blocking Time (TBT):*\n${averages.totalBlockingTime.toFixed(0)}ms`
          },
          {
            type: 'mrkdwn',
            text: `*Cumulative Layout Shift (CLS):*\n${averages.cumulativeLayoutShift.toFixed(3)}`
          },
          {
            type: 'mrkdwn',
            text: `*Speed Index:*\n${(averages.speedIndex / 1000).toFixed(2)}s`
          },
          {
            type: 'mrkdwn',
            text: `*Time to Interactive (TTI):*\n${(averages.timeToInteractive / 1000).toFixed(2)}s`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🌐 *URL:* ${averages.url} | 📊 *Tests Run:* ${testCount}`
          }
        ]
      }
    ]
  };
}

// Handle slash command
app.command('/psi', async ({ command, ack, respond, client }) => {
  await ack();

  const text = command.text.trim();
  
  // Check if API key is configured
  if (!process.env.PAGESPEED_API_KEY) {
    await respond({
      text: '❌ PageSpeed Insights API key is not configured. Please set PAGESPEED_API_KEY in your environment variables.',
      response_type: 'ephemeral'
    });
    return;
  }
  
  // Parse command: URL [count] [strategy]
  // Examples:
  // /psi https://example.com
  // /psi https://example.com 3
  // /psi https://example.com desktop
  // /psi https://example.com 3 desktop
  const parts = text.split(/\s+/);
  const url = parts[0];
  
  // Determine count and strategy
  let count = 1;
  let strategy = 'mobile';
  
  if (parts.length > 1) {
    const secondPart = parts[1].toLowerCase();
    const parsedCount = parseInt(parts[1]);
    
    if (!isNaN(parsedCount)) {
      // parts[1] is a number
      count = parsedCount;
      // parts[2] might be strategy
      if (parts[2] && ['mobile', 'desktop'].includes(parts[2].toLowerCase())) {
        strategy = parts[2].toLowerCase();
      }
    } else if (['mobile', 'desktop'].includes(secondPart)) {
      // parts[1] is strategy
      strategy = secondPart;
    }
  }

  // Validate URL
  if (!url || !url.startsWith('http://') && !url.startsWith('https://')) {
    await respond({
      text: '❌ Invalid URL. Please provide a valid URL starting with http:// or https://',
      response_type: 'ephemeral'
    });
    return;
  }

  // Validate count
  if (count < 1 || count > 10) {
    await respond({
      text: '❌ Test count must be between 1 and 10',
      response_type: 'ephemeral'
    });
    return;
  }

  // Validate strategy
  const validStrategies = ['mobile', 'desktop'];
  const finalStrategy = validStrategies.includes(strategy.toLowerCase()) 
    ? strategy.toLowerCase() 
    : 'mobile';

  // Send initial acknowledgment
  await respond({
    text: `🔄 Analyzing ${url}... (${count} test${count > 1 ? 's' : ''}, ${finalStrategy} strategy)`,
    response_type: 'ephemeral'
  });

  try {
    const allMetrics = [];

    // Run tests
    for (let i = 0; i < count; i++) {
      try {
        // Send progress update for multiple tests
        if (count > 1) {
          await client.chat.postMessage({
            channel: command.channel_id,
            text: `🔄 Running test ${i + 1} of ${count}...`
          });
        }

        const data = await getPageSpeedInsights(url, finalStrategy);
        const metrics = extractMetrics(data);
        allMetrics.push(metrics);

        // Send individual test result if multiple tests
        if (count > 1) {
          await client.chat.postMessage({
            channel: command.channel_id,
            ...formatMetricsMessage(metrics, finalStrategy, i + 1)
          });
        }
      } catch (error) {
        console.error(`Error in test ${i + 1}:`, error);
        await client.chat.postMessage({
          channel: command.channel_id,
          text: `❌ Error running test ${i + 1}: ${error.message}`
        });
      }
    }

    // Check if we have any successful results
    if (allMetrics.length === 0) {
      await client.chat.postMessage({
        channel: command.channel_id,
        text: `❌ All tests failed. Please check:\n• Your PageSpeed Insights API key is valid\n• The URL is accessible\n• You haven't exceeded API rate limits`
      });
      return;
    }

    // Send final result
    if (count === 1) {
      // Single test - send detailed result
      await client.chat.postMessage({
        channel: command.channel_id,
        ...formatMetricsMessage(allMetrics[0], finalStrategy)
      });
    } else {
      // Multiple tests - send average
      const averages = calculateAverageMetrics(allMetrics);
      await client.chat.postMessage({
        channel: command.channel_id,
        ...formatAverageMetricsMessage(averages, finalStrategy, allMetrics.length)
      });
    }

  } catch (error) {
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `❌ Error analyzing website: ${error.message}\n\nMake sure your PageSpeed Insights API key is set correctly.`
    });
  }
});

app.message("hello", async ({ message, say }) => {
  await say(`Hi <@${message.user}>!`);
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log(`⚡️ Slack PageSpeed Bot is running on port ${process.env.PORT || 3000}!`);
   
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

