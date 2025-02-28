// API endpoint for analyzing websites
const { OpenAI } = require('openai');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure the websites directory exists
async function ensureWebsitesDir() {
  const dir = path.join(process.cwd(), 'websites');
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('Error creating websites directory:', error);
  }
  return dir;
}

// Extract domain name from URL to use as filename
function getDomainFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
  } catch (error) {
    return 'unknown-' + Date.now();
  }
}

// Function to analyze a website
async function analyzeWebsite(url, fullMode = false) {
  const websitesDir = await ensureWebsitesDir();
  const domain = getDomainFromUrl(url);
  const filename = `${domain}.json`;
  const filePath = path.join(websitesDir, filename);
  
  // Analysis log for progress reporting
  const analysisId = uuidv4();
  const logFilePath = path.join(websitesDir, `${analysisId}-log.json`);
  
  // Initial log
  const log = {
    url,
    domain,
    startTime: new Date().toISOString(),
    status: 'starting',
    progress: 0,
    actions: [],
    summaries: []
  };
  
  await fs.writeFile(logFilePath, JSON.stringify(log, null, 2));
  
  // Function to update log
  async function updateLog(updates) {
    try {
      const currentLog = JSON.parse(await fs.readFile(logFilePath, 'utf8'));
      const updatedLog = { ...currentLog, ...updates };
      
      if (updates.actions) {
        updatedLog.actions = [...currentLog.actions, ...updates.actions];
      }
      
      if (updates.summaries) {
        updatedLog.summaries = [...currentLog.summaries, ...updates.summaries];
      }
      
      await fs.writeFile(logFilePath, JSON.stringify(updatedLog, null, 2));
      return updatedLog;
    } catch (error) {
      console.error('Error updating log:', error);
      return null;
    }
  }
  
  // Function to summarize recent actions
  async function summarizeActions(actions) {
    if (!actions || actions.length === 0) return null;
    
    try {
      const recentActions = actions.slice(-5); // Take the last 5 actions
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that summarizes web crawling actions into a single, concise sentence."
          },
          {
            role: "user",
            content: `Summarize these recent web crawling actions into a single, short sentence that describes what the crawler is currently doing. Actions: ${JSON.stringify(recentActions)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      });
      
      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error summarizing actions:', error);
      return "Analyzing website content...";
    }
  }
  
  // Start browser
  let browser;
  try {
    // Update log
    await updateLog({
      status: 'launching_browser',
      progress: 5,
      actions: [{ time: new Date().toISOString(), action: 'Launching browser' }]
    });
    
    // Launch browser
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
                     '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set timeout based on mode
    const timeoutMinutes = fullMode ? 20 : 10;
    const timeout = timeoutMinutes * 60 * 1000;
    const startTime = Date.now();
    
    // Update log
    await updateLog({
      status: 'navigating_to_url',
      progress: 10,
      actions: [{ time: new Date().toISOString(), action: `Navigating to ${url}` }]
    });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Initialize website data
    const websiteData = {
      url,
      domain,
      title: '',
      description: '',
      lastUpdated: new Date().toISOString(),
      links: []
    };
    
    // Update log
    await updateLog({
      status: 'extracting_initial_metadata',
      progress: 15,
      actions: [{ time: new Date().toISOString(), action: 'Extracting website metadata' }]
    });
    
    // Get title and meta description
    websiteData.title = await page.title();
    websiteData.description = await page.evaluate(() => {
      const metaDesc = document.querySelector('meta[name="description"]');
      return metaDesc ? metaDesc.getAttribute('content') : '';
    });
    
    // Updated log and get a summary
    const updatedLog = await updateLog({
      status: 'crawling_links',
      progress: 20,
      actions: [
        { time: new Date().toISOString(), action: `Found website title: "${websiteData.title}"` },
        { time: new Date().toISOString(), action: 'Starting to crawl links' }
      ]
    });
    
    const summary = await summarizeActions(updatedLog.actions);
    await updateLog({
      summaries: [{ time: new Date().toISOString(), summary }]
    });
    
    // Keep track of visited URLs to avoid duplicates
    const visitedUrls = new Set([url]);
    const urlsToVisit = [url];
    let currentUrl = '';
    
    // Function to extract links and elements from a page
    async function extractPageData(page, currentUrl) {
      return page.evaluate((baseUrl) => {
        const links = [];
        
        // Extract navigation links
        document.querySelectorAll('nav a, header a, .menu a, .navigation a').forEach(el => {
          if (el.href && el.href.startsWith('http')) {
            links.push({
              url: el.href,
              text: el.innerText.trim() || el.getAttribute('aria-label') || 'Navigation link',
              type: 'navigation',
              location: 'header/nav'
            });
          }
        });
        
        // Extract main content links
        document.querySelectorAll('main a, .content a, article a').forEach(el => {
          if (el.href && el.href.startsWith('http')) {
            links.push({
              url: el.href,
              text: el.innerText.trim() || el.getAttribute('aria-label') || 'Content link',
              type: 'content',
              location: 'main content'
            });
          }
        });
        
        // Extract buttons with links
        document.querySelectorAll('button[onclick], a.button, .btn').forEach(el => {
          const text = el.innerText.trim();
          if (text) {
            links.push({
              url: el.href || el.getAttribute('onclick') || baseUrl,
              text: text,
              type: 'button',
              location: 'interactive element'
            });
          }
        });
        
        // Extract footer links
        document.querySelectorAll('footer a').forEach(el => {
          if (el.href && el.href.startsWith('http')) {
            links.push({
              url: el.href,
              text: el.innerText.trim() || el.getAttribute('aria-label') || 'Footer link',
              type: 'footer',
              location: 'footer'
            });
          }
        });
        
        return {
          pageTitle: document.title,
          links: links.filter(link => !!link.text) // Filter out links without text
        };
      }, currentUrl);
    }
    
    // Main crawling loop with timeout
    while (urlsToVisit.length > 0 && (Date.now() - startTime) < timeout) {
      // Calculate progress percentage (0-90%, save last 10% for processing)
      const progressPercentage = 20 + Math.min(70, 
        (70 * (visitedUrls.size / (fullMode ? 100 : 50))));
      
      // Update log every 3 URLs
      if (visitedUrls.size % 3 === 0) {
        const updatedLog = await updateLog({
          status: 'crawling_in_progress',
          progress: progressPercentage,
          actions: [{ 
            time: new Date().toISOString(), 
            action: `Crawled ${visitedUrls.size} pages, ${urlsToVisit.length} remaining in queue` 
          }]
        });
        
        // Generate a summary every 3 URLs
        const summary = await summarizeActions(updatedLog.actions);
        await updateLog({
          summaries: [{ time: new Date().toISOString(), summary }]
        });
      }
      
      // Get next URL to visit
      currentUrl = urlsToVisit.shift();
      
      // Skip if already processed
      if (currentUrl !== url && visitedUrls.has(currentUrl)) continue;
      
      try {
        // Navigate to the page
        await updateLog({
          actions: [{ time: new Date().toISOString(), action: `Navigating to: ${currentUrl}` }]
        });
        
        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
          // Log navigation errors but continue with next URL
          updateLog({
            actions: [{ time: new Date().toISOString(), action: `Failed to load: ${currentUrl}` }]
          });
        });
        
        // Extract data
        const pageData = await extractPageData(page, currentUrl);
        
        // Add extracted links to website data
        await updateLog({
          actions: [{ 
            time: new Date().toISOString(), 
            action: `Found ${pageData.links.length} links on ${pageData.pageTitle}` 
          }]
        });
        
        // Process the links
        for (const link of pageData.links) {
          // Add to website data if it's a new unique link
          if (!websiteData.links.some(l => l.url === link.url)) {
            websiteData.links.push({
              title: link.text,
              description: `${link.type} link found in ${link.location}`,
              url: link.url
            });
            
            // Add to visit queue if it's in the same domain and we haven't visited too many pages
            const linkDomain = getDomainFromUrl(link.url);
            if (linkDomain === domain && 
                !visitedUrls.has(link.url) && 
                visitedUrls.size < (fullMode ? 100 : 50)) {
              urlsToVisit.push(link.url);
            }
          }
        }
        
        // Mark as visited
        visitedUrls.add(currentUrl);
        
      } catch (error) {
        await updateLog({
          actions: [{ 
            time: new Date().toISOString(), 
            action: `Error processing ${currentUrl}: ${error.message}` 
          }]
        });
        console.error(`Error processing ${currentUrl}:`, error);
      }
    }
    
    // Update log for final processing
    await updateLog({
      status: 'finalizing',
      progress: 90,
      actions: [{ 
        time: new Date().toISOString(), 
        action: `Crawling complete. Visited ${visitedUrls.size} pages. Found ${websiteData.links.length} unique links.` 
      }]
    });
    
    // Use OpenAI to enhance descriptions
    if (websiteData.links.length > 0) {
      try {
        // Process in batches of 20 links
        const batchSize = 20;
        for (let i = 0; i < websiteData.links.length; i += batchSize) {
          const batch = websiteData.links.slice(i, i + batchSize);
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an AI assisting with website analysis. For each link, provide a concise, 
                improved description based on the link text and type. Keep descriptions under 100 characters.`
              },
              {
                role: "user",
                content: `Improve these link descriptions: ${JSON.stringify(batch)}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          });
          
          // Parse the improved descriptions
          try {
            const content = completion.choices[0].message.content;
            const descriptions = JSON.parse(content);
            
            // Update descriptions
            if (Array.isArray(descriptions) && descriptions.length === batch.length) {
              for (let j = 0; j < batch.length; j++) {
                websiteData.links[i + j].description = descriptions[j].description || websiteData.links[i + j].description;
              }
            }
          } catch (parseError) {
            console.error('Error parsing AI descriptions:', parseError);
            // If parsing fails, try to extract descriptions using regex
            const content = completion.choices[0].message.content;
            const lines = content.split('\n');
            
            for (let j = 0; j < batch.length; j++) {
              // Look for lines containing the link title
              const titlePattern = new RegExp(`"${batch[j].title}"|\\b${batch[j].title}\\b`, 'i');
              const matchingLine = lines.find(line => titlePattern.test(line));
              
              if (matchingLine) {
                // Try to extract description part
                const descParts = matchingLine.split(':');
                if (descParts.length > 1) {
                  websiteData.links[i + j].description = descParts[1].trim();
                }
              }
            }
          }
          
          // Update progress
          const batchProgress = 90 + ((i + batch.length) / websiteData.links.length) * 10;
          await updateLog({
            progress: Math.min(99, batchProgress),
            actions: [{ 
              time: new Date().toISOString(), 
              action: `Enhanced descriptions for ${i + batch.length}/${websiteData.links.length} links` 
            }]
          });
        }
      } catch (aiError) {
        console.error('Error enhancing descriptions with AI:', aiError);
      }
    }
    
    // Save the final data
    await fs.writeFile(filePath, JSON.stringify(websiteData, null, 2));
    
    // Final log update
    await updateLog({
      status: 'completed',
      progress: 100,
      endTime: new Date().toISOString(),
      actions: [{ 
        time: new Date().toISOString(), 
        action: `Analysis complete. Data saved to ${filename}` 
      }]
    });
    
    return {
      success: true,
      analysisId,
      domain,
      filename,
      url
    };
    
  } catch (error) {
    console.error('Website analysis error:', error);
    
    // Update log with error
    await updateLog({
      status: 'error',
      endTime: new Date().toISOString(),
      error: error.message,
      actions: [{ 
        time: new Date().toISOString(), 
        action: `Error: ${error.message}` 
      }]
    });
    
    return {
      success: false,
      analysisId,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// API endpoint
module.exports = async (req, res) => {
  // CORS headers setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests for progress updates
  if (req.method === 'GET') {
    const { analysisId } = req.query;
    
    if (!analysisId) {
      return res.status(400).json({ error: 'Missing analysisId parameter' });
    }
    
    try {
      const websitesDir = await ensureWebsitesDir();
      const logFilePath = path.join(websitesDir, `${analysisId}-log.json`);
      
      const logData = await fs.readFile(logFilePath, 'utf8');
      const log = JSON.parse(logData);
      
      // Return a simplified status update
      return res.status(200).json({
        status: log.status,
        progress: log.progress,
        url: log.url,
        domain: log.domain,
        summaries: log.summaries || []
      });
    } catch (error) {
      console.error('Error reading analysis log:', error);
      return res.status(404).json({
        error: 'Analysis log not found or invalid'
      });
    }
  }

  // Handle POST request to start analysis
  if (req.method === 'POST') {
    const { url, fullMode } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      // Start analysis in background
      const result = analyzeWebsite(url, fullMode);
      
      return res.status(200).json({
        message: 'Website analysis started',
        analysisId: result.analysisId,
        url
      });
    } catch (error) {
      console.error('Error starting website analysis:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while starting website analysis'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};