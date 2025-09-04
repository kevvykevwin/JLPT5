// assets/js/app.js - ENHANCED with Adaptive Batch System and FIXED Reading Toggle

import { allFlashcards } from './core/vocabulary.js';
import { 
    initializeSpacedRepetition, 
    getNextCards, 
    updateWordProgress, 
    getDueCounts,
    getWordProgress,
    resetAllProgress 
} from './core/spacedRepetition.js';
import { 
    loadUserPreferences, 
    saveUserPreferences, 
    loadReadingToggle,
    saveReadingToggle 
} from './core/storage.js';
import { initializeAudio, playCardAudio } from './features/audioSystem.js';

class JLPTApp {
    constructor() {
        // Core app state
        this.currentCardIndex = 0;
        this.currentDeck = [];
        this.isFlipped = false;
        this.flipCount = 0;
        this.cardsStudied = new Set();
        this.currentMode = 'study';
        this.currentQuizMode = 'multiple-choice';
        this.keyboardListenerActive = true;

        // ENHANCED: Adaptive batch system
        this.quizAnswered = false;
        this.quizStartTime = 0;
        this.speedChallengeTimer = null;
        this.speedChallengeInterval = null;
        this.autoAdvanceTimer = null;
        this.readingsHidden = false;
        this.currentQuizAttempt = 0;
        
        // NEW: Batch management
        this.currentBatch = {
            size: 6,
            completed: 0,
            questions: []
        };
        this.recentPerformance = [];
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        this.isInBatchModeSelection = false;

        // Filter state
        this.activeFilters = new Set(['all']);

        // Statistics tracking
        this.totalQuizAttempts = 0;
        this.totalQuizCorrect = 0;
        this.engagementCount = 0;
        this.retentionPromptShown = false;
        
        this.categoryStats = {
            'noun': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 },
            'verb': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 },
            'i-adjective': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 },
            'na-adjective': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 }
        };

        this.wordCounts = {
            all: 0,
            noun: 0,
            verb: 0,
            'i-adjective': 0,
            'na-adjective': 0
        };
    }

    async initialize() {
        console.log('🚀 Initializing JLPT N5 Adaptive Batch System...');
        
        try {
            if (!allFlashcards || allFlashcards.length === 0) {
                throw new Error('Vocabulary not loaded - check vocabulary.js import');
            }
            console.log(`📚 Vocabulary verified: ${allFlashcards.length} cards`);

            await initializeSpacedRepetition();
            await initializeAudio();
            
            const preferences = loadUserPreferences();
            this.readingsHidden = loadReadingToggle();
            this.currentQuizMode = preferences.currentQuizMode || 'multiple-choice';
            
            this.calculateWordCounts();
            this.initializeUI();
            this.setupEventListeners();
            
            this.currentDeck = getNextCards(50, this.activeFilters);
            if (this.currentDeck.length === 0) {
                console.warn('No cards available, using full vocabulary');
                this.currentDeck = this.shuffleArray(allFlashcards.slice(0, 50));
            }
            
            this.currentCardIndex = 0;
            this.updateCard();
            this.updateEnhancedStats();
            
            console.log('✅ JLPT N5 Adaptive Batch System Ready!');
            console.log(`🎯 Initial batch size calculation enabled`);
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showErrorFallback(error);
        }
    }

    // NEW: Reading toggle visibility management
    updateReadingToggleVisibility() {
        const toggle = document.querySelector('.quiz-reading-toggle');
        const isQuizActive = this.currentMode === 'quiz';
        const isNotInModeSelection = !this.isInBatchModeSelection;
        const quizContainer = document.getElementById('quizContainer');
        const isContainerActive = quizContainer && !quizContainer.classList.contains('hidden');
        
        if (toggle) {
            if (isQuizActive && isNotInModeSelection && isContainerActive) {
                toggle.style.opacity = '1';
                toggle.style.visibility = 'visible';
                toggle.style.pointerEvents = 'auto';
            } else {
                toggle.style.opacity = '0';
                toggle.style.visibility = 'hidden';
                toggle.style.pointerEvents = 'none';
            }
        }
        
        console.log('📖 Reading toggle visibility updated:', {
            isQuizActive,
            isNotInModeSelection,
            isContainerActive,
            visible: isQuizActive && isNotInModeSelection && isContainerActive
        });
    }

    // NEW: Adaptive batch calculation system
    calculateBatchSize() {
        try {
            // Factor 1: Recent accuracy (40% weight)
            const recentAccuracy = this.getRecentAccuracy(10);
            
            // Factor 2: Card state distribution (35% weight) 
            const cardStateScore = this.calculateCardStateScore();
            
            // Factor 3: Consecutive performance (25% weight)
            const streakMultiplier = this.getStreakMultiplier();
            
            const compositeScore = (recentAccuracy * 0.4) + (cardStateScore * 0.35) + (streakMultiplier * 0.25);
            
            const batchSize = this.mapScoreToBatchSize(compositeScore);
            
            console.log(`🎯 Batch size calculated: ${batchSize} (score: ${compositeScore.toFixed(2)})`);
            console.log(`   - Recent accuracy: ${recentAccuracy.toFixed(2)} (40%)`);
            console.log(`   - Card state score: ${cardStateScore.toFixed(2)} (35%)`);
            console.log(`   - Streak multiplier: ${streakMultiplier.toFixed(2)} (25%)`);
            
            return batchSize;
            
        } catch (error) {
            console.warn('Error calculating batch size, using default:', error);
            return 6; // Safe default
        }
    }

    getRecentAccuracy(sampleSize = 10) {
        if (this.recentPerformance.length === 0) return 0.5; // Neutral starting point
        
        const recentResults = this.recentPerformance.slice(-sampleSize);
        const correct = recentResults.filter(result => result).length;
        return correct / recentResults.length;
    }

    calculateCardStateScore() {
        if (!this.currentDeck || this.currentDeck.length === 0) return 0.5;
        
        let stateScore = 0;
        let validCards = 0;
        
        this.currentDeck.forEach(card => {
            const progress = getWordProgress(card.japanese);
            if (progress) {
                validCards++;
                switch (progress.state) {
                    case 'new':
                        stateScore += 0.2; // New cards need more variety
                        break;
                    case 'learning_1':
                    case 'learning_2':
                        stateScore += 0.4; // Learning cards benefit from focus
                        break;
                    case 'review_1':
                    case 'review_2':
                        stateScore += 0.7; // Review cards can handle longer sessions
                        break;
                    case 'mastered':
                        stateScore += 0.9; // Mastered cards allow longest sessions
                        break;
                    default:
                        stateScore += 0.3;
                }
            }
        });
        
        return validCards > 0 ? stateScore / validCards : 0.5;
    }

    getStreakMultiplier() {
        if (this.consecutiveCorrect >= 5) {
            return Math.min(1.0, 0.6 + (this.consecutiveCorrect * 0.08)); // Reward good streaks
        } else if (this.consecutiveIncorrect >= 3) {
            return Math.max(0.1, 0.5 - (this.consecutiveIncorrect * 0.1)); // Reduce batch for struggles
        }
        return 0.5; // Neutral
    }

    mapScoreToBatchSize(score) {
        if (score <= 0.4) {
            return Math.floor(3 + Math.random() * 3); // 3-5 questions (struggling)
        } else if (score <= 0.7) {
            return Math.floor(6 + Math.random() * 3); // 6-8 questions (developing)
        } else {
            return Math.floor(10 + Math.random() * 3); // 10-12 questions (proficient)
        }
    }

    // NEW: Batch management
    initializeBatch() {
        this.currentBatch = {
            size: this.calculateBatchSize(),
            completed: 0,
            questions: []
        };
        this.isInBatchModeSelection = false;
        
        console.log(`🎯 New batch initialized: ${this.currentBatch.size} questions`);
    }

    incrementBatch(isCorrect) {
        this.currentBatch.completed++;
        
        // Track performance for adaptive calculations
        this.recentPerformance.push(isCorrect);
        if (this.recentPerformance.length > 20) {
            this.recentPerformance.shift(); // Keep only recent 20 results
        }
        
        // Update consecutive counters
        if (isCorrect) {
            this.consecutiveCorrect++;
            this.consecutiveIncorrect = 0;
        } else {
            this.consecutiveIncorrect++;
            this.consecutiveCorrect = 0;
        }
        
        console.log(`📊 Batch progress: ${this.currentBatch.completed}/${this.currentBatch.size}`);
        this.updateBatchProgress();
        
        return this.isBatchComplete();
    }

    isBatchComplete() {
        return this.currentBatch.completed >= this.currentBatch.size;
    }

    updateBatchProgress() {
        const progressBar = document.getElementById('batchProgressFill');
        if (progressBar) {
            const percentage = (this.currentBatch.completed / this.currentBatch.size) * 100;
            progressBar.style.width = `${Math.min(100, percentage)}%`;
            
            // Add completion animation
            if (this.isBatchComplete()) {
                progressBar.classList.add('batch-complete');
                setTimeout(() => {
                    progressBar.classList.remove('batch-complete');
                }, 1000);
            }
        }
    }

    showBatchModeSelection() {
        console.log('🎯 Showing batch completion mode selection...');
        
        this.isInBatchModeSelection = true;
        this.hideQuizContainer();
        this.showModeSelector();
        this.updateCardCounter();
        this.updateReadingToggleVisibility(); // Update toggle visibility
        
        // Show batch completion message
        const modeSelector = document.querySelector('.quiz-mode-selector');
        if (modeSelector) {
            modeSelector.classList.add('batch-complete-selection');
            
            // Add completion celebration
            const completionMsg = document.createElement('div');
            completionMsg.className = 'batch-completion-msg';
            completionMsg.innerHTML = `
                ✨ Batch Complete! ${this.currentBatch.completed} questions finished<br>
                <small>Choose your next challenge or continue with ${this.currentQuizMode}</small>
            `;
            
            if (!modeSelector.querySelector('.batch-completion-msg')) {
                modeSelector.insertBefore(completionMsg, modeSelector.firstChild);
            }
        }
        
        this.enableQuizModeButtons();
        
        // Auto-continue option after 5 seconds
        setTimeout(() => {
            if (this.isInBatchModeSelection) {
                this.continueWithCurrentMode();
            }
        }, 5000);
    }

    continueWithCurrentMode() {
        console.log(`🎯 Auto-continuing with ${this.currentQuizMode} mode`);
        this.initializeBatch();
        const card = this.safeGetCard(this.currentCardIndex);
        if (card) {
            this.updateQuiz(card);
        }
    }

    // ENHANCED: Main card update function with batch management
    updateCard() {
        try {
            const card = this.safeGetCard(this.currentCardIndex);
            if (!card) {
                console.error('No card available at index:', this.currentCardIndex);
                return;
            }

            if (this.currentMode === 'quiz') {
                // Initialize batch on first quiz question
                if (this.currentBatch.completed === 0 && this.currentBatch.size === 0) {
                    this.initializeBatch();
                }
                
                // Check if we need mode selection (either first question or batch complete)
                if (this.currentBatch.completed === 0 || this.isInBatchModeSelection) {
                    this.showQuizModeSelection();
                    return;
                } else {
                    this.updateQuiz(card);
                    return;
                }
            }

            // Study mode logic (unchanged)
            const elements = {
                promptText: document.getElementById('promptText'),
                japaneseWord: document.getElementById('japaneseWord'),
                reading: document.getElementById('reading'),
                meaning: document.getElementById('meaning'),
                flashcard: document.getElementById('flashcard')
            };

            const missingElements = Object.entries(elements)
                .filter(([name, element]) => !element)
                .map(([name]) => name);
                
            if (missingElements.length > 0) {
                console.error('Missing DOM elements:', missingElements);
                return;
            }

            elements.promptText.textContent = '';
            elements.meaning.style.display = 'none';
            elements.japaneseWord.style.fontSize = '48px';
            this.isFlipped = false;
            elements.flashcard.classList.remove('flipped');

            elements.japaneseWord.textContent = card.japanese;
            elements.reading.textContent = card.reading;
            elements.meaning.textContent = card.meaning;

            this.updateLearningStateIndicator(card);
            this.updateCardCounter();
            this.updateReadingToggleVisibility(); // Update toggle visibility

            this.cardsStudied.add(this.currentCardIndex);
            const cardType = card.type;
            if (this.categoryStats[cardType]) {
                this.categoryStats[cardType].studied.add(card.japanese);
            }

            this.engagementCount++;
            if (this.engagementCount >= 3 && this.currentDeck.reviewCardCount > 0 && !this.retentionPromptShown) {
                this.showRetentionPrompt(this.currentDeck.reviewCardCount);
            }

        } catch (error) {
            console.error('Error updating card:', error);
            this.showErrorFallback(error);
        }
    }

    // ENHANCED: Quiz answer selection with batch management
    selectQuizAnswer(button, selectedOption, correctCard, isTimeout = false) {
        if (this.quizAnswered) return;
        
        this.clearSpeedTimer();
        this.clearAutoAdvanceTimer();
        
        const allOptions = document.querySelectorAll('.quiz-option');
        const feedback = document.getElementById('quizFeedback');
        
        this.quizAnswered = true;
        
        const timerElement = document.querySelector('.speed-timer');
        if (timerElement && document.body.contains(timerElement)) {
            timerElement.remove();
        }
        
        const cardType = correctCard.type;
        if (this.categoryStats[cardType]) {
            this.categoryStats[cardType].quizAttempts++;
        }
        
        this.totalQuizAttempts++;
        
        let isCorrect = false;
        if (!isTimeout && selectedOption && selectedOption.japanese === correctCard.japanese) {
            isCorrect = true;
            if (button) {
                button.classList.add('correct');
                button.classList.add('correct-celebration');
                this.showSuccessAnimation(button);
            }
            
            feedback.textContent = `✅ Correct! ${correctCard.reading}`;
            feedback.className = 'quiz-feedback correct';
            
            if (this.categoryStats[cardType]) {
                this.categoryStats[cardType].quizCorrect++;
            }
            this.totalQuizCorrect++;
        } else {
            if (button && !isTimeout) button.classList.add('incorrect');
            
            allOptions.forEach(opt => {
                const optionText = opt.textContent || opt.innerText;
                if (optionText.includes(correctCard.meaning) || 
                    optionText.includes(correctCard.japanese)) {
                    opt.classList.add('correct');
                }
            });
            
            if (isTimeout) {
                feedback.textContent = `⏰ Time's up! Answer: ${correctCard.meaning} (${correctCard.reading})`;
            } else {
                feedback.textContent = `❌ Wrong. Correct answer: ${correctCard.meaning} (${correctCard.reading})`;
            }
            feedback.className = 'quiz-feedback incorrect';
        }
        
        updateWordProgress(correctCard.japanese, isCorrect);
        
        allOptions.forEach(opt => {
            opt.classList.add('disabled');
            opt.style.pointerEvents = 'none';
        });
        
        this.updateEnhancedStats();

        // ENHANCED: Batch management and mode selection
        const batchComplete = this.incrementBatch(isCorrect);
        
        if (batchComplete) {
            // Show batch completion and mode selection
            setTimeout(() => {
                this.showBatchModeSelection();
            }, 2000);
        } else {
            // Continue with current batch
            if (this.currentMode === 'quiz') {
                this.startAutoAdvanceTimer();
            }
        }
    }

    // ENHANCED: Tab switching with batch reset
    handleTabSwitch(button) {
        const tabId = button.getAttribute('data-tab');
        
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabId + 'Tab')?.classList.add('active');
        
        this.currentMode = tabId;
        this.resetEngagementTracking();
        
        // Reset batch when switching to quiz mode
        if (tabId === 'quiz') {
            this.currentBatch = { size: 0, completed: 0, questions: [] };
            this.isInBatchModeSelection = false;
        }
        
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) {
            if (tabId === 'study') {
                flipBtn.textContent = 'Flip Card';
            } else {
                flipBtn.textContent = 'Next Quiz';
            }
        }
        
        this.updateCard();
        this.updateReadingToggleVisibility(); // Update toggle visibility
    }

    // ENHANCED: Quiz mode selection with batch initialization
    setQuizMode(mode) {
        console.log(`🎯 Setting quiz mode to: ${mode}`);
        
        this.clearSpeedTimer();
        this.clearAutoAdvanceTimer();
        const existingTimer = document.querySelector('.speed-timer');
        if (existingTimer) existingTimer.remove();
        
        this.currentQuizMode = mode;
        this.updateQuizModeButtons();
        
        const preferences = loadUserPreferences();
        preferences.currentQuizMode = mode;
        saveUserPreferences(preferences);
        
        // Clean up batch completion UI
        const modeSelector = document.querySelector('.quiz-mode-selector');
        if (modeSelector) {
            modeSelector.classList.remove('batch-complete-selection');
            const completionMsg = modeSelector.querySelector('.batch-completion-msg');
            if (completionMsg) {
                completionMsg.remove();
            }
        }
        
        // Initialize new batch and start quiz
        if (this.isInBatchModeSelection || this.currentBatch.completed === 0) {
            this.initializeBatch();
            const card = this.safeGetCard(this.currentCardIndex);
            if (card) {
                this.updateQuiz(card);
                console.log(`✅ New batch started with ${mode} mode (${this.currentBatch.size} questions)`);
            }
        }
    }

    // Enhanced card counter with batch progress
    updateCardCounter() {
        const cardCounterElement = document.getElementById('cardCounter');
        const progressBarElement = document.getElementById('progressBar');
        
        if (cardCounterElement) {
            const displayIndex = Math.max(1, this.currentCardIndex + 1);
            const displayTotal = Math.max(1, this.currentDeck.length);
            
            if (this.currentMode === 'quiz') {
                if (this.isInBatchModeSelection) {
                    cardCounterElement.textContent = `Quiz ${displayIndex} of ${displayTotal} - Select Mode`;
                } else if (this.currentBatch.size > 0) {
                    cardCounterElement.textContent = `Quiz ${displayIndex} of ${displayTotal} - Batch ${this.currentBatch.completed}/${this.currentBatch.size}`;
                } else {
                    cardCounterElement.textContent = `Quiz ${displayIndex} of ${displayTotal}`;
                }
            } else {
                cardCounterElement.textContent = `Card ${displayIndex} of ${displayTotal}`;
            }
        }
        
        if (progressBarElement && this.currentDeck.length > 0) {
            const progressPercent = ((this.currentCardIndex + 1) / this.currentDeck.length) * 100;
            progressBarElement.style.width = Math.min(100, Math.max(0, progressPercent)) + '%';
        }
    }

    showErrorFallback(error) {
        const japaneseWord = document.getElementById('japaneseWord');
        const reading = document.getElementById('reading');
        const cardCounter = document.getElementById('cardCounter');
        
        if (japaneseWord) japaneseWord.textContent = 'System Error';
        if (reading) reading.textContent = 'Please refresh the page';
        if (cardCounter) cardCounter.textContent = `Error: ${error.message}`;
        
        this.showNotification('System initialization failed. Please refresh the page.', 'error');
    }

    initializeUI() {
        this.calculateWordCounts();
        this.updateReadingToggleState();
        this.updateQuizModeButtons();
    }

    calculateWordCounts() {
        this.wordCounts.all = allFlashcards.length;
        this.wordCounts.noun = allFlashcards.filter(card => card.type === 'noun').length;
        this.wordCounts.verb = allFlashcards.filter(card => card.type === 'verb').length;
        this.wordCounts['i-adjective'] = allFlashcards.filter(card => card.type === 'i-adjective').length;
        this.wordCounts['na-adjective'] = allFlashcards.filter(card => card.type === 'na-adjective').length;
        
        const elements = {
            'allCount': this.wordCounts.all,
            'nounCount': this.wordCounts.noun,
            'verbCount': this.wordCounts.verb,
            'iAdjCount': this.wordCounts['i-adjective'],
            'naAdjCount': this.wordCounts['na-adjective']
        };
        
        Object.entries(elements).forEach(([id, count]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = count;
        });
        
        console.log('📊 Word counts updated:', this.wordCounts);
    }

    safeGetCard(index) {
        if (!this.currentDeck || this.currentDeck.length === 0) {
            console.warn('Empty deck detected, reinitializing...');
            this.currentDeck = getNextCards(50, this.activeFilters);
            if (this.currentDeck.length === 0) {
                this.currentDeck = this.shuffleArray(allFlashcards.slice(0, 50));
            }
        }
        
        const safeIndex = Math.max(0, Math.min(index, this.currentDeck.length - 1));
        
        if (safeIndex !== index) {
            console.warn(`Index ${index} out of bounds, using ${safeIndex}`);
            this.currentCardIndex = safeIndex;
        }
        
        return this.currentDeck[safeIndex];
    }

    updateLearningStateIndicator(card) {
        if (!card) return;
        
        const indicator = document.getElementById('stateIndicator');
        const flashcard = document.getElementById('flashcard');
        const progress = getWordProgress(card.japanese);

        if (!progress || !indicator || !flashcard) return;

        flashcard.classList.remove('state-new', 'state-learning', 'state-review', 'state-mastered');

        switch (progress.state) {
            case 'new':
                indicator.textContent = 'N';
                indicator.className = 'learning-state-indicator state-new';
                flashcard.classList.add('state-new');
                break;
            case 'learning_1':
            case 'learning_2':
                indicator.textContent = 'L';
                indicator.className = 'learning-state-indicator state-learning';
                flashcard.classList.add('state-learning');
                break;
            case 'review_1':
            case 'review_2':
                indicator.textContent = 'R';
                indicator.className = 'learning-state-indicator state-review';
                flashcard.classList.add('state-review');
                break;
            case 'mastered':
                indicator.textContent = 'M';
                indicator.className = 'learning-state-indicator state-mastered';
                flashcard.classList.add('state-mastered');
                break;
            default:
                indicator.textContent = '?';
                indicator.className = 'learning-state-indicator state-new';
                break;
        }
    }

    // Navigation functions
    flipCard() {
        if (this.currentMode === 'quiz') {
            this.nextCard();
            return;
        }
        
        const card = this.safeGetCard(this.currentCardIndex);
        if (!card) return;
        
        const meaning = document.getElementById('meaning');
        const flashcard = document.getElementById('flashcard');
        
        if (!meaning || !flashcard) return;
        
        if (this.isFlipped) {
            meaning.style.display = 'none';
            flashcard.classList.remove('flipped');
        } else {
            meaning.style.display = 'block';
            flashcard.classList.add('flipped');
            this.flipCount++;
            
            updateWordProgress(card.japanese, true);
            this.updateEnhancedStats();
            
            this.engagementCount++;
            if (this.engagementCount >= 3 && this.currentDeck.reviewCardCount > 0 && !this.retentionPromptShown) {
                this.showRetentionPrompt(this.currentDeck.reviewCardCount);
            }
        }
        this.isFlipped = !this.isFlipped;
    }

    nextCard() {
        this.clearSpeedTimer();
        this.clearAutoAdvanceTimer();
        
        if (this.currentCardIndex < this.currentDeck.length - 1) {
            this.currentCardIndex++;
        } else {
            const newDeck = getNextCards(50, this.activeFilters);
            if (newDeck.length > 0) {
                this.currentDeck = newDeck;
                this.currentCardIndex = 0;
                this.cardsStudied.clear();
            } else {
                this.currentCardIndex = 0;
            }
        }
        this.updateCard();
    }

    previousCard() {
        this.clearSpeedTimer();
        this.clearAutoAdvanceTimer();
        
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
        } else {
            this.currentCardIndex = Math.max(0, this.currentDeck.length - 1);
        }
        this.updateCard();
    }

    // Quiz functionality
    showQuizModeSelection() {
        console.log('📋 Showing quiz mode selection...');
        
        this.isInBatchModeSelection = true;
        this.hideQuizContainer();
        this.showModeSelector();
        this.updateCardCounter();
        this.updateReadingToggleVisibility(); // Update toggle visibility
        
        this.enableQuizModeButtons();
        
        const modeSelector = document.querySelector('.quiz-mode-selector');
        if (modeSelector) {
            modeSelector.classList.add('selection-phase');
        }
    }

    hideModeSelection() {
        this.isInBatchModeSelection = false;
        
        const modeSelector = document.querySelector('.quiz-mode-selector');
        if (modeSelector) {
            modeSelector.classList.remove('selection-phase', 'batch-complete-selection');
            const completionMsg = modeSelector.querySelector('.batch-completion-msg');
            if (completionMsg) {
                completionMsg.remove();
            }
        }
        
        this.updateReadingToggleVisibility(); // Update toggle visibility
    }

    showModeSelector() {
        const modeSelector = document.querySelector('.quiz-mode-selector');
        if (modeSelector) {
            modeSelector.style.display = 'flex';
        }
    }

    hideQuizContainer() {
        const quizContainer = document.getElementById('quizContainer');
        if (quizContainer) {
            quizContainer.classList.add('hidden');
        }
    }

    showQuizContainer() {
        const quizContainer = document.getElementById('quizContainer');
        if (quizContainer) {
            quizContainer.classList.remove('hidden');
        }
    }

    updateQuiz(card) {
        if (!card) {
            console.error('No card provided to updateQuiz');
            return;
        }

        this.hideModeSelection();
        this.showQuizContainer();
        this.clearAutoAdvanceTimer();
        this.updateReadingToggleVisibility(); // Update toggle visibility

        const quizQuestion = document.getElementById('quizQuestion');
        const quizOptions = document.getElementById('quizOptions');
        const quizFeedback = document.getElementById('quizFeedback');
        const quizAudioSection = document.getElementById('quizAudioSection');
        
        if (!quizQuestion || !quizOptions || !quizFeedback) {
            console.error('Quiz elements not found');
            return;
        }
        
        this.currentQuizAttempt++;
        this.quizStartTime = Date.now();
        
        quizFeedback.textContent = '';
        this.quizAnswered = false;

        const existingOptions = quizOptions.querySelectorAll('.quiz-option');
        existingOptions.forEach(option => {
            option.classList.remove('correct', 'incorrect', 'disabled', 'correct-celebration');
            option.style.pointerEvents = 'auto';
        });

        this.clearSpeedTimer();
        const existingTimer = document.querySelector('.speed-timer');
        if (existingTimer) existingTimer.remove();

        quizQuestion.className = 'japanese-word quiz-question';
        this.disableQuizModeButtons();

        try {
            switch (this.currentQuizMode) {
                case 'listening-first':
                    this.setupListeningQuiz(card, quizQuestion, quizOptions, quizAudioSection);
                    break;
                case 'mixed-challenge':
                    this.setupMixedQuiz(card, quizQuestion, quizOptions, quizAudioSection);
                    break;
                case 'speed-challenge':
                    this.setupSpeedQuiz(card, quizQuestion, quizOptions, quizAudioSection);
                    break;
                case 'kanji-only':
                    this.setupKanjiQuiz(card, quizQuestion, quizOptions, quizAudioSection);
                    break;
                default:
                    this.setupStandardQuiz(card, quizQuestion, quizOptions, quizAudioSection);
                    break;
            }
        } catch (error) {
            console.error('Error updating quiz:', error);
            quizQuestion.textContent = 'Error loading quiz';
        }
        
        this.updateCardCounter();
        this.cardsStudied.add(this.currentCardIndex);
        
        const cardType = card.type;
        if (this.categoryStats[cardType]) {
            this.categoryStats[cardType].studied.add(card.japanese);
        }
    }

    disableQuizModeButtons() {
        const quizModeButtons = document.querySelectorAll('.quiz-mode-btn');
        quizModeButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    enableQuizModeButtons() {
        const quizModeButtons = document.querySelectorAll('.quiz-mode-btn');
        quizModeButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }

    highlightAvailableButtons() {
        const quizModeButtons = document.querySelectorAll('.quiz-mode-btn');
        quizModeButtons.forEach(btn => {
            btn.classList.add('mode-available');
            setTimeout(() => btn.classList.remove('mode-available'), 3000);
        });
    }

    setupStandardQuiz(card, quizQuestion, quizOptions, quizAudioSection) {
        if (quizAudioSection) quizAudioSection.style.display = 'none';
        
        quizQuestion.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 15px; text-shadow: 0 3px 6px rgba(27, 94, 32, 0.2); font-weight: 900; color: #1b5e20; line-height: 0.9; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans CJK JP', sans-serif;">${card.japanese}</div>
            <div style="font-size: 16px; color: #666; font-weight: normal;">${card.reading}</div>
        `;
        
        this.generateQuizOptions(card, quizOptions, true);
    }

    setupListeningQuiz(card, quizQuestion, quizOptions, quizAudioSection) {
        quizQuestion.classList.add('listening-mode');
        quizQuestion.textContent = '🔊 Listen carefully and choose the meaning';
        if (quizAudioSection) quizAudioSection.style.display = 'flex';
        
        this.generateQuizOptions(card, quizOptions, true);
    }

    setupMixedQuiz(card, quizQuestion, quizOptions, quizAudioSection) {
        if (quizAudioSection) quizAudioSection.style.display = 'none';
        
        const isJapaneseToEnglish = Math.random() < 0.5;
        
        if (isJapaneseToEnglish) {
            quizQuestion.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 15px; text-shadow: 0 3px 6px rgba(27, 94, 32, 0.2); font-weight: 900; color: #1b5e20; line-height: 0.9; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans CJK JP', sans-serif;">${card.japanese}</div>
                <div style="font-size: 16px; color: #666; font-weight: normal;">What does this mean?</div>
            `;
        } else {
            quizQuestion.innerHTML = `
                <div style="font-size: 24px; color: #2e7d32; margin-bottom: 15px;">"${card.meaning}"</div>
                <div style="font-size: 16px; color: #666; font-weight: normal;">What is this in Japanese?</div>
            `;
        }
        
        this.generateQuizOptions(card, quizOptions, isJapaneseToEnglish);
    }

    setupSpeedQuiz(card, quizQuestion, quizOptions, quizAudioSection) {
        if (quizAudioSection) quizAudioSection.style.display = 'none';
        
        quizQuestion.classList.add('speed-challenge');
        quizQuestion.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 20px; text-shadow: 0 3px 6px rgba(27, 94, 32, 0.2); font-weight: 900; color: #1b5e20; line-height: 0.9; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans CJK JP', sans-serif;">${card.japanese}</div>
            <div class="speed-prompt" style="font-size: 11px; color: #ff6b6b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">⚡ SPEED ROUND - 8 SECONDS! ⚡</div>
        `;
        
        this.generateQuizOptions(card, quizOptions, true);
        
        const timerElement = document.createElement('div');
        timerElement.className = 'speed-timer';
        timerElement.textContent = '8s';
        document.getElementById('quizContainer').appendChild(timerElement);
        
        this.startSpeedChallengeTimer(card, timerElement);
    }

    setupKanjiQuiz(card, quizQuestion, quizOptions, quizAudioSection) {
        if (quizAudioSection) quizAudioSection.style.display = 'none';
        
        quizQuestion.classList.add('kanji-focus');
        quizQuestion.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 25px; text-shadow: 0 3px 6px rgba(27, 94, 32, 0.2); font-weight: 900; color: #1b5e20; line-height: 0.9; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans CJK JP', sans-serif;">${card.japanese}</div>
            <div style="font-size: 14px; color: #666; font-style: italic; font-weight: 500; border-top: 2px solid #e0e0e0; padding-top: 15px; margin-top: 15px;">Recognize this kanji and choose its meaning</div>
        `;
        
        this.generateQuizOptions(card, quizOptions, true);
    }

    generateQuizOptions(correctCard, container, isJapaneseQuestion) {
        if (!correctCard || !container) return;
        
        const options = [correctCard];
        const otherCards = allFlashcards.filter(card => 
            card.japanese !== correctCard.japanese
        );
        
        if (otherCards.length === 0) {
            console.warn('No other cards available for quiz options');
            return;
        }
        
        const shuffleRandom = (array) => {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        };
        
        const sameTypeCards = otherCards.filter(card => card.type === correctCard.type);
        const diffTypeCards = otherCards.filter(card => card.type !== correctCard.type);

        const shuffledSameType = shuffleRandom(sameTypeCards);
        const shuffledDiffType = shuffleRandom(diffTypeCards);

        const wrongAnswers = [];
        
        if (shuffledSameType.length >= 2) {
            wrongAnswers.push(...shuffledSameType.slice(0, 2));
        } else {
            wrongAnswers.push(...shuffledSameType);
        }
        
        const remainingSlots = 3 - wrongAnswers.length;
        if (remainingSlots > 0 && shuffledDiffType.length > 0) {
            wrongAnswers.push(...shuffledDiffType.slice(0, remainingSlots));
        }
        
        while (wrongAnswers.length < 3 && otherCards.length >= 3) {
            const remaining = otherCards.filter(card => 
                !wrongAnswers.some(wa => wa.japanese === card.japanese)
            );
            if (remaining.length > 0) {
                const randomIndex = Math.floor(Math.random() * remaining.length);
                wrongAnswers.push(remaining[randomIndex]);
            } else {
                break;
            }
        }
        
        options.push(...wrongAnswers);
        const shuffledOptions = shuffleRandom(options);
        
        container.innerHTML = '';
        shuffledOptions.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.setAttribute('data-option-index', index);
            
            if (isJapaneseQuestion || this.currentQuizMode === 'kanji-only') {
                button.innerHTML = `
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: ${option.reading && !this.readingsHidden ? '5px' : '0'};">${option.meaning}</div>
                    ${option.reading ? `<div class="quiz-option-reading${this.readingsHidden ? ' hidden' : ''}" style="font-size: 14px; color: #666; font-style: italic;">${option.reading}</div>` : ''}
                `;
            } else {
                button.innerHTML = `
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: ${option.reading && !this.readingsHidden ? '5px' : '0'}; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;">${option.japanese}</div>
                    ${option.reading ? `<div class="quiz-option-reading${this.readingsHidden ? ' hidden' : ''}" style="font-size: 14px; color: #666;">${option.reading}</div>` : ''}
                `;
            }
            
            button.onclick = () => this.selectQuizAnswer(button, option, correctCard);
            container.appendChild(button);
        });
        
        console.log(`Quiz options generated for ${correctCard.japanese} (attempt #${this.currentQuizAttempt})`);
    }

    showSuccessAnimation(button) {
        if (!button) return;
        
        this.createFireworks(button);
        
        setTimeout(() => {
            if (button.classList.contains('correct-celebration')) {
                button.style.animation = 'shake 0.5s ease-in-out, fireworks 0.8s ease-in-out';
            }
        }, 100);
        
        setTimeout(() => {
            button.classList.remove('correct-celebration');
            button.style.animation = '';
        }, 1300);
    }

    createFireworks(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: #4caf50;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${centerX}px;
                top: ${centerY}px;
            `;
            
            document.body.appendChild(particle);
            
            const angle = (i * 60) * (Math.PI / 180);
            const distance = 30 + Math.random() * 20;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;
            
            particle.animate([
                { 
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 1
                },
                { 
                    transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0.3)`,
                    opacity: 0
                }
            ], {
                duration: 600,
                easing: 'ease-out'
            }).onfinish = () => {
                document.body.removeChild(particle);
            };
        }
    }

    // Timer management
    startSpeedChallengeTimer(card, timerElement) {
        let timeLeft = 8;
        
        this.speedChallengeInterval = setInterval(() => {
            timeLeft--;
            if (timerElement && document.body.contains(timerElement)) {
                timerElement.textContent = timeLeft + 's';
                
                if (timeLeft <= 3) {
                    timerElement.classList.add('warning');
                }
            } else {
                clearInterval(this.speedChallengeInterval);
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.speedChallengeInterval);
            }
        }, 1000);
        
        this.speedChallengeTimer = setTimeout(() => {
            if (!this.quizAnswered) {
                this.selectQuizAnswer(null, null, card, true);
            }
            this.clearSpeedTimer();
        }, 8000);
    }

    clearSpeedTimer() {
        if (this.speedChallengeTimer) {
            clearTimeout(this.speedChallengeTimer);
            this.speedChallengeTimer = null;
        }
        if (this.speedChallengeInterval) {
            clearInterval(this.speedChallengeInterval);
            this.speedChallengeInterval = null;
        }
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

    // Utility functions
    shuffleArray(array) {
        if (!array || array.length === 0) return [];
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    shuffleCards() {
        try {
            this.currentDeck = this.shuffleArray([...this.currentDeck]);
            this.currentCardIndex = 0;
            this.updateCard();
            this.showNotification('🔀 Cards shuffled!', 'success');
        } catch (error) {
            console.error('Error shuffling cards:', error);
            this.showNotification('Error shuffling cards', 'error');
        }
    }

    resetProgress() {
        if (confirm('Reset all learning progress? This will clear your spaced repetition data.')) {
            try {
                resetAllProgress();
                
                this.currentCardIndex = 0;
                this.cardsStudied.clear();
                this.flipCount = 0;
                this.engagementCount = 0;
                this.retentionPromptShown = false;
                this.totalQuizAttempts = 0;
                this.totalQuizCorrect = 0;
                this.recentPerformance = [];
                this.consecutiveCorrect = 0;
                this.consecutiveIncorrect = 0;
                this.currentBatch = { size: 0, completed: 0, questions: [] };
                
                Object.keys(this.categoryStats).forEach(type => {
                    this.categoryStats[type].studied.clear();
                    this.categoryStats[type].quizAttempts = 0;
                    this.categoryStats[type].quizCorrect = 0;
                });
                
                this.applyFilters();
                this.showNotification('Progress reset successfully!', 'success');
            } catch (error) {
                console.error('Error resetting progress:', error);
                this.showNotification('Error resetting progress', 'error');
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#388e3c';
        
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${bgColor};
            color: white; padding: 15px 20px; border-radius: 10px;
            box-shadow: 0 4px 15px ${bgColor}33; z-index: 1001;
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

    // Filter functionality
    applyFilters() {
        try {
            this.currentDeck = getNextCards(50, this.activeFilters);
            this.currentCardIndex = 0;
            this.cardsStudied.clear();
            
            Object.keys(this.categoryStats).forEach(type => {
                this.categoryStats[type].studied.clear();
                this.categoryStats[type].quizAttempts = 0;
                this.categoryStats[type].quizCorrect = 0;
            });
            
            this.updateCard();
            this.updateEnhancedStats();
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }

    handleFilterChange(checkbox) {
        const filterId = checkbox.id;
        const isChecked = checkbox.checked;

        if (filterId === 'filterAll') {
            if (isChecked) {
                document.querySelectorAll('#dropdownMenu input[type="checkbox"]:not(#filterAll)').forEach(cb => {
                    cb.checked = false;
                });
                this.activeFilters = new Set(['all']);
            } else {
                this.activeFilters.delete('all');
            }
        } else {
            const filterAllCheckbox = document.getElementById('filterAll');
            if (filterAllCheckbox) filterAllCheckbox.checked = false;
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
                if (filterAllCheckbox) filterAllCheckbox.checked = true;
                this.activeFilters.add('all');
            }
        }

        this.resetEngagementTracking();
        this.applyFilters();
    }

    // ENHANCED: Reading toggle functionality with proper state management
    updateReadingToggleState() {
        const toggle = document.getElementById('quizReadingToggle');
        if (toggle) {
            toggle.checked = !this.readingsHidden;
            console.log('📖 Reading toggle state updated:', toggle.checked, 'readings hidden:', this.readingsHidden);
        }
    }

    toggleQuizReadings() {
        const readings = document.querySelectorAll('.quiz-option-reading');
        console.log('📖 Toggling readings, found elements:', readings.length);
        readings.forEach(reading => {
            if (this.readingsHidden) {
                reading.classList.add('hidden');
            } else {
                reading.classList.remove('hidden');
            }
        });
        console.log('📖 Quiz readings toggled:', this.readingsHidden ? 'hidden' : 'visible');
    }

    updateQuizModeButtons() {
        const buttons = document.querySelectorAll('.quiz-mode-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-mode') === this.currentQuizMode) {
                btn.classList.add('active');
            }
        });
    }

    // Engagement tracking
    resetEngagementTracking() {
        this.engagementCount = 0;
        this.retentionPromptShown = false;
    }

    showRetentionPrompt(reviewCount) {
        if (this.retentionPromptShown || reviewCount === 0) return;
        
        const promptElement = document.getElementById('retentionPrompt');
        const countElement = document.getElementById('reviewCount');
        
        if (promptElement && countElement) {
            countElement.textContent = reviewCount;
            promptElement.classList.add('show');
            this.retentionPromptShown = true;
            
            setTimeout(() => {
                promptElement.classList.add('fade-out');
                setTimeout(() => {
                    promptElement.classList.remove('show', 'fade-out');
                }, 500);
            }, 4000);
        }
    }

    // Statistics
    updateEnhancedStats() {
        try {
            const counts = getDueCounts(this.activeFilters);
            
            const statElements = {
                'statNew': counts.new,
                'statLearning': counts.learning,
                'statReview': counts.review,
                'statMastered': counts.mastered
            };
            
            Object.entries(statElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });

            const totalStudied = Object.keys(allFlashcards).filter(key => {
                const progress = getWordProgress(allFlashcards.find(c => c.japanese === key)?.japanese);
                return progress && progress.totalAttempts > 0;
            }).length;
            
            const totalMastered = counts.mastered;
            const masteryPercent = allFlashcards.length > 0 ? Math.round((totalMastered / allFlashcards.length) * 100) : 0;
            const quizAccuracy = this.totalQuizAttempts > 0 ? Math.round((this.totalQuizCorrect / this.totalQuizAttempts) * 100) : 0;

            const studiedElement = document.getElementById('cardsStudied');
            const progressElement = document.getElementById('progressPercent');
            const flipsElement = document.getElementById('timesFlipped');
            const accuracyElement = document.getElementById('quizAccuracy');

            if (studiedElement) studiedElement.textContent = this.cardsStudied.size;
            if (progressElement) progressElement.textContent = masteryPercent + '%';
            if (flipsElement) flipsElement.textContent = this.flipCount;
            if (accuracyElement) accuracyElement.textContent = quizAccuracy + '%';

        } catch (error) {
            console.error('Error updating enhanced stats:', error);
        }
    }

    toggleStats() {
        const statsElement = document.getElementById('stats');
        if (statsElement) {
            statsElement.classList.toggle('show');
            if (statsElement.classList.contains('show')) {
                this.updateDetailedStats();
                this.updateEnhancedStats();
            }
        }
    }

    updateDetailedStats() {
        const statsContainer = document.getElementById('detailedStats');
        if (!statsContainer) return;

        const categoryNames = {
            'noun': 'Nouns',
            'verb': 'Verbs', 
            'i-adjective': 'い-Adjectives',
            'na-adjective': 'な-Adjectives'
        };

        let html = '';
        
        for (const [type, name] of Object.entries(categoryNames)) {
            const totalInCategory = this.wordCounts[type] || 0;
            const stats = this.categoryStats[type] || { studied: new Set(), quizAttempts: 0, quizCorrect: 0 };
            const studiedCount = stats.studied.size;
            const quizAttempts = stats.quizAttempts;
            const quizCorrect = stats.quizCorrect;
            const quizIncorrect = quizAttempts - quizCorrect;
            
            const studiedPercent = totalInCategory > 0 ? (studiedCount / totalInCategory) * 100 : 0;
            const correctPercent = totalInCategory > 0 ? (quizCorrect / totalInCategory) * 100 : 0;
            const incorrectPercent = totalInCategory > 0 ? (quizIncorrect / totalInCategory) * 100 : 0;
            
            html += `
                <div class="category-stats">
                    <div class="category-header">
                        <span class="category-title">${name}</span>
                        <span class="category-numbers">${studiedCount}/${totalInCategory} studied • ${quizCorrect}/${quizAttempts} quiz</span>
                    </div>
                    <div class="stacked-progress-bar">
                        <div class="progress-segment studied-progress" style="width: ${studiedPercent}%"></div>
                        <div class="progress-segment quiz-correct" style="width: ${correctPercent}%"></div>
                        <div class="progress-segment quiz-incorrect" style="width: ${incorrectPercent}%"></div>
                    </div>
                </div>
            `;
        }
        
        statsContainer.innerHTML = html;
    }

    // Modal functions
    showLearningGuide() {
        const modal = document.getElementById('learningGuideModal');
        if (modal) {
            modal.style.display = 'block';
            this.keyboardListenerActive = false;
        }
    }

    hideLearningGuide() {
        const modal = document.getElementById('learningGuideModal');
        if (modal) {
            modal.style.display = 'none';
            this.keyboardListenerActive = true;
        }
    }

    showFeedback() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.style.display = 'block';
            this.keyboardListenerActive = false;
        }
    }

    hideFeedback() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.style.display = 'none';
            this.keyboardListenerActive = true;
        }
    }

    showDonate() {
        window.open('https://www.paypal.com/donate/?hosted_button_id=Q4BB3WF8LAHWG', '_blank');
    }

    submitFeedback(event) {
        event.preventDefault();
        
        this.showNotification('Thank you for your feedback!', 'success');
        this.hideFeedback();
        
        const form = event.target;
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
        }).catch(error => console.log('Feedback submission error:', error));
        
        form.reset();
    }

    // Event listener setup
    setupEventListeners() {
        document.getElementById('flipBtn')?.addEventListener('click', () => this.flipCard());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextCard());
        document.getElementById('previousBtn')?.addEventListener('click', () => this.previousCard());
        document.getElementById('shuffleBtn')?.addEventListener('click', () => this.shuffleCards());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetProgress());
        document.getElementById('statsBtn')?.addEventListener('click', () => this.toggleStats());
        
        document.getElementById('audioButton')?.addEventListener('click', (e) => this.handleAudioClick(e));
        document.getElementById('quizAudioButton')?.addEventListener('click', (e) => this.handleAudioClick(e));
        
        document.getElementById('learningGuideBtn')?.addEventListener('click', () => this.showLearningGuide());
        document.getElementById('feedbackBtn')?.addEventListener('click', () => this.showFeedback());
        document.getElementById('donateBtn')?.addEventListener('click', () => this.showDonate());
        
        document.getElementById('closeLearningGuideBtn')?.addEventListener('click', () => this.hideLearningGuide());
        document.getElementById('closeFeedbackBtn')?.addEventListener('click', () => this.hideFeedback());
        
        // ENHANCED: Reading toggle event listeners with improved state management
        const readingToggle = document.getElementById('quizReadingToggle');
        const readingToggleSwitch = document.getElementById('readingToggleSwitch');
        
        if (readingToggle && readingToggleSwitch) {
            readingToggle.addEventListener('change', (e) => {
                console.log('📖 Reading toggle event triggered, checked:', e.target.checked);
                this.readingsHidden = !e.target.checked;
                saveReadingToggle(this.readingsHidden);
                this.toggleQuizReadings();
                console.log('📖 Reading toggle state saved:', this.readingsHidden ? 'OFF' : 'ON');
            });

            readingToggleSwitch.addEventListener('click', (e) => {
                if (e.target !== readingToggle) {
                    e.preventDefault();
                    readingToggle.checked = !readingToggle.checked;
                    readingToggle.dispatchEvent(new Event('change'));
                }
            });
            
            console.log('📖 Reading toggle event listeners attached successfully');
        } else {
            console.error('📖 Reading toggle elements not found!');
        }
        
        document.getElementById('flashcard')?.addEventListener('click', () => this.flipCard());
        
        document.addEventListener('keydown', (event) => this.handleKeyboard(event));
        
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.handleTabSwitch(button));
        });
        
        document.querySelectorAll('.quiz-mode-btn').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                console.log(`🎯 Quiz mode button clicked: ${mode}`);
                this.setQuizMode(mode);
            });
        });
        
        this.initializeHamburgerMenu();
        
        document.addEventListener('click', (event) => this.handleModalClicks(event));
        
        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', (event) => this.submitFeedback(event));
        }
        
        console.log('🔧 All event listeners set up');
    }

    handleAudioClick(event) {
        event.stopPropagation();
        const card = this.safeGetCard(this.currentCardIndex);
        if (card) {
            playCardAudio(card.japanese);
        }
    }

    handleKeyboard(event) {
        if (!this.keyboardListenerActive) return;
        
        const activeElement = document.activeElement;
        const isFormElement = activeElement && (
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.tagName === 'INPUT' || 
            activeElement.contentEditable === 'true'
        );
        
        if (isFormElement) return;

        switch(event.key) {
            case ' ':
            case 'Enter':
                event.preventDefault();
                if (this.currentMode === 'study') {
                    this.flipCard();
                } else {
                    this.nextCard();
                }
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.previousCard();
                break;
            case 'ArrowRight':
                event.preventDefault();
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
                    if (options[optionIndex]) {
                        options[optionIndex].click();
                    }
                }
                break;
        }
    }

    initializeHamburgerMenu() {
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const dropdownMenu = document.getElementById('dropdownMenu');

        if (!hamburgerMenu || !dropdownMenu) {
            console.error('Hamburger menu elements not found');
            return;
        }

        hamburgerMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerMenu.classList.toggle('active');
            dropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && !hamburgerMenu.contains(e.target)) {
                hamburgerMenu.classList.remove('active');
                dropdownMenu.classList.remove('active');
            }
        });

        const filterOptions = document.querySelectorAll('.filter-option');
        filterOptions.forEach(option => {
            const checkbox = option.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            
            option.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    e.preventDefault();
                    checkbox.checked = !checkbox.checked;
                    this.handleFilterChange(checkbox);
                }
            });
            
            checkbox.addEventListener('change', () => this.handleFilterChange(checkbox));
        });
    }

    handleModalClicks(event) {
        const learningGuideModal = document.getElementById('learningGuideModal');
        const feedbackModal = document.getElementById('feedbackModal');
        
        if (event.target === learningGuideModal) {
            this.hideLearningGuide();
        }
        
        if (event.target === feedbackModal) {
            this.hideFeedback();
        }
    }
}

// Initialize the app when DOM is ready
const app = new JLPTApp();
window.jlptApp = app;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Make key methods globally available for backward compatibility
window.flipCard = () => window.jlptApp.flipCard();
window.nextCard = () => window.jlptApp.nextCard();
window.previousCard = () => window.jlptApp.previousCard();
window.shuffleCards = () => window.jlptApp.shuffleCards();
window.resetProgress = () => window.jlptApp.resetProgress();
window.toggleStats = () => window.jlptApp.toggleStats();
window.showFeedbackForm = () => window.jlptApp.showFeedback();
window.hideFeedbackForm = () => window.jlptApp.hideFeedback();
window.showDonateInfo = () => window.jlptApp.showDonate();
window.submitFeedback = (event) => window.jlptApp.submitFeedback(event);
window.playAudio = (event) => window.jlptApp.handleAudioClick(event);

export { app as default };