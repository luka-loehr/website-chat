# Website Analyzer with AI Chat

A modern web application that analyzes websites and provides an AI-powered chat interface to find information on those websites. The app uses TOTP authentication for secure access and OpenAI's GPT-4o model for intelligent website analysis.

## Features

- **TOTP Authentication**: Secure app access with Google Authenticator
- **Website Analysis**: Crawls and analyzes websites to extract useful information
- **AI-Powered Chat**: Interactive chat with OpenAI's GPT-4o to find website information
- **Progress Tracking**: Real-time updates on website analysis progress
- **Fast Search**: Find specific information on analyzed websites
- **Modern UI**: Clean, responsive design with animations

## Directory Structure

```
website-chat/
├── api/
│   ├── analyze-website.js
│   ├── chat.js
│   ├── get-totp-key.js
│   └── search-website.js
├── keys/
│   └── [your TOTP QR code and secret]
├── public/
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── privacy.js
│   │   └── redirect.js
│   ├── auth.html
│   ├── dashboard.html
│   ├── index.html
│   └── privacy.html
├── websites/
│   └── [analyzed website data stored here]
├── package.json
└── vercel.json
```

## Setup Instructions

### Prerequisites

- Node.js (>=18)
- Vercel CLI
- OpenAI API key
- TOTP secret key

### Environment Variables

Set up the following environment variables in Vercel:

- `OPENAI_API_KEY`: Your OpenAI API key
- `TOTP_SECRET_KEY`: Your TOTP secret key for authentication

### Installation Steps

1. Clone the repository:
   ```
   git clone <repository-url>
   cd website-chat
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Login to Vercel:
   ```
   npx vercel login
   ```

4. Create the environment variables:
   ```
   npx vercel env add OPENAI_API_KEY
   npx vercel env add TOTP_SECRET_KEY
   ```

5. Start the development server:
   ```
   npm start
   ```

6. Deploy to production:
   ```
   npm run deploy
   ```

## Usage

1. Open the app in your browser
2. Accept the privacy policy
3. Enter the TOTP code from your Google Authenticator app
4. Start a chat and provide a website URL to analyze
5. Once analysis is complete, ask questions about the website content

## Agentic Website Analysis System

The application features an advanced agentic website analysis system that autonomously crawls, analyzes, and indexes website content:

### How It Works

1. **Initiation**: When a user provides a URL in the chat, the AI assistant triggers the analysis agent
2. **Crawling Phase**: 
   - The agent autonomously navigates through the website using Puppeteer
   - It identifies navigational elements, buttons, links, and content sections
   - The agent creates a comprehensive map of the website's structure
   - It follows links within the same domain to discover additional pages

3. **Intelligent Content Processing**:
   - The agent extracts meaningful metadata including titles, descriptions, and link contexts
   - OpenAI's GPT-4o is used to enhance descriptions and categorize content
   - Links are tagged by type (navigation, content, button, footer)
   - The agent builds relationships between different sections of the website

4. **Progress Monitoring**:
   - Real-time progress updates are generated every 7 seconds
   - An AI summarizes recent crawler actions into human-readable status messages
   - A detailed log tracks every step the agent takes for debugging purposes
   - Progress percentage is calculated and displayed via the progress bar

5. **Data Organization**:
   - All discovered content is structured into a JSON file named after the website domain
   - Each link is stored with title, description, URL, and contextual metadata
   - The JSON structure allows for efficient querying and retrieval

6. **Modes of Operation**:
   - **Standard Mode**: 10-minute analysis, visits up to 50 pages
   - **Full Mode**: 20-minute analysis, visits up to 100 pages, more detailed indexing

### Technical Implementation

The agentic system uses a combination of technologies:
- Puppeteer for headless browser control
- AI for contextual understanding and summarization
- Asynchronous processing with Promise-based architecture
- Efficient data structures for storing website information
- Client-server communication for real-time updates
- Semantic analysis of content relationships and context

### AI Assistant Integration

The chat interface intelligently works with the analysis agent:

1. **Natural Language Understanding**:
   - The assistant interprets user queries about website content
   - It matches semantic intent to specific website sections
   - It can understand vague queries like "Where can I find pricing?"

2. **Contextual Response Generation**:
   - When responding to queries, the assistant references analyzed website data
   - It formats links in a user-friendly way with descriptions
   - It prioritizes most relevant information based on context

3. **Continuous Learning**:
   - The system improves its understanding of the website as users ask more questions
   - It helps users navigate even complex website structures

4. **Example Interactions**:
   - User: "How do I contact support?"
   - Assistant: *analyzes website data for contact information*
   - Assistant: "I found the support page at [link]. They also offer email support at [email] and a live chat option."

5. **Error Handling**:
   - If a website cannot be fully analyzed, the assistant explains limitations
   - When information can't be found, it suggests alternative searches
   - For websites with access restrictions, it provides helpful feedback

## Technical Architecture

### Agent System Architecture

The website analysis agent operates on a sophisticated multi-component architecture:

1. **Dispatcher Layer**:
   - Manages analysis requests and queues
   - Ensures only one analysis runs per domain
   - Handles timeouts and resource allocation

2. **Crawler Engine**:
   - Headless browser control via Puppeteer
   - Intelligent navigation prioritization
   - DOM parsing and element extraction
   - Link discovery and filtering

3. **AI Analysis Layer**:
   - Content classification and categorization
   - Description enhancement with GPT-4o
   - Relationship mapping between website sections
   - Semantic understanding of website structure

4. **Data Processing Pipeline**:
   - Real-time data extraction
   - Structured JSON formation
   - Deduplication of content
   - Metadata enrichment

5. **Progress Monitoring System**:
   - Logging infrastructure for each step
   - Real-time status generation
   - Client-server synchronization
   - Summary generation for user-friendly updates

6. **Search Subsystem**:
   - Semantic search capabilities
   - Keyword and intent matching
   - Relevance scoring algorithm
   - Result formatting for chat presentation

### System Performance Considerations

- **Crawling Efficiency**: Uses intelligent prioritization to analyze the most important pages first
- **Resource Management**: Controls memory usage during large website analysis
- **Timeout Handling**: Graceful degradation when analysis takes too long
- **Concurrency Control**: Prevents overloading the server with multiple analyses
- **Error Recovery**: Can resume analysis from failures when possible

### Integration Points

- **OpenAI API**: Used for semantic understanding and content enhancement
- **Vercel Serverless Functions**: Hosts the API endpoints
- **Client-Side Integration**: Real-time updates via polling
- **Local Storage**: Manages authentication state and chat history
- **File System**: Stores analysis results as persistent JSON data

## Security Considerations

- TOTP keys are fetched from environment variables and never stored in the browser
- Authentication expires after 7 days
- Website data is analyzed server-side to avoid client-side security issues
- API endpoints include proper validation to prevent abuse