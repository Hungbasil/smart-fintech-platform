package com.fintech.smartwealth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String from;

    public void sendOtpEmail(String toEmail, String otp) {
      if (from == null || from.isBlank()) {
        return;
      }
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            if (from != null && !from.isBlank()) helper.setFrom(from);
            helper.setSubject("Your SmartFin verification code");
            helper.setText("""
                    <div style="font-family:Arial,sans-serif;background:#f4f7f6;padding:32px;color:#17212b">
                      <div style="max-width:520px;margin:auto;background:#fff;padding:36px;border-radius:18px;border:1px solid #e3ebe8">
                        <div style="color:#087f74;font-weight:800;letter-spacing:2px">SMARTFIN</div>
                        <h1 style="margin:24px 0 8px">Verify your email</h1>
                        <p style="color:#71808c">Use this one-time code to continue securely:</p>
                        <div style="font-size:32px;letter-spacing:10px;font-weight:800;color:#087f74;background:#e4f4f0;padding:18px;text-align:center;border-radius:12px">%s</div>
                        <p style="color:#71808c;font-size:13px">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
                      </div>
                    </div>
                    """.formatted(otp), true);
            mailSender.send(message);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to send OTP email", exception);
        }
    }
}