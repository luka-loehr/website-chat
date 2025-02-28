// API endpoint for chat with OpenAI GPT-4o
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

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

  try {
    const { messages, websiteData } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Prepare system message
    let systemMessage = {
      role: "system",
      content: `You are an AI assistant that helps users find information on websites. 
      You will ask the user to provide a website URL if they haven't already.
      Once they provide a URL, you'll inform them that you'll analyze the website.
      After analysis, you can help them find specific information or links on that website.`
    };

    // If website data is provided, enhance the system message
    if (websiteData) {
      systemMessage.content += `\n\nI have information about the website: ${websiteData.url}.
      When the user asks for specific content or links, I should search through this information and provide the most relevant links.
      I should not make up links or information not found in the data.`;
    }

    // Construct the messages array with the system message first
    const fullMessages = [systemMessage, ...messages];

    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract the website URL if it exists in the user's last message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    let websiteUrl = null;
    
    if (lastUserMessage) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = lastUserMessage.content.match(urlRegex);
      if (match) {
        websiteUrl = match[0];
      }
    }

    return res.status(200).json({
      message: completion.choices[0].message,
      websiteUrl: websiteUrl
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during the chat'
    });
  }
};