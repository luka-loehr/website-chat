// Check if already authenticated
if (localStorage.getItem('authVerified')) {
    // Check expiry
    const authExpiry = localStorage.getItem('authExpiry');
    if (authExpiry && parseInt(authExpiry) > Date.now()) {
        // Auth still valid, proceed to next page
        if (!localStorage.getItem('privacyAccepted')) {
            window.location.href = 'privacy.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Auth expired, remove it
        localStorage.removeItem('authVerified');
        localStorage.removeItem('authExpiry');
    }
}

// Add page load animation
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    setTimeout(() => {
        container.classList.add('loaded');
    }, 100);
    
    // Focus on the input
    document.getElementById('authCode').focus();
    
    // Add input event listeners for better UX
    const codeInput = document.getElementById('authCode');
    codeInput.addEventListener('input', function() {
        // Only allow numbers
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Clear error on input change
        document.getElementById('authError').textContent = '';
        
        // Auto-submit when 6 digits are entered
        if (this.value.length === 6) {
            setTimeout(() => verifyCode(), 300);
        }
    });
    
    // Button event listener
    document.getElementById('verifyCode').addEventListener('click', verifyCode);
    
    // Allow form submission with Enter key
    codeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyCode();
        }
    });
});

// Base32 to Hex conversion
function base32ToHex(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';
    
    // Normalize input: uppercase and remove spaces
    base32 = base32.toUpperCase().replace(/\s/g, '');

    // Convert each base32 character to 5 bits
    for (let i = 0; i < base32.length; i++) {
        const val = base32Chars.indexOf(base32.charAt(i));
        if (val === -1) continue; // Skip non-base32 chars
        bits += ('00000' + val.toString(2)).slice(-5);
    }

    // Convert each 4 bits to a hex character
    for (let i = 0; i + 4 <= bits.length; i += 4) {
        const chunk = bits.substr(i, 4);
        hex += parseInt(chunk, 2).toString(16);
    }

    return hex;
}

// Generate TOTP token
function generateTOTP(secretHex, timeWindow) {
    // Time counter as 8-byte hex
    const timeCounter = ('0000000000000000' + timeWindow.toString(16)).slice(-16);
    
    // Convert hex to WordArray for CryptoJS
    const timeCounterWords = CryptoJS.enc.Hex.parse(timeCounter);
    const secretWords = CryptoJS.enc.Hex.parse(secretHex);
    
    // Compute HMAC-SHA1
    const hmac = CryptoJS.HmacSHA1(timeCounterWords, secretWords);
    const hmacHex = hmac.toString(CryptoJS.enc.Hex);
    
    // Dynamic truncation
    const offset = parseInt(hmacHex.substring(hmacHex.length - 1), 16);
    
    // 4 bytes starting at offset
    const truncatedHash = hmacHex.substr(offset * 2, 8);
    
    // Convert to decimal and take last 6 digits
    let token = (parseInt(truncatedHash, 16) & 0x7FFFFFFF) % 1000000;
    
    // Pad with leading zeros if needed
    return ('000000' + token).slice(-6);
}

// Fetch the secret key from the server
async function fetchSecretKey() {
    try {
        const response = await fetch('/api/get-totp-key');
        if (!response.ok) {
            throw new Error('Failed to fetch secret key');
        }
        const data = await response.json();
        return data.secretKey;
    } catch (error) {
        console.error('Error fetching secret key:', error);
        return null;
    }
}

// Validate TOTP token
async function validateTOTP(secretKey, userToken) {
    try {
        // Convert base32 secret to hex
        const secretHex = base32ToHex(secretKey);
        
        // Get current time window
        const timeWindow = Math.floor(Date.now() / 1000 / 30);
        
        // Check current and adjacent time windows (for clock skew)
        for (let i = -2; i <= 2; i++) {
            const calculatedToken = generateTOTP(secretHex, timeWindow + i);
            
            if (calculatedToken === userToken) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('TOTP validation error:', error);
        return false;
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

// Verification function
async function verifyCode() {
    const code = document.getElementById('authCode').value.trim();
    const errorElement = document.getElementById('authError');
    const button = document.getElementById('verifyCode');
    const buttonText = button.querySelector('.button-text');
    const buttonIcon = button.querySelector('.button-icon i');
    
    // Validate input
    if (code.length !== 6 || !/^\d+$/.test(code)) {
        errorElement.textContent = 'Please enter a 6-digit code.';
        return;
    }
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = 'Verifying...';
    buttonIcon.className = 'fas fa-spinner fa-spin';
    
    try {
        // Get the secret key from the server
        const secretKey = await fetchSecretKey();
        
        if (!secretKey) {
            throw new Error('Could not retrieve the security key');
        }
        
        // Verify TOTP
        const isValid = await validateTOTP(secretKey, code);
        
        if (isValid) {
            // Success - store auth in localStorage with 7-day expiry
            const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
            localStorage.setItem('authVerified', 'true');
            localStorage.setItem('authExpiry', expiryTime.toString());
            
            // Success animation
            button.classList.add('success');
            buttonText.textContent = 'Success!';
            buttonIcon.className = 'fas fa-check';
            
            // Redirect after success
            setTimeout(() => {
                if (!localStorage.getItem('privacyAccepted')) {
                    window.location.href = 'privacy.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } else {
            // Error state
            button.classList.add('error');
            buttonText.textContent = 'Invalid Code';
            buttonIcon.className = 'fas fa-times';
            errorElement.textContent = 'The code entered is invalid. Please try again.';
            
            // Reset after delay
            setTimeout(() => {
                button.disabled = false;
                button.classList.remove('error');
                buttonText.textContent = 'Verify Code';
                buttonIcon.className = 'fas fa-arrow-right';
                document.getElementById('authCode').value = '';
                document.getElementById('authCode').focus();
            }, 2000);
        }
    } catch (error) {
        console.error('Verification error:', error);
        // Error state
        button.classList.add('error');
        buttonText.textContent = 'Error';
        buttonIcon.className = 'fas fa-exclamation-triangle';
        errorElement.textContent = error.message || 'An error occurred';
        
        showNotification('Authentication error. Please try again later.', 'error');
        
        // Reset after delay
        setTimeout(() => {
            button.disabled = false;
            button.classList.remove('error');
            buttonText.textContent = 'Verify Code';
            buttonIcon.className = 'fas fa-arrow-right';
        }, 2000);
    }
}