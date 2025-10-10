// assets/js/ui/UIManager.js
console.log('📦 UIManager.js loading...');

import { CardRenderer } from './CardRenderer.js';
import { NotificationManager } from './NotificationManager.js';
import { ModalManager } from './ModalManager.js';
import { StatsUpdater } from './StatsUpdater.js';
import { FilterManager } from './FilterManager.js';
import { QuizRenderer } from './QuizRenderer.js';

export class UIManager {
    constructor(appState, stateManager, audio, vocabulary, particleQuiz) {
        console.log('✅ UIManager constructor');
        
        // Core dependencies
        this.state = appState;
        this.stateManager = stateManager;
        this.audio = audio;
        this.vocabulary = vocabulary;
        this.particleQuiz = particleQuiz;
        
        // Initialize sub-managers
        this.cardRenderer = new CardRenderer();
        this.notifier = new NotificationManager();
        this.modalManager = new ModalManager(appState);
        this.statsUpdater = new StatsUpdater(appState);
        this.filterManager = new FilterManager(appState, stateManager, vocabulary, this.notifier,
            () => {this.renderCurrentCard(); this.updateAll();}, this.particleQuiz
        );
        this.quizRenderer = new QuizRenderer(appState, stateManager, audio, vocabulary, particleQuiz, this.notifier,
            () => {this.renderCurrentCard(); this.updateAll();}
        );
        
        // Initialize UI
        this.initializeTabs();
        this.initializeQuizModes();
        this.initializeKanaToggle();
    }
    
    // ========================================
    // TAB SYSTEM
    // ========================================
    
    initializeTabs() {
        console.log('🔧 Setting up tabs...');
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }
    
    switchTab(tabId) {
        console.log(`🔀 Switching to ${tabId} tab`);
        
        document.querySelectorAll('.tab-button').forEach(btn => 
            btn.classList.remove('active')
        );
        document.querySelectorAll('.tab-content').forEach(content => 
            content.classList.remove('active')
        );
        
        const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId + 'Tab');
        
        if (activeButton) activeButton.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        this.stateManager.setMode(tabId);
        
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) {
            flipBtn.textContent = tabId === 'study' ? 'Flip Card' : 'Next Quiz';
        }
        
        this.renderCurrentCard();
        this.updateKanaToggleVisibility();
    }
    
    // ========================================
    // QUIZ MODE SELECTOR - FIXED
    // ========================================
    
    initializeQuizModes() {
        console.log('🔧 Setting up quiz modes...');
        
        document.querySelectorAll('.quiz-mode-btn').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                this.switchQuizMode(mode);
            });
        });
    }
    
    switchQuizMode(mode) {
        console.log(`🧠 Switching to quiz mode: ${mode}`);
        
        document.querySelectorAll('.quiz-mode-btn').forEach(btn => 
            btn.classList.remove('active')
        );
        
        const activeButton = document.querySelector(`[data-mode="${mode}"]`);
        if (activeButton) activeButton.classList.add('active');
        
        this.state.set('currentQuizMode', mode);
        this.updateKanaToggleVisibility();
        
        // FIXED: Always re-render when switching modes in quiz tab
        if (this.state.get('currentMode') === 'quiz') {
            console.log('🔄 Switching mode - rendering new quiz type');
            this.state.set('quizAnswered', false); // Reset answered state
            this.renderCurrentCard(); // Re-render with new mode
        }
    }
    
    // ========================================
    // KANA TOGGLE
    // ========================================
    
    initializeKanaToggle() {
        console.log('🔧 Setting up kana toggle...');
        
        const kanaToggleInput = document.getElementById('kanaToggleInput');
        const kanaToggleContainer = document.getElementById('kanaToggleContainer');
        const kanaToggleLabel = document.getElementById('kanaToggleLabel');
        
        if (!kanaToggleInput || !kanaToggleContainer) {
            console.warn('⚠️ Kana toggle elements not found');
            return;
        }
        
        kanaToggleInput.checked = this.state.get('kanaMode') || false;
        
        // Handle checkbox change
        kanaToggleInput.addEventListener('change', (e) => {
            const newValue = e.target.checked;
            console.log('🔤 Kana toggle changed:', newValue);
            this.handleKanaToggle(newValue);
        });
        
        // Handle container clicks
        kanaToggleContainer.addEventListener('click', (e) => {
            if (e.target === kanaToggleInput || e.target === kanaToggleLabel) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            kanaToggleInput.checked = !kanaToggleInput.checked;
            this.handleKanaToggle(kanaToggleInput.checked);
        });
        
        console.log('✅ Kana toggle initialized');
    }
    
    handleKanaToggle(newValue) {
        this.state.set('kanaMode', newValue);
        
        if (this.state.get('currentMode') === 'quiz') {
            this.quizRenderer.updateQuizReadingVisibility(newValue);
        }
    }
    
    updateKanaToggleVisibility() {
        const kanaToggleContainer = document.getElementById('kanaToggleContainer');
        if (!kanaToggleContainer) return;
        
        const mode = this.state.get('currentMode');
        const quizMode = this.state.get('currentQuizMode');
        
        // Hide toggle for listening-first, particle-quiz, AND kanji-only
        if (mode === 'quiz' && 
            quizMode !== 'listening-first' && 
            quizMode !== 'particle-quiz' && 
            quizMode !== 'kanji-only') {
            kanaToggleContainer.classList.remove('hidden');
            kanaToggleContainer.style.display = 'flex';
        } else {
            kanaToggleContainer.classList.add('hidden');
            kanaToggleContainer.style.display = 'none';
        }
    }
    
    // ========================================
    // CARD RENDERING (Delegation)
    // ========================================
    
    renderCurrentCard() {
    const card = this.stateManager.getCurrentCard();
    const mode = this.state.get('currentMode');
    
    if (!card) {
        console.error('❌ No card to render');
        return;
    }
    
    if (mode === 'study') {
        const isFlipped = this.state.get('isFlipped');
        
        // ✅ FIX: Pass spacedRepetition to the renderer
        const spacedRepetition = window.jlptApp?.spacedRepetition || null;
        this.cardRenderer.render(card, isFlipped, spacedRepetition);
        
        console.log('✅ Study card rendered:', card.japanese);
    } else {
        this.quizRenderer.render(card);
    }
    
    this.statsUpdater.updateCardCounter();
    }
    
    // ========================================
    // UI UPDATES (Delegation)
    // ========================================
    
    updateAll() {
        this.statsUpdater.updateAll();
        this.filterManager.updateWordCountBadges();
    }
    
    // ========================================
    // PUBLIC API (Delegation to sub-managers)
    // ========================================
    
    // Filter operations
    applyFiltersAndRender() {
        this.renderCurrentCard();
        this.updateAll();
    }
    
    handleLevelChange(level) {
        const success = this.filterManager.handleLevelChange(level);
        if (success) {
            this.renderCurrentCard();
            this.updateAll();
        }
    }
    
    // Stats operations
    toggleStats() {
        this.statsUpdater.toggleStats();
    }
    
    // Modal operations
    showModal(type) {
        this.modalManager.show(type);
    }
    
    hideModal(type) {
        this.modalManager.hide(type);
    }
    
    showDonateInfo() {
        this.modalManager.showDonateInfo();
    }
    
    submitFeedback(event) {
        this.modalManager.submitFeedback(event, this.notifier);
    }
    
    // Notification operations
    showNotification(message, type = 'info') {
        this.notifier.show(message, type);
    }
}

console.log('✅ UIManager.js loaded');