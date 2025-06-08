import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, url, emailType = 'verification') => {
  try {
    console.log(`Attempting to send email to ${to} with subject: ${subject}`);

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      debug: true,
    });

    const encodedUrl = encodeURI(url);

    // Define email content based on emailType
    let text, html;
    if (emailType === 'reset') {
      text = `Click the link to reset your password: ${encodedUrl}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4a6cff; text-align: center;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #33344e; text-align: center;">
            You requested a password reset for your FundChainX account. Click the link below to reset your password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${encodedUrl}" style="background-color: #4a6cff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #94a3b8; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser: <br />
            <a href="${encodedUrl}" style="color: #4a6cff;">${encodedUrl}</a>
          </p>
          <p style="font-size: 14px; color: #94a3b8; text-align: center;">
            This link will expire in 1 hour. If you didn’t request a password reset, please ignore this email.
          </p>
        </div>
      `;
    } else {
      // Default to verification email
      text = `Please verify your email by clicking this link: ${encodedUrl}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4a6cff; text-align: center;">Welcome to FundChainX!</h2>
          <p style="font-size: 16px; color: #33344e; text-align: center;">
            You're one step away from unlocking the full potential of FundChainX. Please verify your email address to continue.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${encodedUrl}" style="background-color: #4a6cff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: 600;">
              Verify Email
            </a>
          </div>
          <p style="font-size: 14px; color: #94a3b8; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser: <br />
            <a href="${encodedUrl}" style="color: #4a6cff;">${encodedUrl}</a>
          </p>
          <p style="font-size: 14px; color: #94a3b8; text-align: center;">
            If you didn’t sign up for FundChainX, please ignore this email.
          </p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email to', to, ':', error);
    throw error;
  }
};