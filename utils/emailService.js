const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // App Password (not regular password)
    }
  });
};

// Generate HTML OTP Email Template
const generateOTPEmailHTML = (otp, userName, userType = 'student') => {
  const userTypeLabel = userType === 'parent' ? 'Parent' : 'Student';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sriram IAS - OTP Verification</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    
    .logo {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    
    .tagline {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 5px;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .greeting {
      font-size: 24px;
      color: #333;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .message {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    
    .otp-container {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 10px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
      border: 2px dashed #667eea;
    }
    
    .otp-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .otp-code {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      margin: 15px 0;
      font-family: 'Courier New', monospace;
    }
    
    .otp-validity {
      font-size: 14px;
      color: #999;
      margin-top: 15px;
    }
    
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 25px 0;
      border-radius: 5px;
    }
    
    .warning-text {
      font-size: 14px;
      color: #856404;
      line-height: 1.5;
    }
    
    .warning-icon {
      font-size: 18px;
      margin-right: 8px;
    }
    
    .footer {
      background-color: #f8f9fa;
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    
    .footer-text {
      font-size: 13px;
      color: #999;
      line-height: 1.6;
    }
    
    .contact-info {
      margin-top: 15px;
      font-size: 13px;
      color: #666;
    }
    
    .contact-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #ddd, transparent);
      margin: 25px 0;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        border-radius: 0;
      }
      
      .header {
        padding: 30px 20px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .otp-code {
        font-size: 36px;
        letter-spacing: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🎓 Sriram IAS</div>
      <div class="tagline">Excellence in Civil Services Preparation</div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <div class="greeting">Hello ${userName || 'User'},</div>
      
      <div class="message">
        You have requested an OTP code to verify your ${userTypeLabel} account 
        with Sriram IAS. Please use the code below to complete your verification.
      </div>
      
      <!-- OTP Box -->
      <div class="otp-container">
        <div class="otp-label">Your OTP Code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-validity">⏱️ Valid for 5 minutes only</div>
      </div>
      
      <div class="divider"></div>
      
      <!-- Security Warning -->
      <div class="warning-box">
        <div class="warning-text">
          <span class="warning-icon">⚠️</span>
          <strong>Security Notice:</strong> Never share this OTP with anyone. 
          Sriram IAS will never ask for your OTP via phone or email. 
          This code will expire in 5 minutes.
        </div>
      </div>
      
      <div class="message">
        If you didn't request this OTP, please ignore this email or contact 
        our support team immediately.
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        This is an automated message from Sriram IAS.<br>
        Please do not reply to this email.
      </div>
      
      <div class="contact-info">
        Need help? Contact us at 
        <a href="mailto:support@sriramias.com" class="contact-link">support@sriramias.com</a>
        <br>
        📞 +91-XXXXXXXXXX | 🌐 www.sriramias.com
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// Send OTP Email
const sendOTPEmail = async (to, otp, userName, userType = 'student') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Sriram IAS" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `🔐 Your OTP Code - Sriram IAS`,
      html: generateOTPEmailHTML(otp, userName, userType),
      // Fallback to plain text for email clients that don't support HTML
      text: `
Sriram IAS - OTP Verification

Hello ${userName || 'User'},

Your OTP code is: ${otp}

This code is valid for 5 minutes only.

⚠️ Security Notice: Never share this OTP with anyone.

If you didn't request this OTP, please ignore this email.

Contact: support@sriramias.com
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendOTPEmail,
  generateOTPEmailHTML
};
