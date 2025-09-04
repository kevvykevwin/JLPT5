// assets/js/core/spacedRepetition.js - FIXED Spaced Repetition Algorithm

import { allFlashcards } from './vocabulary.js';

// Learning interval constants (in milliseconds)
export const LEARNING_INTERVALS = {
    'new': 0,
    'learning_1': 30 * 60 * 1000,        // 30 minutes
    'learning_2': 24 * 60 * 60 * 1000,   // 1 day
    'review_1': 3 * 24 * 60 * 60 * 1000, // 3 days
    'review_2': 7 * 24 * 60 * 60 * 1000, // 7 days
    'mastered': 14 * 24 * 60 * 60 * 1000 // 14 days
};

// State progression rules
export const STATE_PROGRESSIONS = {
    'new': { correct: 'learning_1', incorrect: 'new' },
    'learning_1': { correct: 'learning_2', incorrect: 'new' },
    'learning_2': { correct: 'review_1', incorrect: 'learning_1' },
    'review_1': { correct: 'review_2', incorrect: 'learning_1' },
    'review_2': { correct: 'mastered', incorrect: 'learning_1' },
    'mastered': { correct: 'mastered', incorrect: 'review_1' }
};

// Global word progress storage
let wordProgress = {};

/**
 * MISSING FUNCTION - Initialize spaced repetition system
 */
export function initializeSpacedRepetition() {
    return initializeWordProgress();
}

/**
 * Initialize word progress with proper error handling
 */
export function initializeWordProgress() {
    try {
        const saved = localStorage.getItem('jlpt-word-progress');
        if (saved) {
            wordProgress = JSON.parse(saved);
            
            // Validate and clean up invalid entries
            const validKeys = allFlashcards.map(card => card.japanese);
            Object.keys(wordProgress).forEach(key => {
                if (!validKeys.includes(key)) {
                    console.warn(`Removing invalid progress key: ${key}`);
                    delete wordProgress[key];
                }
            });
        } else {
            wordProgress = {};
        }
    } catch (error) {
        console.error('Error loading word progress:', error);
        wordProgress = {};
    }
    
    // Initialize missing entries
    allFlashcards.forEach((card, index) => {
        if (!wordProgress[card.japanese]) {
            wordProgress[card.japanese] = createNewWordProgress(index);
        }
    });
    
    saveWordProgress();
    console.log(`✅ Word progress initialized: ${Object.keys(wordProgress).length} entries`);
    return Promise.resolve(); // Return promise for async compatibility
}

/**
 * Create new word progress entry
 */
function createNewWordProgress(cardIndex) {
    return {
        state: 'new',
        lastReviewed: null,
        nextReview: Date.now(),
        correctStreak: 0,
        totalAttempts: 0,
        correctAttempts: 0,
        created: Date.now(),
        cardIndex: cardIndex
    };
}

/**
 * Save word progress to localStorage
 */
export function saveWordProgress() {
    try {
        localStorage.setItem('jlpt-word-progress', JSON.stringify(wordProgress));
    } catch (error) {
        console.error('Error saving word progress:', error);
    }
}

/**
 * Update word progress based on user performance
 */
export function updateWordProgress(japanese, isCorrect) {
    const progress = wordProgress[japanese];
    if (!progress) {
        console.warn(`No progress found for: ${japanese}`);
        return;
    }

    const now = Date.now();
    progress.lastReviewed = now;
    progress.totalAttempts++;
    
    if (isCorrect) {
        progress.correctAttempts++;
        progress.correctStreak++;
    } else {
        progress.correctStreak = 0;
    }

    // Determine next state
    const currentState = progress.state;
    const nextState = STATE_PROGRESSIONS[currentState][isCorrect ? 'correct' : 'incorrect'];
    progress.state = nextState;

    // Calculate next review time
    const interval = LEARNING_INTERVALS[nextState] || LEARNING_INTERVALS['new'];
    progress.nextReview = now + interval;

    saveWordProgress();
    
    console.log(`Updated ${japanese}: ${currentState} → ${nextState} (next review: ${new Date(progress.nextReview).toLocaleString()})`);
}

/**
 * Get next batch of cards for study using spaced repetition algorithm
 */
export function getNextCards(count = 50, activeFilters = new Set(['all'])) {
    const now = Date.now();
    let filteredCards = allFlashcards.slice();
    
    // Apply type filters
    if (!activeFilters.has('all')) {
        filteredCards = filteredCards.filter(card => activeFilters.has(card.type));
    }

    if (filteredCards.length === 0) {
        console.warn('No cards match current filters, falling back to all cards');
        filteredCards = allFlashcards.slice();
    }

    const dueCards = [];
    const newCards = [];
    const futureCards = [];

    filteredCards.forEach(card => {
        const progress = wordProgress[card.japanese];
        if (!progress) return;

        if (progress.nextReview <= now) {
            dueCards.push(card);
        } else if (progress.state === 'new' && progress.totalAttempts === 0) {
            newCards.push(card);
        } else {
            futureCards.push(card);
        }
    });

    // Shuffle each category
    const shuffledDueCards = interleavedShuffle(dueCards);
    const shuffledNewCards = interleavedShuffle(newCards);
    const shuffledFutureCards = interleavedShuffle(futureCards);

    let result = [];
    
    // Prioritize due cards (60% of deck)
    if (shuffledDueCards.length > 0) {
        result.push(...shuffledDueCards.slice(0, Math.min(count * 0.6, shuffledDueCards.length)));
    }
    
    // Add new cards to fill remaining slots
    if (result.length < count && shuffledNewCards.length > 0) {
        const needed = count - result.length;
        result.push(...shuffledNewCards.slice(0, Math.min(needed, shuffledNewCards.length)));
    }
    
    // Fill any remaining slots with future cards
    if (result.length < count && shuffledFutureCards.length > 0) {
        const needed = count - result.length;
        result.push(...shuffledFutureCards.slice(0, needed));
    }

    // Final shuffle while maintaining type distribution
    result = interleavedShuffle(result);

    // Add metadata
    const reviewCardsInDeck = result.filter(card => {
        const progress = wordProgress[card.japanese];
        return progress && progress.nextReview <= now;
    }).length;

    result.reviewCardCount = reviewCardsInDeck;

    console.log(`📋 Generated deck: ${result.length} cards (${reviewCardsInDeck} due for review)`);
    
    return result.length > 0 ? result : interleavedShuffle(filteredCards.slice(0, count));
}

/**
 * Interleaved shuffle to maintain type diversity
 */
function interleavedShuffle(array) {
    if (!array || array.length <= 1) return array.slice();
    
    const cardsByType = {
        noun: [],
        verb: [],
        'i-adjective': [],
        'na-adjective': []
    };
    
    // Group by type
    array.forEach(card => {
        if (cardsByType[card.type]) {
            cardsByType[card.type].push(card);
        }
    });
    
    // Shuffle each type
    Object.keys(cardsByType).forEach(type => {
        cardsByType[type] = shuffleArray(cardsByType[type]);
    });
    
    // Interleave types
    const result = [];
    const typeKeys = Object.keys(cardsByType).filter(type => cardsByType[type].length > 0);
    
    if (typeKeys.length === 0) return shuffleArray(array);
    
    let typeIndex = 0;
    while (result.length < array.length) {
        const currentType = typeKeys[typeIndex % typeKeys.length];
        if (cardsByType[currentType].length > 0) {
            result.push(cardsByType[currentType].shift());
        }
        
        // Remove empty types
        if (cardsByType[currentType].length === 0) {
            typeKeys.splice(typeKeys.indexOf(currentType), 1);
            if (typeKeys.length === 0) break;
        }
        
        typeIndex++;
    }
    
    // Light shuffle to avoid predictability
    const lightShuffled = [...result];
    const swapCount = Math.max(1, Math.floor(array.length * 0.15));
    
    for (let i = 0; i < swapCount; i++) {
        const pos1 = Math.floor(Math.random() * lightShuffled.length);
        const pos2 = Math.floor(Math.random() * lightShuffled.length);
        [lightShuffled[pos1], lightShuffled[pos2]] = [lightShuffled[pos2], lightShuffled[pos1]];
    }
    
    return lightShuffled;
}

/**
 * Standard array shuffle
 */
function shuffleArray(array) {
    if (!array || array.length === 0) return [];
    
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Get learning state counts for statistics
 */
export function getDueCounts(activeFilters = new Set(['all'])) {
    const now = Date.now();
    const counts = { new: 0, learning: 0, review: 0, mastered: 0 };

    let filteredCards = allFlashcards;
    if (!activeFilters.has('all')) {
        filteredCards = allFlashcards.filter(card => activeFilters.has(card.type));
    }

    filteredCards.forEach(card => {
        const progress = wordProgress[card.japanese];
        if (!progress) return;

        if (progress.state === 'new') {
            counts.new++;
        } else if (progress.state.includes('learning')) {
            counts.learning++;
        } else if (progress.state.includes('review')) {
            counts.review++;
        } else if (progress.state === 'mastered') {
            counts.mastered++;
        }
    });

    return counts;
}

/**
 * Get word progress for a specific card
 */
export function getWordProgress(japanese) {
    return wordProgress[japanese] || null;
}

/**
 * Get all word progress data (for debugging/export)
 */
export function getAllWordProgress() {
    return { ...wordProgress };
}

/**
 * Reset all progress (for development/testing)
 */
export function resetAllProgress() {
    wordProgress = {};
    allFlashcards.forEach((card, index) => {
        wordProgress[card.japanese] = createNewWordProgress(index);
    });
    saveWordProgress();
    console.log('✅ All progress reset to initial state');
}

/**
 * Export progress data
 */
export function exportProgress() {
    return JSON.stringify(wordProgress, null, 2);
}

/**
 * Import progress data
 */
export function importProgress(jsonData) {
    try {
        const importedProgress = JSON.parse(jsonData);
        wordProgress = importedProgress;
        saveWordProgress();
        console.log('✅ Progress imported successfully');
        return true;
    } catch (error) {
        console.error('❌ Error importing progress:', error);
        return false;
    }
}