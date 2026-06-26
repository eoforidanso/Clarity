import { RefillService } from './RefillService.js';

export class SMSService {
  // Mock SMS service - Phase 2C+ will integrate real Twilio
  static async sendPatientRefillReady({
    refillId,
    patientPhone,
    patientName,
    medicationName,
    pharmacyName,
    clinicPhone = '(555) 123-4567',
  }) {
    if (!patientPhone) {
      throw new Error('Patient phone is required');
    }

    // Validate phone format
    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Invalid phone number format');
    }

    // Build SMS message (max 160 chars)
    const shortName = medicationName.split(' ')[0];
    const message = `Hi ${patientName.split(' ')[0]}, your ${shortName} is ready for pickup at ${pharmacyName}. Call ${clinicPhone} if you have questions.`;

    // Ensure message is under 160 chars
    if (message.length > 160) {
      const shortened = `Your ${shortName} is ready at ${pharmacyName}. Call ${clinicPhone} with questions.`;
      return this._sendSMS(refillId, patientPhone, shortened);
    }

    return this._sendSMS(refillId, patientPhone, message);
  }

  static async _sendSMS(refillId, patientPhone, message) {
    try {
      let messageId;

      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
        // Live Twilio send via REST API (no SDK dependency)
        messageId = await this.sendViaTwilio(patientPhone, message);
      } else {
        // Dev/test: log only
        messageId = `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.info(`[SMS:dev] To: ${patientPhone} | ${message}`);
      }

      // Create notification record
      const notificationId = await RefillService.createNotification(
        refillId,
        'sms',
        patientPhone,
        messageId
      );

      // Update status to sent
      await RefillService.updateNotificationStatus(notificationId, 'sent');

      // Add audit event
      await RefillService.addAuditEvent(refillId, 'SMS sent to patient', {
        phoneNumber: this._maskPhone(patientPhone),
        messageId,
      });

      return {
        success: true,
        messageId,
        notificationId,
        message,
      };
    } catch (error) {
      console.error('[SMSService] Error sending SMS:', error);

      // Create failed notification record
      const notificationId = await RefillService.createNotification(
        refillId,
        'sms',
        patientPhone
      );

      await RefillService.updateNotificationStatus(
        notificationId,
        'failed',
        error.message
      );

      await RefillService.addAuditEvent(refillId, 'SMS failed', {
        phoneNumber: this._maskPhone(patientPhone),
        error: error.message,
      });

      throw error;
    }
  }

  // Send via Twilio REST API (no SDK — uses built-in fetch)
  static async sendViaTwilio(phoneNumber, message) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)');
    }

    const body = new URLSearchParams({ To: phoneNumber, From: from, Body: message });
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Twilio ${res.status}: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    console.info(`[SMS] Twilio sent: ${data.sid} → ${this._maskPhone(phoneNumber)}`);
    return data.sid;
  }

  // Retry sending failed SMS
  static async retrySendSMS(refillId, patientPhone, maxRetries = 3) {
    const refill = await RefillService.getRefill(refillId);
    if (!refill) throw new Error('Refill not found');

    // Check retry count
    const trail = refill.audit_trail || [];
    const failedAttempts = trail.filter(e => e.event === 'SMS failed').length;

    if (failedAttempts >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded for SMS`);
    }

    // Retry with exponential backoff
    const backoffMs = Math.pow(2, failedAttempts) * 1000;
    await new Promise(resolve => setTimeout(resolve, backoffMs));

    return this.sendPatientRefillReady({
      refillId,
      patientPhone,
      patientName: `${refill.first_name} ${refill.last_name}`,
      medicationName: refill.medication_name,
      pharmacyName: refill.pharmacy_name,
    });
  }

  static _maskPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return `***-***-${cleaned.slice(-4)}`;
  }
}
