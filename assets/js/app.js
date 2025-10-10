// assets/js/app.js

import { VocabularyManager } from './core/vocabulary.js';
import { StorageManager } from './core/storage.js';
import { SpacedRepetitionManager } from './core/spacedRepetition.js';
import { AudioSystem } from './features/audioSystem.js';
import { ParticleQuiz } from './features/particleQuiz.js';
import { AppState } from './state/AppState.js';
import { StateManager } from './state/StateManager.js';
import { UIManager } from './ui/UIManager.js';
import { NavigationController } from './controllers/NavigationController.js';
import { KeyboardController } from './controllers/KeyboardController.js';

class JLPTApp {
    constructor() {
        // Core systems
        this.vocabulary = new VocabularyManager();
        this.storage = new StorageManager();
        this.spacedRepetition = new SpacedRepetitionManager(this.storage, this.vocabulary);
        this.audio = new AudioSystem();
        
        // ✅ FIXED: Pass current JLPT level to particle quiz
        const currentLevel = this.vocabulary.getCurrentLevelInfo().level;
        this.particleQuiz = new ParticleQuiz(currentLevel);
        
        // State management
        this.appState = new AppState();
        this.stateManager = new StateManager(this.appState, this.storage, this.spacedRepetition, this.vocabulary);
        
        // UI management
        this.ui = new UIManager(
            this.appState, 
            this.stateManager, 
            this.audio, 
            this.vocabulary,
            this.particleQuiz
        );
        
        // Controllers
        this.navigationController = new NavigationController(this.appState, this.stateManager, this.ui, this.audio);
        this.keyboardController = new KeyboardController(this.appState, this.navigationController);
        
        // 🆕 Initialize audio click tracking
        this._lastAudioClick = 0;
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize spaced repetition
            await this.spacedRepetition.initialize();
            
            // Load initial state (preferences)
            await this.stateManager.loadInitialState();
            
            // Load initial deck
            await this.stateManager.loadNewDeck();
            
            // Initialize UI
            this.ui.renderCurrentCard();
            this.ui.updateAll();
            
            // Setup global functions (for HTML onclick handlers)
            this.setupGlobalFunctions();
            
        } catch (error) {
            console.error('JLPT App initialization failed:', error);
            this.ui.showNotification('Initialization error - some features may not work', 'error');
        }
    }
    
    // ========================================
    // GLOBAL FUNCTION BINDINGS
    // ========================================
    
    setupGlobalFunctions() {
        // Navigation
        window.flipCard = () => this.navigationController.flipCard();
        window.nextCard = () => this.navigationController.nextCard();
        window.previousCard = () => this.navigationController.previousCard();
        window.shuffleCards = () => this.navigationController.shuffleCards();
        window.resetProgress = () => this.navigationController.resetProgress();
        
        // 🆕 Audio - Event delegation (no global window.playAudio)
        document.addEventListener('click', (e) => {
            const audioBtn = e.target.closest('.audio-button, .quiz-audio-button');
            if (audioBtn) {
                this.playAudio(e);
            }
        });
        
        // UI controls
        window.toggleStats = () => this.ui.toggleStats();
        window.toggleKana = () => {
            const input = document.getElementById('kanaToggleInput');
            if (input) {
                input.checked = !input.checked;
                this.ui.handleKanaToggle(input.checked);
            }
        };
        
        // Modals
        window.showFeedbackForm = () => this.ui.showModal('feedback');
        window.hideFeedbackForm = () => this.ui.hideModal('feedback');
        window.showLearningInfo = () => this.ui.showModal('learning');
        window.hideLearningInfo = () => this.ui.hideModal('learning');
        window.showDonateInfo = () => this.ui.showDonateInfo();
        window.submitFeedback = (e) => this.ui.submitFeedback(e);
    }
    
    // ========================================
    // AUDIO HANDLER
    // ========================================
    
    async playAudio(event) {
        // 🆕 PREVENT DEFAULT AND STOP PROPAGATION
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // 🆕 DEDUPLICATE RAPID CLICKS (500ms window)
        const now = Date.now();
        if (this._lastAudioClick && (now - this._lastAudioClick) < 500) {
            console.log('🔊 Ignoring duplicate click (too fast)');
            return;
        }
        this._lastAudioClick = now;
        
        // Get current card
        const card = this.stateManager.getCurrentCard();
        if (!card) return;
        
        const buttonElement = event.target.closest('.audio-button, .quiz-audio-button');
        
        try {
            await this.audio.playAudio(card.japanese, { buttonElement });
            console.log('🔊 Audio playback initiated for:', card.japanese);
        } catch (error) {
            console.error('Audio playback failed:', error);
            this.ui.showNotification('🔊 Audio temporarily unavailable', 'error');
        }
    }
}

// ========================================
// INITIALIZE APP
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    window.jlptApp = new JLPTApp();
});