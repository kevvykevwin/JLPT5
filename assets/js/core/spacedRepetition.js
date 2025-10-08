// assets/js/core/spacedRepetition.js

export const LEARNING_INTERVALS = {
    'new': 0,
    'learning_1': 30 * 60 * 1000,        // 30 minutes
    'learning_2': 24 * 60 * 60 * 1000,   // 1 day
    'review_1': 3 * 24 * 60 * 60 * 1000, // 3 days
    'review_2': 7 * 24 * 60 * 60 * 1000, // 1 week
    'mastered': 14 * 24 * 60 * 60 * 1000 // 2 weeks
};

export const STATE_PROGRESSIONS = {
    'new': { correct: 'learning_1', incorrect: 'new' },
    'learning_1': { correct: 'learning_2', incorrect: 'new' },
    'learning_2': { correct: 'review_1', incorrect: 'learning_1' },
    'review_1': { correct: 'review_2', incorrect: 'learning_1' },
    'review_2': { correct: 'mastered', incorrect: 'learning_1' },
    'mastered': { correct: 'mastered', incorrect: 'review_1' }
};

export const LEARNING_STATE_CONFIG = {
    'new': {
        name: 'New',
        color: '#2196f3',
        indicator: 'N',
        description: 'Words you haven\'t studied yet'
    },
    'learning_1': {
        name: 'Learning',
        color: '#ff9800',
        indicator: 'L',
        description: 'Words you\'re currently learning'
    },
    'learning_2': {
        name: 'Learning',
        color: '#ff9800',
        indicator: 'L',
        description: 'Words you\'re currently learning'
    },
    'review_1': {
        name: 'Review',
        color: '#9c27b0',
        indicator: 'R',
        description: 'Words ready for review'
    },
    'review_2': {
        name: 'Review',
        color: '#9c27b0',
        indicator: 'R',
        description: 'Words ready for review'
    },
    'mastered': {
        name: 'Mastered',
        color: '#4caf50',
        indicator: 'M',
        description: 'Words you\'ve mastered'
    }
};

export class SpacedRepetitionManager {
    constructor(storageManager, vocabularyManager) {
        this.storage = storageManager;
        this.vocabulary = vocabularyManager;
        this.wordProgress = {};
        this.isInitialized = false;
    }
    async initialize() {
        return new Promise((resolve) => {
            this.wordProgress = this.storage.initializeWordProgress(this.vocabulary.getAllWords());
            this.isInitialized = true;
            resolve();
        });
    }
    initialize() {
        this.wordProgress = this.storage.initializeWordProgress(this.vocabulary.getAllWords());
    }

    updateWordProgress(japanese, isCorrect) {
        const progress = this.wordProgress[japanese];
        if (!progress) {
            console.warn(`No progress found for: ${japanese}`);
            return false;
        }

        const now = Date.now();
        const updates = {
            lastReviewed: now,
            totalAttempts: (progress.totalAttempts || 0) + 1
        };

        if (isCorrect) {
            updates.correctAttempts = (progress.correctAttempts || 0) + 1;
            updates.correctStreak = (progress.correctStreak || 0) + 1;
        } else {
            updates.correctStreak = 0;
        }

        const currentState = progress.state || 'new';
        const nextState = STATE_PROGRESSIONS[currentState][isCorrect ? 'correct' : 'incorrect'];
        updates.state = nextState;

        const interval = LEARNING_INTERVALS[nextState] || LEARNING_INTERVALS['new'];
        updates.nextReview = now + interval;

        // Update local copy
        this.wordProgress[japanese] = { ...progress, ...updates };

        // Save to storage
        return this.storage.updateWordProgress(japanese, updates);
    }

    getDueCounts(filteredWords = null) {
        const now = Date.now();
        const words = filteredWords || this.vocabulary.getAllWords();
        const counts = { new: 0, learning: 0, review: 0, mastered: 0 };

        words.forEach(word => {
            const progress = this.wordProgress[word.japanese];
            if (!progress) return;

            const state = progress.state || 'new';
            if (state === 'new') {
                counts.new++;
            } else if (state.includes('learning')) {
                counts.learning++;
            } else if (state.includes('review')) {
                counts.review++;
            } else if (state === 'mastered') {
                counts.mastered++;
            }
        });

        return counts;
    }

    getDueWords(filteredWords = null, now = Date.now()) {
        const words = filteredWords || this.vocabulary.getAllWords();
        
        return words.filter(word => {
            const progress = this.wordProgress[word.japanese];
            if (!progress) return true; // New words are always "due"
            
            return progress.nextReview <= now;
        });
    }

    getNewWords(filteredWords = null, limit = 10) {
        const words = filteredWords || this.vocabulary.getAllWords();
        
        return words
            .filter(word => {
                const progress = this.wordProgress[word.japanese];
                return !progress || (progress.state === 'new' && progress.totalAttempts === 0);
            })
            .slice(0, limit);
    }

    getNextCards(count = 50, activeFilters = ['all']) {
        const now = Date.now();
        let filteredWords = this.vocabulary.filterByTypes(activeFilters);
        
        if (filteredWords.length === 0) {
            console.warn('No words match current filters, using all words');
            filteredWords = this.vocabulary.getAllWords();
        }

        const dueWords = [];
        const newWords = [];
        const futureWords = [];

        filteredWords.forEach(word => {
            const progress = this.wordProgress[word.japanese];
            if (!progress) {
                newWords.push(word);
                return;
            }

            if (progress.nextReview <= now) {
                dueWords.push(word);
            } else if (progress.state === 'new' && progress.totalAttempts === 0) {
                newWords.push(word);
            } else {
                futureWords.push(word);
            }
        });

        // Prioritize due cards, then new cards, then future cards
        let result = [];
        
        // Add due cards (up to 60% of deck)
        if (dueWords.length > 0) {
            const dueShuffled = this.vocabulary.interleavedShuffle(dueWords);
            result.push(...dueShuffled.slice(0, Math.min(count * 0.6, dueWords.length)));
        }
        
        // Add new cards to fill remaining slots
        if (result.length < count && newWords.length > 0) {
            const needed = count - result.length;
            const newShuffled = this.vocabulary.interleavedShuffle(newWords);
            result.push(...newShuffled.slice(0, Math.min(needed, newWords.length)));
        }
        
        // Fill any remaining slots with future cards
        if (result.length < count && futureWords.length > 0) {
            const needed = count - result.length;
            const futureShuffled = this.vocabulary.interleavedShuffle(futureWords);
            result.push(...futureShuffled.slice(0, needed));
        }

        // Final shuffle while maintaining some type distribution
        result = this.vocabulary.interleavedShuffle(result);

        // Add metadata for UI feedback
        const reviewCardsCount = result.filter(word => {
            const progress = this.wordProgress[word.japanese];
            return progress && progress.nextReview <= now;
        }).length;

        result.reviewCardCount = reviewCardsCount;
        result.dueCardsCount = dueWords.length;
        result.newCardsCount = newWords.length;

        return result.length > 0 ? result : this.vocabulary.interleavedShuffle(filteredWords.slice(0, count));
    }

    getWordState(japanese) {
        const progress = this.wordProgress[japanese];
        if (!progress) return 'new';
        return progress.state || 'new';
    }

    getWordStateConfig(japanese) {
        const state = this.getWordState(japanese);
        return LEARNING_STATE_CONFIG[state] || LEARNING_STATE_CONFIG['new'];
    }

    getStudyStats() {
        const stats = {
            totalWords: 0,
            studiedWords: 0,
            masteredWords: 0,
            averageAccuracy: 0,
            totalStudyTime: 0,
            longestStreak: 0,
            currentStreak: 0
        };

        const allProgress = Object.values(this.wordProgress);
        stats.totalWords = allProgress.length;

        let totalAttempts = 0;
        let totalCorrect = 0;
        let currentStreakCount = 0;

        allProgress.forEach(progress => {
            if (progress.totalAttempts > 0) {
                stats.studiedWords++;
                totalAttempts += progress.totalAttempts;
                totalCorrect += progress.correctAttempts || 0;
                
                if (progress.state === 'mastered') {
                    stats.masteredWords++;
                }

                stats.longestStreak = Math.max(stats.longestStreak, progress.correctStreak || 0);
                
                if ((progress.correctStreak || 0) > 0) {
                    currentStreakCount++;
                }
            }
        });

        stats.averageAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
        stats.currentStreak = currentStreakCount;

        return stats;
    }

    getRetentionRate(days = 7) {
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        let recentReviews = 0;
        let correctReviews = 0;

        Object.values(this.wordProgress).forEach(progress => {
            if (progress.lastReviewed && progress.lastReviewed > cutoffTime) {
                recentReviews++;
                if (progress.correctStreak > 0) {
                    correctReviews++;
                }
            }
        });

        return recentReviews > 0 ? Math.round((correctReviews / recentReviews) * 100) : 0;
    }

    getPredictedMastery(japanese) {
        const progress = this.wordProgress[japanese];
        if (!progress || progress.totalAttempts === 0) {
            return { confidence: 0, estimatedDays: null };
        }

        const accuracy = progress.correctAttempts / progress.totalAttempts;
        const state = progress.state || 'new';
        
        if (state === 'mastered') {
            return { confidence: 100, estimatedDays: 0 };
        }

        // Simple prediction based on current accuracy and state
        let estimatedDays = 30; // Default estimate
        
        switch (state) {
            case 'new':
                estimatedDays = accuracy > 0.8 ? 7 : 14;
                break;
            case 'learning_1':
                estimatedDays = accuracy > 0.7 ? 5 : 10;
                break;
            case 'learning_2':
                estimatedDays = accuracy > 0.8 ? 3 : 7;
                break;
            case 'review_1':
                estimatedDays = accuracy > 0.9 ? 2 : 5;
                break;
            case 'review_2':
                estimatedDays = accuracy > 0.9 ? 1 : 3;
                break;
        }

        const confidence = Math.min(100, Math.round(accuracy * 100));
        
        return { confidence, estimatedDays };
    }

    resetWordProgress(japanese) {
        if (this.wordProgress[japanese]) {
            const reset = {
                state: 'new',
                lastReviewed: null,
                nextReview: Date.now(),
                correctStreak: 0,
                totalAttempts: 0,
                correctAttempts: 0
            };
            
            this.wordProgress[japanese] = { ...this.wordProgress[japanese], ...reset };
            return this.storage.updateWordProgress(japanese, reset);
        }
        return false;
    }

    resetAllProgress() {
        const allWords = this.vocabulary.getAllWords();
        const resetProgress = {};
        
        allWords.forEach((word, index) => {
            resetProgress[word.japanese] = {
                state: 'new',
                lastReviewed: null,
                nextReview: Date.now(),
                correctStreak: 0,
                totalAttempts: 0,
                correctAttempts: 0,
                created: Date.now(),
                cardIndex: index
            };
        });

        this.wordProgress = resetProgress;
        return this.storage.saveWordProgress(resetProgress);
    }

    exportProgress() {
        return {
            wordProgress: this.wordProgress,
            intervals: LEARNING_INTERVALS,
            stateProgressions: STATE_PROGRESSIONS,
            exportDate: new Date().toISOString()
        };
    }

    importProgress(data) {
        if (data.wordProgress) {
            this.wordProgress = data.wordProgress;
            return this.storage.saveWordProgress(data.wordProgress);
        }
        return false;
    }
}