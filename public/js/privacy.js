// Check if privacy policy was accepted
if (localStorage.getItem('privacyAccepted')) {
    // Redirect to next step
    if (!localStorage.getItem('authVerified')) {
        window.location.href = 'auth.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Add page load animation
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    setTimeout(() => {
        container.classList.add('loaded');
    }, 100);
});

// Handle privacy policy acceptance
document.getElementById('acceptPrivacy').addEventListener('click', function() {
    // Store that user accepted privacy policy
    localStorage.setItem('privacyAccepted', 'true');
    
    // Add transition effect before redirecting
    const container = document.querySelector('.container');
    container.classList.add('fade-out');
    
    // Create loading screen
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    
    const loadingIcon = document.createElement('div');
    loadingIcon.className = 'loading-icon';
    
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Loading...';
    
    loadingScreen.appendChild(loadingIcon);
    loadingScreen.appendChild(loadingText);
    document.body.appendChild(loadingScreen);
    
    container.addEventListener('transitionend', function() {
        // Redirect to next page
        setTimeout(() => {
            // If auth not yet verified, go to auth page
            if (!localStorage.getItem('authVerified')) {
                window.location.href = 'auth.html';
            }
            // Otherwise go to dashboard
            else {
                window.location.href = 'dashboard.html';
            }
        }, 500);
    }, { once: true });
});