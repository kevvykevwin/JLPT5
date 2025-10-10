// assets/js/controllers/NavigationController.js
console.log('📦 NavigationController.js loading...');

export class NavigationController {
    constructor(appState, stateManager, ui, audio) {  // ✅ FIXED: Match app.js parameters
        console.log('✅ NavigationController constructor');
        console.log('🔍 Received audio:', audio);
        
        this.state = appState;           // ✅ Direct access to AppState
        this.stateManager = stateManager; // ✅ For operations like advanceCard()
        this.ui = ui;                    // ✅ Renamed from uiManager
        this.audio = audio;
        
        // Verify audio is defined
        if (!this.audio) {
            console.error('❌ Audio not provided to NavigationController');
        } else {
            console.log('✅ Audio successfully assigned to NavigationController');
        }
    }
    
    flipCard() {
        const mode = this.state.get('currentMode');  // ✅ FIXED: Use this.state directly
        
        if (mode === 'quiz') {
            this.nextCard();
            return;
        }
        
        // Study mode - toggle flip
        this.stateManager.toggleFlip();
        this.ui.renderCurrentCard();  // ✅ FIXED: this.ui not this.uiManager
    }
    
    nextCard() {
        this.stateManager.advanceCard();
        this.ui.renderCurrentCard();
        this.ui.updateAll();
    }
    
    previousCard() {
        this.stateManager.goToPreviousCard();
        this.ui.renderCurrentCard();
        this.ui.updateAll();
    }
    
    shuffleCards() {
        this.stateManager.shuffleDeck();
        this.ui.renderCurrentCard();
        this.ui.showNotification('🔀 Cards shuffled!', 'success');
    }
    
    resetProgress() {
        if (!confirm('Reset all learning progress?')) {
            return;
        }
        
        this.stateManager.resetProgress();
        this.ui.renderCurrentCard();
        this.ui.updateAll();
        this.ui.showNotification('🔄 Progress reset!', 'success');
    }
    
    async playAudio(event) {
        console.log('🔊 playAudio called');
        event?.stopPropagation();
        
        if (!this.audio) {
            console.error('❌ Audio system not available');
            this.ui.showNotification('🔊 Audio system not initialized', 'error');
            return;
        }
        
        const card = this.stateManager.getCurrentCard();
        
        if (!card) {
            console.warn('⚠️ No card available for audio');
            return;
        }
        
        const buttonElement = event?.target.closest('.audio-button, .quiz-audio-button');
        
        try {
            console.log(`🎵 Playing audio for: ${card.japanese}`);
            await this.audio.playAudio(card.japanese, { buttonElement });
            console.log('✅ Audio played successfully');
        } catch (error) {
            console.error('❌ Audio playback failed:', error);
            this.ui.showNotification('🔊 Audio temporarily unavailable', 'error');
        }
    }
}

console.log('✅ NavigationController.js loaded');