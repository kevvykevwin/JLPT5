// assets/js/ui/StatsUpdater.js
console.log('📦 StatsUpdater.js loading...');

export class StatsUpdater {
    constructor(appState) {
        this.state = appState;
    }
    
    updateAll() {
        this.updateCardCounter();
        this.updateProgressBar();
        this.updateStats();
    }

    updateCardCounter() {
        const cardCounter = document.getElementById('cardCounter');
        const progressBar = document.getElementById('progressBar');
        const currentIndex = this.state.get('currentCardIndex');
        const deckLength = this.state.get('currentDeck')?.length || 0;
        
        if (cardCounter && deckLength > 0) {
            const mode = this.state.get('currentMode');
            const display = mode === 'quiz' ? 'Quiz' : 'Card';
            cardCounter.textContent = `${display} ${currentIndex + 1} of ${deckLength}`;
            console.log(`🔢 Counter updated: ${currentIndex + 1}/${deckLength}`);
        }
        
        if (progressBar && deckLength > 0) {
            const percent = ((currentIndex + 1) / deckLength) * 100;
            progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
        }
    }
    
    updateProgressBar() {
        const index = this.state.get('currentCardIndex');
        const deck = this.state.get('currentDeck');
        const progressBar = document.getElementById('progressBar');
        
        if (progressBar && deck && deck.length > 0) {
            const percent = ((index + 1) / deck.length) * 100;
            progressBar.style.width = `${Math.min(100, percent)}%`;
        }
    }
    
    updateStats() {
        const studied = this.state.get('cardsStudied').size;
        const flipCount = this.state.get('flipCount');
        
        const studiedEl = document.getElementById('cardsStudied');
        const flippedEl = document.getElementById('timesFlipped');
        
        if (studiedEl) studiedEl.textContent = studied;
        if (flippedEl) flippedEl.textContent = flipCount;
    }
    
    toggleStats() {
        const stats = document.getElementById('stats');
        if (stats) {
            stats.classList.toggle('show');
        }
    }
}

console.log('✅ StatsUpdater.js loaded');