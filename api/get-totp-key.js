// API endpoint to securely provide the TOTP key from environment variables

const { authenticator } = require('otplib');

module.exports = async (req, res) => {
  // CORS headers setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get secret key from environment variable
    const secretKey = process.env.TOTP_SECRET_KEY;
    
    if (!secretKey) {
      console.error('TOTP_SECRET_KEY environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'TOTP secret key is not configured'
      });
    }

    // Return the secret key in a secure way
    return res.status(200).json({
      secretKey: secretKey
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred'
    });
  }
};