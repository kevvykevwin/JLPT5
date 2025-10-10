// Add to assets/js/state/StateManager.js
console.log('📦 StateManager.js loading...');

export class StateManager {
    constructor(appState, storage, spacedRepetition, vocabulary) {
        console.log('✅ StateManager constructor');
        console.log('🔍 Storage received:', storage); 
        console.log('🔍 Vocabulary received:', vocabulary);
        this.state = appState;
        this.storage = storage;      
        this.sr = spacedRepetition;
        this.vocabulary = vocabulary;
    }

    async loadInitialState() {
        const preferences = this.storage.getUserPreferences();
        this.state.update({
            kanaMode: preferences.kanaMode,
            currentQuizMode: preferences.quizMode,
            activeFilters: new Set(preferences.activeFilters || ['all'])
        });
        
        console.log('📋 Initial state loaded:', {
            kanaMode: preferences.kanaMode,
            quizMode: preferences.quizMode
        });
    }

    async loadNewDeck() {
        const filters = Array.from(this.state.get('activeFilters'));
        const newDeck = this.sr.getNextCards(50, filters);
        
        if (newDeck.length === 0) {
            console.warn('⚠️ No cards available, loading all words');
            const allWords = this.vocabulary.getAllWords().slice(0, 50);
            this.state.update({
                currentDeck: this.vocabulary.shuffleArray(allWords),
                currentCardIndex: 0,
                isFlipped: false
            });
        } else {
            this.state.update({
                currentDeck: newDeck,
                currentCardIndex: 0,
                isFlipped: false
            });
        }
        
        console.log(`🎴 Loaded deck with ${this.state.get('currentDeck').length} cards`);
    }

    getCurrentCard() {
        const deck = this.state.get('currentDeck');
        const index = this.state.get('currentCardIndex');
        
        if (!deck || deck.length === 0) {
            console.error('❌ No deck available');
            return null;
        }
        
        const safeIndex = Math.max(0, Math.min(index, deck.length - 1));
        return deck[safeIndex];
    }

    advanceCard(onAdvance) {
        const currentIndex = this.state.get('currentCardIndex');
        const deck = this.state.get('currentDeck');
        
        if (currentIndex < deck.length - 1) {
            this.state.set('currentCardIndex', currentIndex + 1);
            this.state.set('isFlipped', false);
            console.log(`➡️ Advanced to card ${currentIndex + 2}`);
            if (onAdvance) onAdvance();
        } else {
            console.log('📦 End of deck reached, loading new deck...');
            this.loadNewDeck();
            if (onAdvance) onAdvance();
        }
    }

    goToPreviousCard() {
        const currentIndex = this.state.get('currentCardIndex');
        if (currentIndex > 0) {
            this.state.set('currentCardIndex', currentIndex - 1);
            this.state.set('isFlipped', false);
            console.log(`⬅️ Moved to card ${currentIndex}`);
        }
    }

    toggleFlip() {
        const isFlipped = this.state.get('isFlipped');
        this.state.set('isFlipped', !isFlipped);
        
        if (!isFlipped) {
            // Track flip
            const flipCount = this.state.get('flipCount') || 0;
            this.state.set('flipCount', flipCount + 1);
            
            // Mark card as studied
            const card = this.getCurrentCard();
            if (card) {
                const studied = this.state.get('cardsStudied');
                studied.add(card.japanese);
            }
        }
        
        return !isFlipped;
    }

    setMode(mode) {
        const oldMode = this.state.get('currentMode');
        this.state.set('currentMode', mode);
        console.log(`🔀 Mode changed: ${oldMode} → ${mode}`);
    }

    applyFilters(filters) {
        this.state.set('activeFilters', new Set(filters));
        this.loadNewDeck();
        console.log('🔍 Filters applied:', filters);
    }

    resetProgress() {
        if (this.sr?.resetAllProgress) {
            this.sr.resetAllProgress();
        }
        
        this.state.update({
            currentCardIndex: 0,
            cardsStudied: new Set(),
            flipCount: 0,
            isFlipped: false
        });
        
        this.loadNewDeck();
        console.log('🔄 Progress reset');
    }

    shuffleDeck() {
        const deck = this.state.get('currentDeck');
        const shuffled = this.vocabulary.shuffleArray([...deck]);
        this.state.update({
            currentDeck: shuffled,
            currentCardIndex: 0,
            isFlipped: false
        });
        console.log('🔀 Deck shuffled');
    }
    switchLevel(level) {
    console.log(`🔄 Switching level to ${level}`);
    
    // Reinitialize spaced repetition with new vocabulary
    this.sr.initialize();
    
    // Clear current progress
    this.state.update({
        currentCardIndex: 0,
        cardsStudied: new Set(),
        isFlipped: false
    });
    
    // Load new deck
    this.loadNewDeck();
    
    console.log(`✅ Level switched to ${level}`);
    }
}