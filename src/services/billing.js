// Auto-billing functionality that generates claims when encounters are completed

export async function autoGenerateClaim(encounterId, patientId, providerId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found for auto-billing');
      return null;
    }

    const response = await fetch('/api/billing/claims/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        encounterId,
        patientId,
        providerId,
      }),
    });

    if (response.ok) {
      const claim = await response.json();
      console.log('Auto-generated claim:', claim.claimNumber);
      
      // Show success notification
      if (typeof window !== 'undefined' && window.showBillingNotification) {
        window.showBillingNotification(`Claim ${claim.claimNumber} generated automatically`);
      }
      
      return claim;
    } else {
      const error = await response.json();
      console.error('Auto-billing failed:', error.error);
      return null;
    }
  } catch (error) {
    console.error('Auto-billing error:', error);
    return null;
  }
}

export async function checkInsuranceEligibility(patientId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch('/api/billing/insurance/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId,
        insuranceType: 'primary',
      }),
    });

    if (response.ok) {
      const verification = await response.json();
      return verification;
    }
    return null;
  } catch (error) {
    console.error('Insurance verification error:', error);
    return null;
  }
}

// Function to integrate with encounter saving
export function setupAutoBilling() {
  // This would be called when the app initializes
  // It sets up event listeners for encounter completion
  
  const originalUpdateEncounter = window.updateEncounter;
  if (originalUpdateEncounter) {
    window.updateEncounter = async function(patientId, encounterId, updates) {
      const result = await originalUpdateEncounter.call(this, patientId, encounterId, updates);
      
      // If encounter was just completed and has billing codes, auto-generate claim
      if (updates.status === 'Completed' && updates.cptCodes && updates.cptCodes.length > 0) {
        console.log('Encounter completed, auto-generating claim...');
        autoGenerateClaim(encounterId, patientId, updates.provider || updates.providerId);
      }
      
      return result;
    };
  }
}

// Simple billing notification system
export function createBillingNotifications() {
  if (typeof window === 'undefined') return;

  // Create notification container if it doesn't exist
  let container = document.getElementById('billing-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'billing-notifications';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  window.showBillingNotification = function(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      font-size: 14px;
      font-weight: 500;
      pointer-events: auto;
      animation: slideInRight 0.3s ease;
      max-width: 300px;
    `;
    
    notification.textContent = `💰 ${message}`;
    container.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };

  // Add CSS animations if not already added
  if (!document.getElementById('billing-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'billing-notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
