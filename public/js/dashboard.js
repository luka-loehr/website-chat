// Check if authenticated
if (!localStorage.getItem('authVerified')) {
    window.location.href = 'auth.html';
}

// Check if privacy policy was accepted
if (!localStorage.getItem('privacyAccepted')) {
    window.location.href = 'privacy.html';
}

// Global variables
let isAnalyzing = false;
let analysisId = null;
let analysisInterval = null;
let chatMessages = [];
let websiteData = null;
let fullModeEnabled = false;

// Initialize from local storage
document.addEventListener('DOMContentLoaded', function() {
    // Initialize full mode setting
    const storedFullMode = localStorage.getItem('fullModeEnabled');
    if (storedFullMode) {
        fullModeEnabled = storedFullMode === 'true';
        document.getElementById('fullModeToggle').checked = fullModeEnabled;
    }
    
    // Add event listeners for settings
    document.getElementById('openSettings').addEventListener('click', toggleSettings);
    document.getElementById('closeSettings').addEventListener('click', toggleSettings);
    document.getElementById('fullModeToggle').addEventListener('change', function() {
        fullModeEnabled = this.checked;
        localStorage.setItem('fullModeEnabled', fullModeEnabled);
    });
    
    // Chat input auto-resize
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Send message on Enter (but Shift+Enter for new line)
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button click
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    
    // Cancel analysis button
    document.getElementById('cancelAnalysis').addEventListener('click', cancelAnalysis);
    
    // Logout button
    document.getElementById('logoutButton').addEventListener('click', logout);
    
    // Load any stored messages
    loadChatHistory();
    
    // Add welcome message if no history
    if (chatMessages.length === 0) {
        addBotMessage("👋 Welcome to Website Analyzer! I can help you analyze websites and find specific information on them. To get started, please share a website URL you'd like to analyze.");
    }
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        loadingScreen.classList.add('hide');
    }, 800);
});

// Toggle settings panel
function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    settingsPanel.classList.toggle('active');
}

// Helper function to format timestamps
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add a message to the chat UI
function addMessage(content, isUser = false, time = new Date()) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    // Process links in content if it's a bot message
    if (!isUser) {
        // Replace URLs with clickable links
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="chat-link">$1</a>');
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-time">${formatTime(time)}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Update chat history
    addToHistory(content, isUser);
}

// Add a user message
function addUserMessage(content) {
    addMessage(content, true);
}

// Add a bot message
function addBotMessage(content) {
    addMessage(content, false);
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Save message to chat history
function addToHistory(content, isUser) {
    chatMessages.push({
        content,
        role: isUser ? 'user' : 'assistant',
        timestamp: new Date().toISOString()
    });
    
    // Keep only the last 50 messages
    if (chatMessages.length > 50) {
        chatMessages = chatMessages.slice(-50);
    }
    
    // Save to localStorage
    localStorage.setItem('chatHistory', JSON.stringify(chatMessages));
}

// Load chat history from localStorage
function loadChatHistory() {
    const history = localStorage.getItem('chatHistory');
    if (history) {
        try {
            chatMessages = JSON.parse(history);
            
            // Display up to the last 20 messages
            const recentMessages = chatMessages.slice(-20);
            for (const msg of recentMessages) {
                addMessage(msg.content, msg.role === 'user', new Date(msg.timestamp));
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            localStorage.removeItem('chatHistory');
            chatMessages = [];
        }
    }
}

// Helper function to show notification
function showNotification(message, type) {
    // Remove existing notification if present
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Force reflow
    notification.offsetHeight;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', function() {
            notification.remove();
        }, { once: true });
    }, 3000);
}

// Extract domain name from URL
function getDomainFromUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '').split('.')[0];
    } catch (error) {
        return null;
    }
}

// Logout function
function logout() {
    // Clear auth data
    localStorage.removeItem('authVerified');
    localStorage.removeItem('authExpiry');
    
    // Show notification
    showNotification('Logging out...', 'neutral');
    
    // Redirect after delay
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 1500);
}

// Send a message to the chat
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;
    
    // Reset input height and clear
    chatInput.style.height = 'auto';
    chatInput.value = '';
    
    // Add user message to UI
    addUserMessage(messageText);
    
    // Check if message contains a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatch = messageText.match(urlRegex);
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Call the chat API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: formatMessagesForAPI(),
                websiteData: websiteData
            })
        });
        
        if (!response.ok) {
            throw new Error('Error communicating with AI');
        }
        
        const data = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add bot response to UI
        addBotMessage(data.message.content);
        
        // Check if we received a website URL to analyze
        const websiteUrl = data.websiteUrl || (urlMatch ? urlMatch[0] : null);
        
        if (websiteUrl && !isAnalyzing) {
            // Confirm with the user before starting analysis
            if (confirm(`Would you like to analyze the website: ${websiteUrl}?`)) {
                startWebsiteAnalysis(websiteUrl);
            }
        }
    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        addBotMessage("I'm sorry, I encountered an error while processing your message. Please try again.");
        showNotification('Communication error. Please try again.', 'error');
    }
}

// Format messages for the API
function formatMessagesForAPI() {
    return chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

// Start website analysis
async function startWebsiteAnalysis(url) {
    if (isAnalyzing) {
        showNotification('An analysis is already in progress.', 'warning');
        return;
    }
    
    try {
        // Show the analysis container
        const analysisContainer = document.getElementById('analysisContainer');
        analysisContainer.classList.add('visible');
        
        // Update URL display
        document.getElementById('analysisUrl').textContent = url;
        
        // Reset progress
        const progressBar = document.getElementById('analysisProgress');
        progressBar.style.width = '0%';
        document.getElementById('progressPercentage').textContent = '0%';
        document.getElementById('analysisStatus').textContent = 'Initializing...';
        
        // Set analyzing state
        isAnalyzing = true;
        
        // Call the analysis API to start the process
        const response = await fetch('/api/analyze-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: url,
                fullMode: fullModeEnabled
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start website analysis');
        }
        
        const data = await response.json();
        analysisId = data.analysisId;
        
        // Add a message about starting analysis
        addBotMessage(`I'm starting to analyze ${url}. This might take up to ${fullModeEnabled ? '20' : '10'} minutes. You'll see updates on the progress below.`);
        
        // Start polling for updates
        startAnalysisUpdates();
    } catch (error) {
        console.error('Analysis error:', error);
        isAnalyzing = false;
        document.getElementById('analysisContainer').classList.remove('visible');
        addBotMessage(`I'm sorry, there was an error starting the analysis: ${error.message}`);
        showNotification('Analysis error. Please try again.', 'error');
    }
}

// Start polling for analysis updates
function startAnalysisUpdates() {
    if (!analysisId) return;
    
    // Poll every 2 seconds
    analysisInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/analyze-website?analysisId=${analysisId}`);
            
            if (!response.ok) {
                throw new Error('Failed to get analysis update');
            }
            
            const data = await response.json();
            
            // Update progress
            updateAnalysisProgress(data);
            
            // Check if analysis is complete
            if (data.status === 'completed') {
                completeAnalysis(data);
            } else if (data.status === 'error') {
                failAnalysis(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error checking analysis status:', error);
        }
    }, 2000);
}

// Update analysis progress in the UI
function updateAnalysisProgress(data) {
    // Update progress bar
    const progressBar = document.getElementById('analysisProgress');
    const progressPercentage = document.getElementById('progressPercentage');
    const progress = Math.min(99, data.progress || 0);
    
    progressBar.style.width = `${progress}%`;
    progressPercentage.textContent = `${progress}%`;
    
    // Update status text if we have summaries
    if (data.summaries && data.summaries.length > 0) {
        const lastSummary = data.summaries[data.summaries.length - 1];
        document.getElementById('analysisStatus').textContent = lastSummary.summary;
    }
}

// Complete the analysis process
function completeAnalysis(data) {
    clearInterval(analysisInterval);
    analysisInterval = null;
    isAnalyzing = false;
    
    // Update UI to show completion
    const progressBar = document.getElementById('analysisProgress');
    const progressPercentage = document.getElementById('progressPercentage');
    
    progressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    document.getElementById('analysisStatus').textContent = 'Analysis complete!';
    
    // Hide analysis container after a delay
    setTimeout(() => {
        document.getElementById('analysisContainer').classList.remove('visible');
    }, 3000);
    
    // Load the website data
    loadWebsiteData(data.domain);
    
    // Add a completion message
    addBotMessage(`✅ I've completed the analysis of the website! I found information about links, pages, and navigation. You can now ask me questions about the website, like "How do I find the contact page?" or "Where can I learn about pricing?"`);
}

// Fail the analysis process
function failAnalysis(errorMessage) {
    clearInterval(analysisInterval);
    analysisInterval = null;
    isAnalyzing = false;
    
    // Update UI to show failure
    document.getElementById('analysisStatus').textContent = `Analysis failed: ${errorMessage}`;
    
    // Hide analysis container after a delay
    setTimeout(() => {
        document.getElementById('analysisContainer').classList.remove('visible');
    }, 3000);
    
    // Add a failure message
    addBotMessage(`❌ I'm sorry, the website analysis failed. Error: ${errorMessage}. You can try again with a different URL if you'd like.`);
    
    showNotification('Analysis failed. Please try again.', 'error');
}

// Cancel the current analysis
function cancelAnalysis() {
    if (!isAnalyzing) return;
    
    clearInterval(analysisInterval);
    analysisInterval = null;
    isAnalyzing = false;
    
    // Hide analysis container
    document.getElementById('analysisContainer').classList.remove('visible');
    
    // Add a cancellation message
    addBotMessage("⚠️ The website analysis has been cancelled. You can start a new analysis with another URL if you'd like.");
}

// Load website data for a domain
async function loadWebsiteData(domain) {
    if (!domain) return;
    
    try {
        // For security, let's not store website data in localStorage
        // Instead, we'll keep it in memory during the session
        
        // Try to load the JSON file for the domain from the server
        const response = await fetch(`/websites/${domain}.json`);
        
        if (!response.ok) {
            throw new Error('Website data not found');
        }
        
        websiteData = await response.json();
        console.log('Loaded website data:', websiteData);
        
        // Add website info to bot response
        addBotMessage(`I've loaded information about ${websiteData.url}. I found ${websiteData.links.length} links on the website. What would you like to know?`);
    } catch (error) {
        console.error('Error loading website data:', error);
        websiteData = null;
    }
}

// Function to search for specific content on the website
async function searchWebsite(domain, query) {
    if (!domain || !query) return null;
    
    try {
        const response = await fetch('/api/search-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain, query })
        });
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Search error:', error);
        return null;
    }
}

// Function to display search results in chat
function displaySearchResults(results) {
    if (!results || !results.results || results.results.length === 0) {
        addBotMessage("I couldn't find any relevant information about that on the website.");
        return;
    }
    
    // Start with an introduction
    let message = `Here's what I found about that on ${results.domain}:\n\n`;
    
    // Add each result with a nice formatting
    results.results.forEach((result, index) => {
        if (index > 4) return; // Limit to top 5 results to avoid long messages
        
        message += `${index + 1}. **${result.title}**\n`;
        message += `   ${result.description}\n`;
        message += `   [Link: ${result.url}](${result.url})\n\n`;
    });
    
    // Add total count if there are more results
    if (results.results.length > 5) {
        message += `(Found ${results.results.length} results in total. Showing top 5.)`;
    }
    
    addBotMessage(message);
}

// Process incoming messages to detect queries about website content
async function processWebsiteQueries(message) {
    if (!websiteData) return false;
    
    // Check if the message is asking about website content
    const queryPatterns = [
        /how (do|can) I find/i,
        /where (is|are|can I find)/i,
        /looking for/i,
        /need to find/i,
        /help me find/i,
        /search for/i,
        /show me/i,
        /tell me about/i,
        /what is the/i,
        /link to/i
    ];
    
    const isQuery = queryPatterns.some(pattern => pattern.test(message));
    
    if (isQuery) {
        showTypingIndicator();
        
        try {
            // First try to search the website data
            const results = await searchWebsite(websiteData.domain, message);
            
            if (results && results.results && results.results.length > 0) {
                hideTypingIndicator();
                displaySearchResults(results);
                return true;
            }
        } catch (error) {
            console.error('Error processing website query:', error);
        }
        
        hideTypingIndicator();
    }
    
    return false;
}

// Override the sendMessage function to handle website queries
const originalSendMessage = sendMessage;
sendMessage = async function() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;
    
    // Reset input height and clear
    chatInput.style.height = 'auto';
    chatInput.value = '';
    
    // Add user message to UI
    addUserMessage(messageText);
    
    // If we have website data, check if this is a query about the website
    if (websiteData) {
        const handled = await processWebsiteQueries(messageText);
        if (handled) return;
    }
    
    // If not handled as a website query, continue with normal chatbot flow
    await originalSendMessage.call(this);
};

// Function to extract a clean domain name for file naming
function sanitizeDomainForFilename(url) {
    try {
        const urlObj = new URL(url);
        // Remove www. and take only the domain part
        return urlObj.hostname.replace(/^www\./, '').split('.')[0];
    } catch (error) {
        // Fallback to simple extraction if URL parsing fails
        return url.replace(/^https?:\/\/(www\.)?/, '').split('.')[0].split('/')[0];
    }
}

// Check if a URL is safe to analyze (basic check)
function isSafeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Restrict to http and https protocols
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

// Initialize the UI state
function initializeUI() {
    // Update loading state
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('hide');
    
    // Add event for window resize to adjust UI
    window.addEventListener('resize', adjustUIForScreenSize);
    adjustUIForScreenSize();
    
    // Focus chat input
    document.getElementById('chatInput').focus();
}

// Adjust UI based on screen size
function adjustUIForScreenSize() {
    const isMobile = window.innerWidth < 768;
    const settingsPanel = document.getElementById('settingsPanel');
    
    if (isMobile) {
        // Mobile adjustments
        if (settingsPanel.classList.contains('active')) {
            // If settings are open on mobile, add overlay
            if (!document.getElementById('settingsOverlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'settingsOverlay';
                overlay.className = 'settings-overlay';
                overlay.addEventListener('click', toggleSettings);
                document.body.appendChild(overlay);
            }
        } else {
            // Remove overlay if settings closed
            const overlay = document.getElementById('settingsOverlay');
            if (overlay) overlay.remove();
        }
    }
}

// Call initializeUI when page loads
window.addEventListener('load', initializeUI);