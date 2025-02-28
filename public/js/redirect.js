// Function to determine the correct starting page
function redirectToCorrectPage() {
    // Check if in root index.html
    if (window.location.pathname === '/' || 
        window.location.pathname === '/index.html' || 
        window.location.pathname.endsWith('/index.html')) {
        
        // Check current state
        // 1. If privacy not accepted, go there first
        if (!localStorage.getItem('privacyAccepted')) {
            window.location.href = 'privacy.html';
            return;
        }
        
        // 2. If not authenticated, go to auth
        if (!localStorage.getItem('authVerified')) {
            window.location.href = 'auth.html';
            return;
        }
        
        // 3. Otherwise go to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Add loading animation
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    
    // Redirect after a short delay for effect
    setTimeout(() => {
        redirectToCorrectPage();
    }, 800);
});