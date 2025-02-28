// API endpoint for searching website data
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  // CORS headers setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, query } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Construct the path to the website data file
    const websitesDir = path.join(process.cwd(), 'websites');
    const filePath = path.join(websitesDir, `${domain}.json`);

    // Check if the file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'Website data not found',
        details: `No analysis data found for domain: ${domain}`
      });
    }

    // Read the website data
    const fileData = await fs.readFile(filePath, 'utf8');
    const websiteData = JSON.parse(fileData);

    // Simple search algorithm
    let results = [];
    
    // First check if query matches any link titles or descriptions directly
    const directMatches = websiteData.links.filter(link => {
      return link.title.toLowerCase().includes(query.toLowerCase()) ||
             link.description.toLowerCase().includes(query.toLowerCase());
    });
    
    if (directMatches.length > 0) {
      results = directMatches.map(link => ({
        title: link.title,
        description: link.description,
        url: link.url,
        matchType: 'direct'
      }));
    } else {
      // Use AI to find semantic matches
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant helping to find relevant links on a website.
              You'll be given website data and a search query. Return the most relevant links as JSON.
              Each result should include: title, description, url, and relevance (0-100).
              Return only valid JSON with no markdown or other text.`
            },
            {
              role: "user",
              content: `Website: ${websiteData.domain}
              Query: "${query}"
              
              Find the most relevant links from this data:
              ${JSON.stringify(websiteData.links.slice(0, 50))}` // Limit to first 50 links to avoid token limits
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });
        
        const aiResults = JSON.parse(completion.choices[0].message.content);
        
        if (aiResults && aiResults.results && Array.isArray(aiResults.results)) {
          results = aiResults.results.filter(r => r.relevance > 30).map(r => ({
            title: r.title,
            description: r.description,
            url: r.url,
            matchType: 'semantic',
            relevance: r.relevance
          }));
        }
      } catch (aiError) {
        console.error('Error using AI for semantic search:', aiError);
        
        // Fall back to keyword matching if AI fails
        const keywords = query.toLowerCase().split(/\s+/);
        
        results = websiteData.links
          .filter(link => {
            return keywords.some(keyword => 
              link.title.toLowerCase().includes(keyword) ||
              link.description.toLowerCase().includes(keyword)
            );
          })
          .map(link => ({
            title: link.title,
            description: link.description,
            url: link.url,
            matchType: 'keyword'
          }));
      }
    }

    // Return the search results
    return res.status(200).json({
      domain: websiteData.domain,
      url: websiteData.url,
      query,
      results: results.slice(0, 10) // Limit to top 10 results
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during search'
    });
  }
};