import { Resend } from 'resend';
import { RefillService } from './RefillService.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM || 'noreply@clarity-ehr.com';

export class PharmacyEmailService {
  static async sendRefillRequest({
    refillId,
    pharmacyEmail,
    pharmacyName,
    patientName,
    patientDOB,
    medicationName,
    dose,
    frequency,
    refillCount,
    priority,
    notes,
    clinicName = 'Clarity EHR Clinic',
    clinicPhone = '(555) 123-4567',
  }) {
    if (!pharmacyEmail) {
      throw new Error('Pharmacy email is required');
    }

    const priorityLabel = {
      low: '🟢 Low Priority',
      normal: '🔵 Standard',
      high: '🟠 High Priority',
      urgent: '🔴 URGENT - ≤7 Days',
    }[priority] || 'Standard';

    const emailBody = `
Dear ${pharmacyName},

We are sending a prescription refill request for your processing:

PATIENT INFORMATION
───────────────────
Name: ${patientName}
DOB: ${new Date(patientDOB).toLocaleDateString()}

PRESCRIPTION DETAILS
────────────────────
Medication: ${medicationName}
Dose: ${dose}
Frequency: ${frequency}
Refills to Authorize: ${refillCount}
Priority: ${priorityLabel}

${notes ? `NOTES\n──────────────────────\n${notes}\n` : ''}

CONTACT INFORMATION
────────────────────
Clinic: ${clinicName}
Phone: ${clinicPhone}
Reply-to: ${FROM_EMAIL}

Please confirm receipt and update status in your system.

HIPAA NOTICE: This message contains protected health information intended only for the recipient.

Best regards,
Clarity EHR System
    `.trim();

    try {
      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to: pharmacyEmail,
        subject: `[REFILL] ${patientName} - ${medicationName} ${dose}`,
        text: emailBody,
        html: this._buildHtmlEmail(emailBody, patientName, medicationName),
      });

      // Track notification
      const notificationId = await RefillService.createNotification(
        refillId,
        'email',
        pharmacyEmail,
        response.id
      );

      // Update notification status
      await RefillService.updateNotificationStatus(notificationId, 'sent');

      // Add audit event
      await RefillService.addAuditEvent(refillId, 'Email sent to pharmacy', {
        pharmacyEmail,
        pharmacyName,
        externalId: response.id,
      });

      return {
        success: true,
        messageId: response.id,
        notificationId,
      };
    } catch (error) {
      console.error('[PharmacyEmailService] Error sending email:', error);

      // Create notification record with error
      const notificationId = await RefillService.createNotification(
        refillId,
        'email',
        pharmacyEmail
      );

      await RefillService.updateNotificationStatus(
        notificationId,
        'failed',
        error.message
      );

      await RefillService.addAuditEvent(refillId, 'Email failed', {
        pharmacyEmail,
        error: error.message,
      });

      throw error;
    }
  }

  // Retry sending failed email
  static async retrySendEmail(refillId, pharmacyEmail, maxRetries = 3) {
    const refill = await RefillService.getRefill(refillId);
    if (!refill) throw new Error('Refill not found');

    // Check retry count
    const trail = refill.audit_trail || [];
    const failedAttempts = trail.filter(e => e.event === 'Email failed').length;

    if (failedAttempts >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded for email`);
    }

    // Retry with exponential backoff
    const backoffMs = Math.pow(2, failedAttempts) * 1000;
    await new Promise(resolve => setTimeout(resolve, backoffMs));

    return this.sendRefillRequest({
      refillId,
      pharmacyEmail,
      pharmacyName: refill.pharmacy_name,
      patientName: `${refill.first_name} ${refill.last_name}`,
      patientDOB: refill.date_of_birth,
      medicationName: refill.medication_name,
      dose: refill.dose,
      frequency: refill.frequency,
      refillCount: refill.refills_remaining,
      priority: refill.priority,
      notes: refill.notes,
    });
  }

  static _buildHtmlEmail(textBody, patientName, medicationName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; font-size: 14px; color: #1e40af; margin-bottom: 10px; border-bottom: 2px solid #dbeafe; padding-bottom: 5px; }
    .field { display: flex; margin-bottom: 8px; }
    .field-label { font-weight: bold; width: 150px; }
    .field-value { flex: 1; }
    .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📋 Prescription Refill Request</h1>
    </div>

    <div class="section">
      <div class="section-title">🧑 PATIENT INFORMATION</div>
      <div class="field">
        <div class="field-label">Name:</div>
        <div class="field-value">${patientName}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💊 PRESCRIPTION DETAILS</div>
      <div class="field">
        <div class="field-label">Medication:</div>
        <div class="field-value"><strong>${medicationName}</strong></div>
      </div>
      <div class="field">
        <div class="field-label">Dose:</div>
        <div class="field-value">${textBody.match(/Dose: (.*)/)?.[1] || ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Frequency:</div>
        <div class="field-value">${textBody.match(/Frequency: (.*)/)?.[1] || ''}</div>
      </div>
    </div>

    <div class="footer">
      <p>HIPAA NOTICE: This message contains protected health information intended only for the recipient.</p>
      <p><strong>Do not forward or share this message with unauthorized parties.</strong></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
