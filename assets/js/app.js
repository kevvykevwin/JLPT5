// assets/js/app.js - Phase 1: Migration Safety Implementation

import { VocabularyManager } from './core/vocabulary.js';
import { StorageManager } from './core/storage.js';
import { SpacedRepetitionManager } from './core/spacedRepetition.js';
import { AudioSystem } from './features/audioSystem.js';

// ===== PHASE 1: MIGRATION SAFETY SYSTEM =====
window.APP_DEBUG = true;

// Capture actual current state for comparison
const BACKUP_STATE = {
    get currentMode() { return window.jlptApp?.currentMode || null; },
    get currentCardIndex() { return window.jlptApp?.currentCardIndex || 0; },
    get currentDeck() { return window.jlptApp?.currentDeck || []; },
    get activeFilters() { return window.jlptApp?.activeFilters || new Set(['all']); },
    get kanaMode() { return window.jlptApp?.kanaMode || false; },
    get isFlipped() { return window.jlptApp?.isFlipped || false; },
    get quizAnswered() { return window.jlptApp?.quizAnswered || false; }
};

function logMigrationPoint(point, data = null) {
    if (window.APP_DEBUG) {
        console.log(`✅ Migration: ${point}`, data ? { 
            currentState: {
                mode: BACKUP_STATE.currentMode,
                cardIndex: BACKUP_STATE.currentCardIndex,
                deckLength: BACKUP_STATE.currentDeck.length,
                filters: Array.from(BACKUP_STATE.activeFilters),
                kanaMode: BACKUP_STATE.kanaMode
            },
            additionalData: data
        } : {
            currentState: {
                mode: BACKUP_STATE.currentMode,
                cardIndex: BACKUP_STATE.currentCardIndex,
                deckLength: BACKUP_STATE.currentDeck.length
            }
        });
    }
}

// Migration checkpoint function
function migrationCheckpoint(stepName) {
    if (!window.APP_DEBUG) return true;
    
    console.group(`🔍 Checkpoint: ${stepName}`);
    
    const tests = [
        () => window.jlptApp instanceof JLPTApp,
        () => typeof window.jlptApp.flipCard === 'function',
        () => window.jlptApp.currentDeck.length > 0,
        () => document.getElementById('japaneseWord')?.textContent !== '',
        () => window.jlptApp.vocabulary?.getAllWords().length > 0
    ];
    
    const passed = tests.every((test, index) => {
        try {
            const result = test();
            console.log(`Test ${index + 1}: ${result ? '✅' : '❌'}`);
            return result;
        } catch (e) {
            console.error(`Test ${index + 1} failed:`, e);
            return false;
        }
    });
    
    if (passed) {
        console.log('✅ All tests passed');
    } else {
        console.error('❌ Tests failed - System unstable');
    }
    
    console.groupEnd();
    return passed;
}

// ===== LEGACY BRIDGE SYSTEM =====
class LegacyBridge {
    constructor() {
        this.events = {};
        this.originalFunctions = {};
        
        logMigrationPoint('Legacy bridge initialized');
    }
    
    // Event system for future modular communication
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        logMigrationPoint(`Bridge event emitted: ${event}`);
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    
    // State comparison for validation
    captureState() {
        return {
            currentMode: window.jlptApp?.currentMode,
            currentCardIndex: window.jlptApp?.currentCardIndex,
            deckLength: window.jlptApp?.currentDeck?.length || 0,
            kanaMode: window.jlptApp?.kanaMode,
            isFlipped: window.jlptApp?.isFlipped,
            quizAnswered: window.jlptApp?.quizAnswered
        };
    }
    
    validateState(beforeState, afterState, operation) {
        const differences = [];
        
        // Check expected changes for each operation
        switch (operation) {
            case 'flipCard':
                if (beforeState.isFlipped === afterState.isFlipped && window.jlptApp.currentMode === 'study') {
                    differences.push('Card flip state should have changed');
                }
                break;
            case 'nextCard':
                if (beforeState.currentCardIndex === afterState.currentCardIndex && beforeState.deckLength > 1) {
                    differences.push('Card index should have changed');
                }
                break;
        }
        
        if (differences.length === 0) {
            logMigrationPoint(`✅ State validation passed for ${operation}`);
            return true;
        } else {
            logMigrationPoint(`❌ State validation failed for ${operation}:`, differences);
            return false;
        }
    }
}

// Initialize bridge
window.legacyBridge = new LegacyBridge();

// ===== MAIN APPLICATION CLASS =====
class JLPTApp {
    constructor() {
        logMigrationPoint('App construction started');
        
        // Core systems
        this.vocabulary = new VocabularyManager();
        this.storage = new StorageManager();
        this.spacedRepetition = new SpacedRepetitionManager(this.storage, this.vocabulary);
        this.audio = new AudioSystem();

        // App state
        this.currentMode = 'study';
        this.currentQuizMode = 'multiple-choice';
        this.currentCardIndex = 0;
        this.isFlipped = false;
        this.kanaMode = false;
        
        // FIXED: Add question direction tracking
        this.currentQuestionDirection = null; // 'jp-to-en' or 'en-to-jp'
        
        // Deck and navigation
        this.currentDeck = [];
        this.cardsStudied = new Set();
        this.flipCount = 0;
        this.activeFilters = new Set(['all']);
        
        // Quiz state and randomization
        this.quizAnswered = false;
        this.autoAdvanceTimer = null;
        this.speedChallengeTimer = null;
        this.speedChallengeInterval = null;
        this.quizModeForSession = null;
        this.currentBatchIndex = 0;
        this.batchSize = 10;
        
        // UI state
        this.keyboardListenerActive = true;
        this.engagementCount = 0;
        this.retentionPromptShown = false;
        
        // Statistics
        this.categoryStats = this.storage.loadCategoryStats();
        
        logMigrationPoint('App construction completed');
        
        this.initializationComplete = this.initialize();
    }

    async initialize() {
        logMigrationPoint('Initialization started');
        console.log('🚀 Initializing JLPT N5 Learning System...');
        
        try {
            await this.initializeSpacedRepetition();

                        // Load initial deck with spaced repetition
            this.currentDeck = this.spacedRepetition.getNextCards(50, Array.from(this.activeFilters));
            if (this.currentDeck.length === 0) {
                console.warn('No spaced repetition cards available, falling back to shuffled deck');
                this.currentDeck = this.vocabulary.shuffleArray(this.vocabulary.getAllWords().slice(0, 50));
            }

            migrationCheckpoint('Spaced repetition initialized');
            
            this.loadUserPreferences();
            migrationCheckpoint('User preferences loaded');
            
            this.initializeUI();
            migrationCheckpoint('UI initialized');
            
            this.setupEventListeners();
            migrationCheckpoint('Event listeners setup');
            
            this.initializeKanaToggle();
            migrationCheckpoint('Kana toggle initialized');
            
            this.updateCard();
            this.updateStats();
            
            logMigrationPoint('Full initialization completed successfully');
            console.log(`✅ System Ready! ${this.vocabulary.getAllWords().length} words loaded`);
            console.log(`📊 Spaced repetition active: ${this.spacedRepetition.isInitialized}`);
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            logMigrationPoint(`Initialization failed: ${error.message}`);
            this.showNotification('Initialization error - some features may not work', 'error');
            
            // Fallback to basic functionality
            this.currentDeck = this.vocabulary.shuffleArray(this.vocabulary.getAllWords().slice(0, 50));
            this.updateCard();
        }
    }

    async initializeSpacedRepetition() {
        try {
            await this.spacedRepetition.initialize();
            console.log('✅ Spaced repetition system initialized');
        } catch (error) {
            console.error('⚠️ Spaced repetition initialization failed:', error);
        }
    }

    loadUserPreferences() {
        this.kanaMode = this.storage.getUserPreference('kanaMode', false);
        this.currentQuizMode = this.storage.getUserPreference('quizMode', 'multiple-choice');
        
        console.log(`🔧 Loaded preferences - Kana: ${this.kanaMode}`);
    }

    initializeUI() {
        this.updateWordCountBadges();
        this.initializeTabs();
        this.initializeQuizModes();
        this.initializeFilters();
    }

    initializeTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Update UI
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                document.getElementById(tabId + 'Tab')?.classList.add('active');
                
                // Update state
                this.currentMode = tabId;
                this.resetEngagementTracking();
                
                // Reset quiz mode lock when switching tabs
                if (tabId === 'quiz') {
                    this.resetQuizModeForNewBatch();
                }
                
                // Update flip button
                const flipBtn = document.getElementById('flipBtn');
                if (flipBtn) {
                    flipBtn.textContent = tabId === 'study' ? 'Flip Card' : 'Next Quiz';
                }
                
                this.updateKanaToggleDisplay();
                this.updateCard();
                
                logMigrationPoint(`Tab switched to: ${tabId}`);
            });
        });
    }

    initializeQuizModes() {
        document.querySelectorAll('.quiz-mode-btn').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                
                // Check if we're in the middle of a batch
                if (this.quizModeForSession && this.currentBatchIndex % this.batchSize !== 0) {
                    this.showNotification(
                        `Quiz mode locked for current batch (${this.batchSize - (this.currentBatchIndex % this.batchSize)} cards remaining)`,
                        'info'
                    );
                    return;
                }
                
                this.clearAllTimers();
                
                document.querySelectorAll('.quiz-mode-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                this.currentQuizMode = mode;
                this.quizModeForSession = mode;
                this.storage.setUserPreference('quizMode', mode);
                
                if (this.currentMode === 'quiz') {
                    this.updateCard();
                }
                
                logMigrationPoint(`Quiz mode set to: ${mode} (locked for batch)`);
            });
        });
    }

    resetQuizModeForNewBatch() {
        this.quizModeForSession = null;
        this.currentBatchIndex = 0;
        logMigrationPoint('Quiz mode lock reset for new batch');
    }

    initializeFilters() {
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const dropdownMenu = document.getElementById('dropdownMenu');

        hamburgerMenu?.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerMenu.classList.toggle('active');
            dropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownMenu?.contains(e.target) && !hamburgerMenu?.contains(e.target)) {
                hamburgerMenu?.classList.remove('active');
                dropdownMenu?.classList.remove('active');
            }
        });

        document.querySelectorAll('.filter-option').forEach(option => {
            const checkbox = option.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            
            option.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    e.preventDefault();
                    checkbox.checked = !checkbox.checked;
                    this.handleFilterChange({ target: checkbox });
                }
            });
            
            checkbox.addEventListener('change', (e) => this.handleFilterChange(e));
        });
    }

    // FIXED: Kana Toggle with proper positioning
    initializeKanaToggle() {
        console.log('🔧 Initializing kana toggle...');
        
        this.kanaMode = this.storage.getUserPreference('kanaMode', false);
        
        const kanaToggleInput = document.getElementById('kanaToggleInput');
        const kanaToggleContainer = document.getElementById('kanaToggleContainer');
        const kanaToggleLabel = document.getElementById('kanaToggleLabel');
        
        const elements = {
            input: kanaToggleInput,
            container: kanaToggleContainer,
            label: kanaToggleLabel
        };
        
        const missingElements = Object.entries(elements)
            .filter(([name, element]) => !element)
            .map(([name]) => name);
            
        if (missingElements.length > 0) {
            console.error(`❌ Kana toggle elements missing: ${missingElements.join(', ')}`);
            return;
        }
        
        kanaToggleInput.checked = this.kanaMode;
        this.updateKanaToggleDisplay();
        
        kanaToggleInput.addEventListener('change', (e) => {
            const previousState = this.kanaMode;
            this.kanaMode = e.target.checked;
            
            logMigrationPoint(`Kana toggle: ${previousState} → ${this.kanaMode}`);
            
            this.storage.setUserPreference('kanaMode', this.kanaMode);
            this.updateKanaToggleDisplay();
            
            if (this.currentMode === 'quiz' && !this.quizAnswered) {
                console.log('🔄 Updating quiz options for kana mode...');
                this.updateQuizAnswerOptions();
            }
        });
        
        kanaToggleContainer.addEventListener('click', (e) => {
            if (e.target !== kanaToggleInput && e.target !== kanaToggleLabel) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleKanaState();
            }
        });
        
        kanaToggleLabel.addEventListener('click', (e) => {
            console.log('🖱️ Label clicked, checkbox will be triggered automatically');
        });
        
        console.log(`✅ Kana toggle initialized. State: ${this.kanaMode}`);
    }

    toggleKanaState() {
        const kanaToggleInput = document.getElementById('kanaToggleInput');
        if (kanaToggleInput) {
            logMigrationPoint(`Manual kana toggle: ${kanaToggleInput.checked} → ${!kanaToggleInput.checked}`);
            kanaToggleInput.checked = !kanaToggleInput.checked;
            kanaToggleInput.dispatchEvent(new Event('change'));
        }
    }

    // FIXED: Updated display function for new positioning
    updateKanaToggleDisplay() {
        const toggle = document.getElementById('kanaToggleInput');
        const label = document.getElementById('kanaToggleLabel');
        const container = document.getElementById('kanaToggleContainer');
        
        if (toggle) {
            toggle.checked = this.kanaMode;
        }
        
        if (label) {
            label.textContent = 'Show: Kana';
        }
        
        if (container) {
            if (this.currentMode === 'quiz') {
                container.classList.remove('hidden');
                container.classList.add('visible');
                logMigrationPoint('Kana toggle now visible in quiz mode');
            } else {
                container.classList.add('hidden');
                container.classList.remove('visible');
                logMigrationPoint('Kana toggle hidden in study mode');
            }
        }
    }

    // FIXED: Update quiz options based on current direction
    updateQuizAnswerOptions() {
        if (this.currentMode !== 'quiz' || this.quizAnswered) return;
        
        const currentCard = this.safeGetCard(this.currentCardIndex);
        if (!currentCard) return;
        
        const quizOptions = document.getElementById('quizOptions');
        if (quizOptions) {
            logMigrationPoint(`Regenerating options for ${this.currentQuestionDirection} with kana mode: ${this.kanaMode}`);
            quizOptions.innerHTML = '';
            this.generateQuizOptions(currentCard, quizOptions);
        }
    }

    // ENHANCED: Global function bindings with bridge tracking
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Modal click handlers
        document.addEventListener('click', (event) => {
            const feedbackModal = document.getElementById('feedbackModal');
            const learningModal = document.getElementById('learningModal');
            
            if (event.target === feedbackModal) {
                this.hideFeedbackForm();
            }
            if (event.target === learningModal) {
                this.hideLearningInfo();
            }
        });
        
        // ENHANCED: Global function bindings with bridge tracking
        window.showFeedbackForm = () => {
            logMigrationPoint('showFeedbackForm called');
            return this.showFeedbackForm();
        };
        
        window.hideFeedbackForm = () => {
            logMigrationPoint('hideFeedbackForm called');
            return this.hideFeedbackForm();
        };
        
        window.showLearningInfo = () => {
            logMigrationPoint('showLearningInfo called');
            return this.showLearningInfo();
        };
        
        window.hideLearningInfo = () => {
            logMigrationPoint('hideLearningInfo called');
            return this.hideLearningInfo();
        };
        
        window.showDonateInfo = () => {
            logMigrationPoint('showDonateInfo called');
            return this.showDonateInfo();
        };
        
        window.submitFeedback = (e) => {
            logMigrationPoint('submitFeedback called');
            return this.submitFeedback(e);
        };
        
        window.playAudio = (e) => {
            logMigrationPoint('Global playAudio called');
            return this.playAudio(e);
        };
        
        window.flipCard = () => {
            const beforeState = window.legacyBridge.captureState();
            logMigrationPoint('Global flipCard called');
            
            const result = this.flipCard();
            
            const afterState = window.legacyBridge.captureState();
            window.legacyBridge.validateState(beforeState, afterState, 'flipCard');
            
            return result;
        };
        
        window.nextCard = () => {
            const beforeState = window.legacyBridge.captureState();
            logMigrationPoint('Global nextCard called');
            
            const result = this.nextCard();
            
            const afterState = window.legacyBridge.captureState();
            window.legacyBridge.validateState(beforeState, afterState, 'nextCard');
            
            return result;
        };
        
        window.previousCard = () => {
            logMigrationPoint('Global previousCard called');
            return this.previousCard();
        };
        
        window.shuffleCards = () => {
            logMigrationPoint('Global shuffleCards called');
            return this.shuffleCards();
        };
        
        window.resetProgress = () => {
            logMigrationPoint('Global resetProgress called');
            return this.resetProgress();
        };
        
        window.toggleStats = () => {
            logMigrationPoint('Global toggleStats called');
            return this.toggleStats();
        };
        
        window.toggleKana = () => {
            logMigrationPoint('Global toggleKana called');
            return this.toggleKanaState();
        };
        
        logMigrationPoint('All global event listeners and functions bound');
    }

    // Card Management
    safeGetCard(index) {
        if (!this.currentDeck?.length) {
            this.currentDeck = this.spacedRepetition?.getNextCards?.(50, Array.from(this.activeFilters)) || 
                             this.vocabulary.shuffleArray(this.vocabulary.getAllWords().slice(0, 50));
        }
        
        const safeIndex = Math.max(0, Math.min(index, this.currentDeck.length - 1));
        if (safeIndex !== index) {
            this.currentCardIndex = safeIndex;
        }
        
        return this.currentDeck[safeIndex];
    }

    updateCard() {
        migrationCheckpoint('updateCard-start');
        
        const card = this.safeGetCard(this.currentCardIndex);
        if (!card) {
            logMigrationPoint('updateCard: No card available, exiting');
            return;
        }

        logMigrationPoint(`updateCard: Processing card ${card.japanese} (${card.meaning})`);

        if (this.currentMode === 'quiz') {
            this.updateQuiz(card);
            migrationCheckpoint('updateCard-quiz-complete');
        } else {
            this.updateStudyCard(card);
            migrationCheckpoint('updateCard-study-complete');
        }
        
        this.updateCardCounter();
        this.cardsStudied.add(this.currentCardIndex);
        this.categoryStats[card.type].studied.add(card.japanese);
        this.trackEngagement();
        
        migrationCheckpoint('updateCard-end');
    }

    updateStudyCard(card) {
        const elements = {
            promptText: document.getElementById('promptText'),
            japaneseWord: document.getElementById('japaneseWord'),
            reading: document.getElementById('reading'),
            meaning: document.getElementById('meaning'),
            flashcard: document.getElementById('flashcard')
        };

        elements.promptText.textContent = '';
        elements.meaning.style.display = 'none';
        this.isFlipped = false;
        elements.flashcard.classList.remove('flipped');

        elements.japaneseWord.textContent = card.japanese;
        elements.reading.textContent = card.reading;
        elements.meaning.textContent = card.meaning;

        this.updateLearningStateIndicator(card);
    }

    // ENHANCED: Quiz update with mode locking
    updateQuiz(card) {
        if (!card) return;

        logMigrationPoint(`updateQuiz: Starting quiz for ${card.japanese}, mode: ${this.currentQuizMode || this.quizModeForSession}`);

        // Lock quiz mode for the session if not already set
        if (!this.quizModeForSession) {
            this.quizModeForSession = this.currentQuizMode;
            logMigrationPoint(`Quiz mode locked to: ${this.quizModeForSession}`);
        }

        this.clearAutoAdvanceTimer();
        
        const quizQuestion = document.getElementById('quizQuestion');
        const quizOptions = document.getElementById('quizOptions');
        const quizFeedback = document.getElementById('quizFeedback');
        const quizAudioSection = document.getElementById('quizAudioSection');
        
        if (!quizQuestion || !quizOptions || !quizFeedback) {
            logMigrationPoint('updateQuiz: Critical DOM elements missing');
            return;
        }
        
        migrationCheckpoint('updateQuiz-dom-ready');
        
        // Complete state reset
        quizFeedback.textContent = '';
        quizFeedback.className = 'quiz-feedback';
        this.quizAnswered = false;
        
        // Clear existing options
        const existingOptions = quizOptions.querySelectorAll('.quiz-option');
        existingOptions.forEach(option => {
            option.classList.remove('correct', 'incorrect', 'disabled');
            option.style.pointerEvents = 'auto';
            option.style.opacity = '1';
        });
        
        this.clearAllTimers();
        
        // Use locked mode instead of current mode
        const modeToUse = this.quizModeForSession || this.currentQuizMode;
        this.renderQuizMode(card, quizQuestion, quizAudioSection, modeToUse);
        migrationCheckpoint('updateQuiz-render-complete');
        
        this.generateQuizOptions(card, quizOptions);
        migrationCheckpoint('updateQuiz-options-complete');
        
        logMigrationPoint(`Quiz updated with locked mode: ${modeToUse}, direction: ${this.currentQuestionDirection}`);
    }

    // FIXED: Track question direction for Mixed Challenge
    renderQuizMode(card, quizQuestion, quizAudioSection, mode = null) {
        const questionText = card.japanese;
        const activeMode = mode || this.quizModeForSession || this.currentQuizMode;
        
        switch (activeMode) {
            case 'listening-first':
                quizQuestion.className = 'japanese-word quiz-question listening-mode';
                quizQuestion.textContent = '🔊 Listen carefully and choose the meaning';
                if (quizAudioSection) quizAudioSection.style.display = 'flex';
                this.currentQuestionDirection = 'jp-to-en';
                break;
                
            case 'speed-challenge':
                quizQuestion.className = 'japanese-word quiz-question';
                quizQuestion.innerHTML = `
                    <div style="font-size: 56px; margin-bottom: 20px; font-weight: 900;">${questionText}</div>
                    <div style="font-size: 14px; color: #ff6b6b; font-weight: 600; text-transform: uppercase;">⚡ SPEED ROUND - 8 SECONDS! ⚡</div>
                `;
                if (quizAudioSection) quizAudioSection.style.display = 'none';
                this.currentQuestionDirection = 'jp-to-en';
                this.startSpeedTimer(card);
                break;
                
            case 'kanji-only':
                quizQuestion.className = 'japanese-word quiz-question';
                quizQuestion.innerHTML = `
                    <div style="font-size: 72px; margin-bottom: 25px; font-weight: 900; line-height: 0.9;">${questionText}</div>
                    <div style="font-size: 16px; color: #666; font-style: italic;">Recognize this kanji and choose its meaning</div>
                `;
                if (quizAudioSection) quizAudioSection.style.display = 'none';
                this.currentQuestionDirection = 'jp-to-en';
                break;
                
            case 'mixed-challenge':
                const rand = Math.random();
                if (rand < 0.5) {
                    // Japanese to English
                    quizQuestion.innerHTML = `
                        <div style="font-size: 36px; margin-bottom: 15px;">${questionText}</div>
                        <div style="font-size: 16px; color: #666; font-weight: normal;">What does this mean?</div>
                    `;
                    this.currentQuestionDirection = 'jp-to-en';
                } else {
                    // English to Japanese
                    quizQuestion.innerHTML = `
                        <div style="font-size: 24px; color: #2e7d32; margin-bottom: 15px;">"${card.meaning}"</div>
                        <div style="font-size: 16px; color: #666; font-weight: normal;">What is this in Japanese?</div>
                    `;
                    this.currentQuestionDirection = 'en-to-jp';
                }
                if (quizAudioSection) quizAudioSection.style.display = 'none';
                break;
                
            default:
                // Standard multiple choice - Japanese to English
                quizQuestion.className = 'japanese-word quiz-question';
                quizQuestion.innerHTML = `
                    <div style="font-size: 40px; margin-bottom: 10px; font-weight: bold;">${questionText}</div>
                    <div style="font-size: 16px; color: #666; font-weight: normal;">${card.reading}</div>
                `;
                if (quizAudioSection) quizAudioSection.style.display = 'none';
                this.currentQuestionDirection = 'jp-to-en';
        }
    }

    // FIXED: Generate options based on question direction
    generateQuizOptions(correctCard, container) {
        if (!correctCard || !container) return;
        
        logMigrationPoint(`Generating options for: ${correctCard.japanese}, direction: ${this.currentQuestionDirection}, kana mode: ${this.kanaMode}`);
        
        const options = this.generateRandomizedOptions(correctCard, 4);
        
        container.innerHTML = '';
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.setAttribute('data-option-index', index);
            
            // FIXED: Show correct content based on question direction
            if (this.currentQuestionDirection === 'en-to-jp') {
                // English to Japanese: Show Japanese characters as answers
                const japaneseDiv = document.createElement('div');
                japaneseDiv.style.cssText = `font-size: 20px; margin-bottom: ${this.kanaMode ? '8px' : '0'}; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif; font-weight: 600;`;
                japaneseDiv.textContent = option.japanese;
                button.appendChild(japaneseDiv);
                
                // Show reading when kana toggle is ON
                if (this.kanaMode) {
                    const readingDiv = document.createElement('div');
                    readingDiv.className = 'quiz-option-reading';
                    readingDiv.style.cssText = 'font-size: 14px; color: #666; font-style: italic;';
                    readingDiv.textContent = option.reading;
                    button.appendChild(readingDiv);
                }
            } else {
                // Japanese to English: Show English meanings as answers
                const meaningDiv = document.createElement('div');
                meaningDiv.style.cssText = `font-size: 16px; margin-bottom: ${this.kanaMode && this.currentQuizMode !== 'kanji-only' ? '5px' : '0'}; font-weight: 500;`;
                meaningDiv.textContent = option.meaning;
                button.appendChild(meaningDiv);
                
                // Show reading when kana toggle is ON (except for kanji-only mode)
                if (this.kanaMode && this.currentQuizMode !== 'kanji-only') {
                    const readingDiv = document.createElement('div');
                    readingDiv.className = 'quiz-option-reading';
                    readingDiv.style.cssText = 'font-size: 14px; color: #666; font-style: italic;';
                    readingDiv.textContent = option.reading;
                    button.appendChild(readingDiv);
                }
            }
            
            button.onclick = () => this.selectQuizAnswer(button, option, correctCard);
            container.appendChild(button);
        });
        
        logMigrationPoint(`Generated ${options.length} options for ${this.currentQuestionDirection} with kana display: ${this.kanaMode ? 'ON' : 'OFF'}`);
    }

    // Enhanced randomized option generation
    generateRandomizedOptions(correctCard, count = 4) {
        const allOptions = [correctCard];
        const otherCards = this.vocabulary.getAllWords().filter(card => 
            card.japanese !== correctCard.japanese
        );
        
        if (otherCards.length === 0) return [correctCard];
        
        // Smart distractor selection
        const sameTypeCards = otherCards.filter(card => card.type === correctCard.type);
        const diffTypeCards = otherCards.filter(card => card.type !== correctCard.type);
        
        let distractors = [];
        
        // Add similar type cards (60% chance)
        if (sameTypeCards.length > 0 && Math.random() < 0.6) {
            const shuffledSameType = this.vocabulary.shuffleArray(sameTypeCards);
            distractors.push(...shuffledSameType.slice(0, Math.min(2, shuffledSameType.length)));
        }
        
        // Add cards with similar length (30% chance)
        if (distractors.length < count - 1 && Math.random() < 0.3) {
            const similarLength = otherCards.filter(card => 
                Math.abs(card.japanese.length - correctCard.japanese.length) <= 1 &&
                !distractors.some(d => d.japanese === card.japanese)
            );
            if (similarLength.length > 0) {
                const shuffled = this.vocabulary.shuffleArray(similarLength);
                distractors.push(shuffled[0]);
            }
        }
        
        // Fill remaining with random cards
        while (distractors.length < count - 1 && distractors.length < otherCards.length) {
            const available = otherCards.filter(card => 
                !distractors.some(d => d.japanese === card.japanese)
            );
            if (available.length === 0) break;
            
            const randomCard = available[Math.floor(Math.random() * available.length)];
            distractors.push(randomCard);
        }
        
        allOptions.push(...distractors);
        
        return this.vocabulary.shuffleArray(allOptions);
    }

    startSpeedTimer(card) {
        let timeLeft = 8;
        const timerElement = document.createElement('div');
        timerElement.className = 'speed-timer';
        timerElement.textContent = '8s';
        
        const quizContainer = document.getElementById('quizContainer');
        if (quizContainer) {
            quizContainer.appendChild(timerElement);
        }
        
        this.speedChallengeInterval = setInterval(() => {
            timeLeft--;
            if (document.body.contains(timerElement)) {
                timerElement.textContent = timeLeft + 's';
                if (timeLeft <= 3) {
                    timerElement.classList.add('warning');
                }
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.speedChallengeInterval);
            }
        }, 1000);
        
        this.speedChallengeTimer = setTimeout(() => {
            if (!this.quizAnswered) {
                this.selectQuizAnswer(null, null, card, true);
            }
        }, 8000);
    }

    // Answer selection with batch tracking
    selectQuizAnswer(button, selectedOption, correctCard, isTimeout = false) {
        if (this.quizAnswered) return;
        
        logMigrationPoint(`selectQuizAnswer: ${isTimeout ? 'timeout' : 'user selection'}, correct: ${selectedOption?.japanese === correctCard.japanese}`);
        
        this.clearAllTimers();
        this.quizAnswered = true;
        this.currentBatchIndex++;
        
        const allOptions = document.querySelectorAll('.quiz-option');
        const feedback = document.getElementById('quizFeedback');
        const cardType = correctCard.type;
        
        this.categoryStats[cardType].quizAttempts++;
        
        let isCorrect = false;
        if (!isTimeout && selectedOption?.japanese === correctCard.japanese) {
            isCorrect = true;
            if (button) button.classList.add('correct');
            feedback.textContent = `✅ Correct! ${correctCard.reading}`;
            feedback.className = 'quiz-feedback correct';
            this.categoryStats[cardType].quizCorrect++;
        } else {
            if (button && !isTimeout) button.classList.add('incorrect');
            
            // FIXED: Highlight correct answer based on question direction
            allOptions.forEach(opt => {
                const text = opt.textContent || opt.innerText;
                if (this.currentQuestionDirection === 'en-to-jp') {
                    // For EN→JP, correct answer is the Japanese text
                    if (text.includes(correctCard.japanese)) {
                        opt.classList.add('correct');
                    }
                } else {
                    // For JP→EN, correct answer is the English meaning
                    if (text.includes(correctCard.meaning)) {
                        opt.classList.add('correct');
                    }
                }
            });
            
            feedback.textContent = isTimeout 
                ? `⏰ Time's up! Answer: ${correctCard.meaning} (${correctCard.reading})`
                : `❌ Wrong. Correct answer: ${correctCard.meaning} (${correctCard.reading})`;
            feedback.className = 'quiz-feedback incorrect';
        }
        
        // Check if batch is complete
        if (this.currentBatchIndex % this.batchSize === 0) {
            logMigrationPoint(`Batch complete! Quiz mode unlocked after ${this.batchSize} cards`);
            this.showNotification('Batch complete! Quiz mode unlocked', 'success');
        }
        
        allOptions.forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
        });
        
        if (this.spacedRepetition?.updateWordProgress) {
            this.spacedRepetition.updateWordProgress(correctCard.japanese, isCorrect);
        }
        
        this.updateStats();
        this.startAutoAdvanceTimer();
    }

    startAutoAdvanceTimer() {
        this.clearAutoAdvanceTimer();
        this.autoAdvanceTimer = setTimeout(() => {
            if (this.currentMode === 'quiz' && this.quizAnswered) {
                this.nextCard();
            }
        }, 2500);
    }

    clearAutoAdvanceTimer() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }
    }

    clearAllTimers() {
        if (this.speedChallengeTimer) {
            clearTimeout(this.speedChallengeTimer);
            this.speedChallengeTimer = null;
        }
        if (this.speedChallengeInterval) {
            clearInterval(this.speedChallengeInterval);
            this.speedChallengeInterval = null;
        }
        this.clearAutoAdvanceTimer();
        
        const existingTimers = document.querySelectorAll('.speed-timer');
        existingTimers.forEach(timer => timer.remove());
    }

    // Navigation
    flipCard() {
        logMigrationPoint(`flipCard called in ${this.currentMode} mode`);
        
        if (this.currentMode === 'quiz') {
            logMigrationPoint('flipCard: Redirecting to nextCard for quiz mode');
            this.nextCard();
            return;
        }
        
        const card = this.safeGetCard(this.currentCardIndex);
        if (!card) {
            logMigrationPoint('flipCard: No card available');
            return;
        }
        
        const meaning = document.getElementById('meaning');
        const flashcard = document.getElementById('flashcard');
        
        migrationCheckpoint('flipCard-dom-check');
        
        if (this.isFlipped) {
            meaning.style.display = 'none';
            flashcard.classList.remove('flipped');
            logMigrationPoint('Card flipped to front');
        } else {
            meaning.style.display = 'block';
            flashcard.classList.add('flipped');
            this.flipCount++;
            logMigrationPoint(`Card flipped to back, flip count: ${this.flipCount}`);
            
            if (this.spacedRepetition?.updateWordProgress) {
                this.spacedRepetition.updateWordProgress(card.japanese, true);
                migrationCheckpoint('flipCard-progress-updated');
            }
        }
        this.isFlipped = !this.isFlipped;
        this.updateStats();
        
        migrationCheckpoint('flipCard-complete');
    }

    nextCard() {
        logMigrationPoint('nextCard called');
        
        this.clearAllTimers();
        
        if (this.currentCardIndex < this.currentDeck.length - 1) {
            this.currentCardIndex++;
            logMigrationPoint(`nextCard: Advanced to index ${this.currentCardIndex}`);
        } else {
            const newDeck = this.spacedRepetition?.getNextCards?.(50, Array.from(this.activeFilters)) || 
                           this.vocabulary.shuffleArray(this.vocabulary.getAllWords().slice(0, 50));
            
            if (newDeck.length > 0) {
                this.currentDeck = newDeck;
                this.currentCardIndex = 0;
                this.cardsStudied.clear();
                this.resetQuizModeForNewBatch();
                logMigrationPoint('nextCard: New deck loaded, reset to index 0');
            }
        }
        this.updateCard();
    }

    previousCard() {
        logMigrationPoint('previousCard called');
        
        this.clearAllTimers();
        this.currentCardIndex = Math.max(0, this.currentCardIndex - 1);
        this.updateCard();
    }

    // Filter Management
    handleFilterChange(e) {
        const checkbox = e.target;
        const filterId = checkbox.id;
        const isChecked = checkbox.checked;

        logMigrationPoint(`Filter change: ${filterId} = ${isChecked}`);

        if (filterId === 'filterAll') {
            if (isChecked) {
                document.querySelectorAll('#dropdownMenu input[type="checkbox"]:not(#filterAll)')
                    .forEach(cb => cb.checked = false);
                this.activeFilters = new Set(['all']);
            } else {
                this.activeFilters.delete('all');
            }
        } else {
            document.getElementById('filterAll').checked = false;
            this.activeFilters.delete('all');

            const filterMap = {
                'filterNouns': 'noun',
                'filterVerbs': 'verb',
                'filterIAdj': 'i-adjective',
                'filterNaAdj': 'na-adjective'
            };

            if (isChecked) {
                this.activeFilters.add(filterMap[filterId]);
            } else {
                this.activeFilters.delete(filterMap[filterId]);
            }

            if (this.activeFilters.size === 0) {
                document.getElementById('filterAll').checked = true;
                this.activeFilters.add('all');
            }
        }

        this.applyFilters();
    }

    applyFilters() {
        logMigrationPoint('Applying filters:', Array.from(this.activeFilters));
        
        this.currentDeck = this.spacedRepetition?.getNextCards?.(50, Array.from(this.activeFilters)) || 
                          this.vocabulary.shuffleArray(
                              this.vocabulary.getAllWords()
                                  .filter(card => this.activeFilters.has('all') || this.activeFilters.has(card.type))
                                  .slice(0, 50)
                          );
        
        this.currentCardIndex = 0;
        this.cardsStudied.clear();
        this.resetEngagementTracking();
        this.resetQuizModeForNewBatch();
        this.updateCard();
        this.updateStats();
    }

    // UI Updates
    updateCardCounter() {
        const cardCounter = document.getElementById('cardCounter');
        const progressBar = document.getElementById('progressBar');
        
        if (cardCounter) {
            const display = this.currentMode === 'quiz' ? 'Quiz' : 'Card';
            cardCounter.textContent = `${display} ${this.currentCardIndex + 1} of ${this.currentDeck.length}`;
        }
        
        if (progressBar && this.currentDeck.length > 0) {
            const percent = ((this.currentCardIndex + 1) / this.currentDeck.length) * 100;
            progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
        }
    }

    updateLearningStateIndicator(card) {
        const indicator = document.getElementById('stateIndicator');
        const flashcard = document.getElementById('flashcard');
        
        if (this.spacedRepetition?.getWordStateConfig && indicator && flashcard) {
            const config = this.spacedRepetition.getWordStateConfig(card.japanese);
            flashcard.className = `flashcard state-${config.name.toLowerCase()}`;
            indicator.className = `learning-state-indicator state-${config.name.toLowerCase()}`;
            indicator.textContent = config.indicator;
        }
    }

    updateWordCountBadges() {
        const counts = this.vocabulary.getWordCounts();
        const elements = {
            'allCount': counts.all,
            'nounCount': counts.noun,
            'verbCount': counts.verb,
            'iAdjCount': counts['i-adjective'],
            'naAdjCount': counts['na-adjective']
        };
        
        Object.entries(elements).forEach(([id, count]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = count;
        });
    }

    updateStats() {
        if (this.spacedRepetition?.getDueCounts) {
            const counts = this.spacedRepetition.getDueCounts();
            
            ['statNew', 'statLearning', 'statReview', 'statMastered'].forEach((id, index) => {
                const element = document.getElementById(id);
                const values = [counts.new, counts.learning, counts.review, counts.mastered];
                if (element) element.textContent = values[index];
            });

            const totalStudied = Object.values(this.spacedRepetition.wordProgress || {})
                .filter(p => p.totalAttempts > 0).length;
            const totalMastered = Object.values(this.spacedRepetition.wordProgress || {})
                .filter(p => p.state === 'mastered').length;
            const masteryPercent = Math.round((totalMastered / this.vocabulary.getAllWords().length) * 100);

            const updates = {
                'cardsStudied': totalStudied,
                'progressPercent': masteryPercent + '%',
                'timesFlipped': this.flipCount
            };

            Object.entries(updates).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        } else {
            const basicStats = {
                'cardsStudied': this.cardsStudied.size,
                'progressPercent': Math.round((this.cardsStudied.size / this.currentDeck.length) * 100) + '%',
                'timesFlipped': this.flipCount
            };
            
            Object.entries(basicStats).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        }
    }

    // Utility Methods
    shuffleCards() {
        logMigrationPoint('shuffleCards called');
        
        this.currentDeck = this.vocabulary.shuffleArray([...this.currentDeck]);
        this.currentCardIndex = 0;
        this.resetQuizModeForNewBatch();
        this.updateCard();
        this.showNotification('🔀 Cards shuffled!', 'success');
    }

    resetProgress() {
        if (!confirm('Reset all learning progress? This will clear your spaced repetition data.')) return;
        
        logMigrationPoint('resetProgress confirmed and executed');
        
        if (this.spacedRepetition?.resetAllProgress) {
            this.spacedRepetition.resetAllProgress();
        }
        
        this.currentCardIndex = 0;
        this.cardsStudied.clear();
        this.flipCount = 0;
        this.categoryStats = this.storage.getDefaultCategoryStats();
        this.resetQuizModeForNewBatch();
        this.applyFilters();
        this.showNotification('🔄 Progress reset successfully!', 'success');
    }

    toggleStats() {
        logMigrationPoint('toggleStats called');
        
        const stats = document.getElementById('stats');
        stats?.classList.toggle('show');
    }

    trackEngagement() {
        this.engagementCount++;
        if (this.engagementCount >= 3 && this.currentDeck.reviewCardCount > 0 && !this.retentionPromptShown) {
            this.showRetentionPrompt(this.currentDeck.reviewCardCount);
        }
    }

    resetEngagementTracking() {
        this.engagementCount = 0;
        this.retentionPromptShown = false;
        logMigrationPoint('Engagement tracking reset');
    }

    showRetentionPrompt(reviewCount) {
        const prompt = document.getElementById('retentionPrompt');
        const count = document.getElementById('reviewCount');
        
        if (prompt && count) {
            count.textContent = reviewCount;
            prompt.classList.add('show');
            this.retentionPromptShown = true;
            
            setTimeout(() => {
                prompt.classList.add('fade-out');
                setTimeout(() => prompt.classList.remove('show', 'fade-out'), 500);
            }, 4000);
        }
    }

    // Event Handlers
    handleKeyboard(event) {
        if (!this.keyboardListenerActive) return;
        
        const isFormInput = event.target.tagName === 'TEXTAREA' || 
                           event.target.tagName === 'INPUT' ||
                           event.target.contentEditable === 'true';
        
        if (isFormInput) return;

        switch(event.key) {
            case ' ':
            case 'Enter':
                event.preventDefault();
                logMigrationPoint(`Keyboard shortcut: ${event.key} for ${this.currentMode === 'study' ? 'flip' : 'next'}`);
                this.currentMode === 'study' ? this.flipCard() : this.nextCard();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                logMigrationPoint('Keyboard shortcut: ArrowLeft for previous card');
                this.previousCard();
                break;
            case 'ArrowRight':
                event.preventDefault();
                logMigrationPoint('Keyboard shortcut: ArrowRight for next card');
                this.nextCard();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                if (this.currentMode === 'quiz' && !this.quizAnswered) {
                    event.preventDefault();
                    const optionIndex = parseInt(event.key) - 1;
                    const options = document.querySelectorAll('.quiz-option:not(.disabled)');
                    logMigrationPoint(`Keyboard shortcut: ${event.key} for quiz option ${optionIndex + 1}`);
                    options[optionIndex]?.click();
                }
                break;
            case 'k':
            case 'K':
                if (this.currentMode === 'quiz') {
                    event.preventDefault();
                    logMigrationPoint('Keyboard shortcut: K for kana toggle');
                    this.toggleKanaState();
                }
                break;
        }
    }

    async playAudio(event) {
        event.stopPropagation();
        const card = this.safeGetCard(this.currentCardIndex);
        if (!card) return;
        
        logMigrationPoint(`playAudio called for: ${card.japanese}`);
        
        const buttonElement = event.target.closest('.audio-button, .quiz-audio-button');
        try {
            await this.audio.playAudio(card.japanese, { buttonElement });
            logMigrationPoint('Audio playback successful');
        } catch (error) {
            console.error('Audio playback failed:', error);
            logMigrationPoint(`Audio playback failed: ${error.message}`);
            this.showNotification('🔊 Audio temporarily unavailable', 'error');
        }
    }

    // Modal Management
    showFeedbackForm() {
        document.getElementById('feedbackModal').style.display = 'block';
        this.keyboardListenerActive = false;
    }

    hideFeedbackForm() {
        document.getElementById('feedbackModal').style.display = 'none';
        this.keyboardListenerActive = true;
    }

    showLearningInfo() {
        document.getElementById('learningModal').style.display = 'block';
        this.keyboardListenerActive = false;
    }

    hideLearningInfo() {
        document.getElementById('learningModal').style.display = 'none';
        this.keyboardListenerActive = true;
    }

    showDonateInfo() {
        window.open('https://www.paypal.com/donate/?hosted_button_id=RDB6KTNXBLZ7Q', '_blank');
    }

    submitFeedback(event) {
        event.preventDefault();
        this.showNotification('✅ Thank you for your feedback!', 'success');
        this.hideFeedbackForm();
        
        const form = event.target;
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
        }).catch(error => console.log('Feedback submission error:', error));
        
        form.reset();
    }

    showNotification(message, type = 'info') {
        const colors = { error: '#f44336', success: '#4caf50', info: '#388e3c' };
        const notification = document.createElement('div');
        
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${colors[type]};
            color: white; padding: 15px 20px; border-radius: 10px;
            box-shadow: 0 4px 15px ${colors[type]}33; z-index: 1001;
            font-weight: 500; max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    logMigrationPoint('DOM loaded, initializing app');
    window.jlptApp = new JLPTApp();
    await window.jlptApp.initializationComplete;
    migrationCheckpoint('App fully initialized');
});