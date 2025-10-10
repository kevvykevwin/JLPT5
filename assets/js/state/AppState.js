export class AppState {
    constructor() {
        this.state = {
            // App state
            currentMode: 'study',
            currentQuizMode: 'multiple-choice',
            currentCardIndex: 0,
            isFlipped: false,
            kanaMode: false,
            
            // Deck state
            currentDeck: [],
            activeFilters: new Set(['all']),
            
            // Quiz state
            quizAnswered: false,
            currentQuizOptions: null,
            currentQuestionDirection: null,
            
            // Statistics
            cardsStudied: new Set(),
            flipCount: 0,
            
            // UI state
            keyboardListenerActive: true,
            statsVisible: false
        };
        
        this.listeners = new Map();
    }
    
    get(key) {
        return this.state[key];
    }
    
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notify(key, value, oldValue);
    }
    
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => this.listeners.get(key)?.delete(callback);
    }
    
    notify(key, newValue, oldValue) {
        this.listeners.get(key)?.forEach(callback => {
            callback(newValue, oldValue);
        });
    }
}