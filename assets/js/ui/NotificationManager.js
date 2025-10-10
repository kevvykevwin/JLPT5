// assets/js/ui/NotificationManager.js
console.log('📦 NotificationManager.js loading...');

export class NotificationManager {
    constructor() {
        this.colors = {
            error: '#f44336',
            success: '#4caf50',
            info: '#388e3c'
        };
    }
    
    show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background: ${this.colors[type]};
            color: white; padding: 15px 20px; 
            border-radius: 10px;
            box-shadow: 0 4px 15px ${this.colors[type]}33; 
            z-index: 1001;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 3000);
    }
}

console.log('✅ NotificationManager.js loaded');