// assets/js/core/storage.js - Streamlined Storage Management

export class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            WORD_PROGRESS: 'jlpt-word-progress',
            USER_PREFERENCES: 'jlpt-user-preferences',
            CATEGORY_STATS: 'jlpt-category-stats'
        };
        
        this.defaultProgress = {
            state: 'new',
            lastReviewed: null,
            nextReview: Date.now(),
            correctStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
            created: Date.now()
        };
        
        this.defaultPreferences = {
            currentLevel: 'N5',
            readingsHidden: false,
            kanaMode: false,
            audioEnabled: true,
            quizMode: 'multiple-choice',
            studyMode: 'adaptive'
        };
    }

    // Word Progress Management
    getWordProgress() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEYS.WORD_PROGRESS);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading word progress:', error);
            return {};
        }
    }

    saveWordProgress(progress) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(progress));
            return true;
        } catch (error) {
            console.error('Error saving word progress:', error);
            return false;
        }
    }

    initializeWordProgress(vocabularyWords) {
        const currentProgress = this.getWordProgress();
        let hasChanges = false;

        vocabularyWords.forEach((word, index) => {
            if (!currentProgress[word.japanese]) {
                currentProgress[word.japanese] = {
                    ...this.defaultProgress,
                    cardIndex: index
                };
                hasChanges = true;
            }
        });

        // Clean up invalid entries
        const validWords = new Set(vocabularyWords.map(w => w.japanese));
        Object.keys(currentProgress).forEach(japanese => {
            if (!validWords.has(japanese)) {
                delete currentProgress[japanese];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveWordProgress(currentProgress);
        }

        return currentProgress;
    }

    updateWordProgress(japanese, updates) {
        const currentProgress = this.getWordProgress();
        
        if (!currentProgress[japanese]) {
            currentProgress[japanese] = { ...this.defaultProgress };
        }

        currentProgress[japanese] = {
            ...currentProgress[japanese],
            ...updates,
            lastReviewed: Date.now()
        };

        return this.saveWordProgress(currentProgress);
    }

    getWordProgressStats() {
        const progress = this.getWordProgress();
        const stats = {
            total: 0,
            new: 0,
            learning: 0,
            review: 0,
            mastered: 0,
            totalAttempts: 0,
            correctAttempts: 0
        };

        Object.values(progress).forEach(wordProgress => {
            stats.total++;
            stats.totalAttempts += wordProgress.totalAttempts || 0;
            stats.correctAttempts += wordProgress.correctAttempts || 0;

            const state = wordProgress.state || 'new';
            if (state === 'new') {
                stats.new++;
            } else if (state.includes('learning')) {
                stats.learning++;
            } else if (state.includes('review')) {
                stats.review++;
            } else if (state === 'mastered') {
                stats.mastered++;
            }
        });

        return stats;
    }

    // User Preferences Management
    getUserPreferences() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES);
            return saved ? { ...this.defaultPreferences, ...JSON.parse(saved) } : { ...this.defaultPreferences };
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return { ...this.defaultPreferences };
        }
    }

    setUserPreference(key, value) {
        try {
            const preferences = this.getUserPreferences();
            preferences[key] = value;
            localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
            return true;
        } catch (error) {
            console.error('Error saving user preference:', error);
            return false;
        }
    }

    getUserPreference(key, defaultValue = null) {
        const preferences = this.getUserPreferences();
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    }

    // Backward Compatibility Methods
    getReadingToggle() {
        return this.getUserPreference('readingsHidden', false);
    }

    setReadingToggle(hidden) {
        return this.setUserPreference('readingsHidden', hidden);
    }

    // Category Statistics Management
    getCategoryStats() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEYS.CATEGORY_STATS);
            return saved ? JSON.parse(saved) : this.getDefaultCategoryStats();
        } catch (error) {
            console.error('Error loading category stats:', error);
            return this.getDefaultCategoryStats();
        }
    }

    saveCategoryStats(stats) {
        try {
            // Convert Sets to Arrays for JSON serialization
            const serializable = {};
            Object.keys(stats).forEach(category => {
                serializable[category] = {
                    ...stats[category],
                    studied: Array.from(stats[category].studied || [])
                };
            });
            
            localStorage.setItem(this.STORAGE_KEYS.CATEGORY_STATS, JSON.stringify(serializable));
            return true;
        } catch (error) {
            console.error('Error saving category stats:', error);
            return false;
        }
    }

    loadCategoryStats() {
        const stats = this.getCategoryStats();
        
        // Convert Arrays back to Sets
        Object.keys(stats).forEach(category => {
            if (Array.isArray(stats[category].studied)) {
                stats[category].studied = new Set(stats[category].studied);
            } else {
                stats[category].studied = new Set();
            }
        });
        
        return stats;
    }

    getDefaultCategoryStats() {
        return {
            'noun': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 },
            'verb': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 },
            'i-adjective': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 },
            'na-adjective': { studied: new Set(), quizAttempts: 0, quizCorrect: 0 }
        };
    }

    updateCategoryStats(category, updates) {
        const stats = this.loadCategoryStats();
        
        if (!stats[category]) {
            stats[category] = { studied: new Set(), quizAttempts: 0, quizCorrect: 0 };
        }

        Object.keys(updates).forEach(key => {
            if (key === 'studied' && typeof updates[key] === 'string') {
                stats[category].studied.add(updates[key]);
            } else if (key !== 'studied') {
                stats[category][key] = (stats[category][key] || 0) + (updates[key] || 0);
            }
        });

        return this.saveCategoryStats(stats);
    }

    // Data Management
    exportAllData() {
        return {
            wordProgress: this.getWordProgress(),
            userPreferences: this.getUserPreferences(),
            categoryStats: this.getCategoryStats(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    importAllData(data) {
        try {
            if (data.wordProgress) {
                this.saveWordProgress(data.wordProgress);
            }
            if (data.userPreferences) {
                localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(data.userPreferences));
            }
            if (data.categoryStats) {
                localStorage.setItem(this.STORAGE_KEYS.CATEGORY_STATS, JSON.stringify(data.categoryStats));
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    clearAllData() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    // Storage usage monitoring
    getStorageUsage() {
        let totalSize = 0;
        const usage = {};

        Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
            const data = localStorage.getItem(key);
            const size = data ? new Blob([data]).size : 0;
            usage[name] = {
                size: size,
                sizeFormatted: this.formatBytes(size)
            };
            totalSize += size;
        });

        return {
            individual: usage,
            total: totalSize,
            totalFormatted: this.formatBytes(totalSize)
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}