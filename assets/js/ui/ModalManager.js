// assets/js/ui/ModalManager.js
console.log('📦 ModalManager.js loading...');

export class ModalManager {
    constructor(appState) {
        this.state = appState;
        this.modals = {
            'feedback': 'feedbackModal',
            'learning': 'learningModal'
        };
        
        this.initializeModalListeners();
    }
    
    initializeModalListeners() {
        // Click outside to close
        document.addEventListener('click', (event) => {
            const feedbackModal = document.getElementById('feedbackModal');
            const learningModal = document.getElementById('learningModal');
            
            if (event.target === feedbackModal) {
                this.hide('feedback');
            }
            if (event.target === learningModal) {
                this.hide('learning');
            }
        });
    }
    
    show(type) {
        const modalId = this.modals[type];
        if (!modalId) {
            console.warn(`Unknown modal type: ${type}`);
            return;
        }
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            this.state.set('keyboardListenerActive', false);
        }
    }
    
    hide(type) {
        const modalId = this.modals[type];
        if (!modalId) {
            console.warn(`Unknown modal type: ${type}`);
            return;
        }
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.state.set('keyboardListenerActive', true);
        }
    }
    
    showDonateInfo() {
        window.open('https://www.paypal.com/donate/?hosted_button_id=RDB6KTNXBLZ7Q', '_blank');
    }
    
    submitFeedback(event, notifier) {
        event.preventDefault();
        notifier.show('✅ Thank you for your feedback!', 'success');
        this.hide('feedback');
        event.target.reset();
    }
}

console.log('✅ ModalManager.js loaded');