// assets/js/core/storage.js - Level-Aware Storage Management

export class StorageManager {
    constructor() {
        // Base storage keys
        this.STORAGE_KEYS = {
            // Level-specific keys (will be prefixed with level)
            WORD_PROGRESS: 'jlpt-word-progress',
            CATEGORY_STATS: 'jlpt-category-stats',
            
            // Shared/global keys
            USER_PREFERENCES: 'jlpt-user-preferences',
            CURRENT_LEVEL: 'jlpt-current-level'
        };
        
        this.currentLevel = this.getCurrentLevel();
        
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

    // ===== LEVEL MANAGEMENT =====
    
    getCurrentLevel() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEYS.CURRENT_LEVEL);
            return saved || 'N5';
        } catch (error) {
            return 'N5';
        }
    }

    setCurrentLevel(level) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.CURRENT_LEVEL, level);
            this.currentLevel = level;
            console.log(`📊 Storage switched to level: ${level}`);
            return true;
        } catch (error) {
            console.error('Error saving current level:', error);
            return false;
        }
    }

    // Get level-specific storage key
    getLevelKey(baseKey, level = null) {
        const targetLevel = level || this.currentLevel;
        return `${baseKey}-${targetLevel}`;
    }

    // ===== WORD PROGRESS (Level-Specific) =====
    
    getWordProgress(level = null) {
        try {
            const key = this.getLevelKey(this.STORAGE_KEYS.WORD_PROGRESS, level);
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading word progress:', error);
            return {};
        }
    }

    saveWordProgress(progress, level = null) {
        try {
            const key = this.getLevelKey(this.STORAGE_KEYS.WORD_PROGRESS, level);
            localStorage.setItem(key, JSON.stringify(progress));
            return true;
        } catch (error) {
            console.error('Error saving word progress:', error);
            return false;
        }
    }

    initializeWordProgress(vocabularyWords, level = null) {
        const currentProgress = this.getWordProgress(level);
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

        const validWords = new Set(vocabularyWords.map(w => w.japanese));
        Object.keys(currentProgress).forEach(japanese => {
            if (!validWords.has(japanese)) {
                delete currentProgress[japanese];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveWordProgress(currentProgress, level);
        }

        return currentProgress;
    }

    updateWordProgress(japanese, updates, level = null) {
        const currentProgress = this.getWordProgress(level);
        
        if (!currentProgress[japanese]) {
            currentProgress[japanese] = { ...this.defaultProgress };
        }

        currentProgress[japanese] = {
            ...currentProgress[japanese],
            ...updates,
            lastReviewed: Date.now()
        };

        return this.saveWordProgress(currentProgress, level);
    }

    getWordProgressStats(level = null) {
        const progress = this.getWordProgress(level);
        const stats = {
            level: level || this.currentLevel,
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

    // Get combined stats for all levels
    getAllLevelsStats() {
        const levels = ['N5', 'N4']; // Expand as needed
        const allStats = {};

        levels.forEach(level => {
            allStats[level] = this.getWordProgressStats(level);
        });

        return allStats;
    }

    // ===== USER PREFERENCES (Shared) =====
    
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
            
            // If changing level preference, update current level
            if (key === 'currentLevel') {
                this.setCurrentLevel(value);
            }
            
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

    getReadingToggle() {
        return this.getUserPreference('readingsHidden', false);
    }

    setReadingToggle(hidden) {
        return this.setUserPreference('readingsHidden', hidden);
    }

    // ===== CATEGORY STATS (Level-Specific) =====
    
    getCategoryStats(level = null) {
        try {
            const key = this.getLevelKey(this.STORAGE_KEYS.CATEGORY_STATS, level);
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : this.getDefaultCategoryStats();
        } catch (error) {
            console.error('Error loading category stats:', error);
            return this.getDefaultCategoryStats();
        }
    }

    saveCategoryStats(stats, level = null) {
        try {
            const serializable = {};
            Object.keys(stats).forEach(category => {
                serializable[category] = {
                    ...stats[category],
                    studied: Array.from(stats[category].studied || [])
                };
            });
            
            const key = this.getLevelKey(this.STORAGE_KEYS.CATEGORY_STATS, level);
            localStorage.setItem(key, JSON.stringify(serializable));
            return true;
        } catch (error) {
            console.error('Error saving category stats:', error);
            return false;
        }
    }

    loadCategoryStats(level = null) {
        const stats = this.getCategoryStats(level);
        
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

    updateCategoryStats(category, updates, level = null) {
        const stats = this.loadCategoryStats(level);
        
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

        return this.saveCategoryStats(stats, level);
    }

    // ===== DATA MANAGEMENT =====
    
    exportAllData(level = null) {
        const targetLevel = level || this.currentLevel;
        
        return {
            level: targetLevel,
            wordProgress: this.getWordProgress(targetLevel),
            userPreferences: this.getUserPreferences(),
            categoryStats: this.getCategoryStats(targetLevel),
            exportDate: new Date().toISOString(),
            version: '2.0' // Updated version for multi-level
        };
    }

    exportAllLevelsData() {
        const levels = ['N5', 'N4'];
        const allData = {
            levels: {},
            userPreferences: this.getUserPreferences(),
            currentLevel: this.currentLevel,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        levels.forEach(level => {
            allData.levels[level] = {
                wordProgress: this.getWordProgress(level),
                categoryStats: this.getCategoryStats(level)
            };
        });

        return allData;
    }

    importAllData(data, level = null) {
        try {
            const targetLevel = level || data.level || this.currentLevel;
            
            if (data.wordProgress) {
                this.saveWordProgress(data.wordProgress, targetLevel);
            }
            if (data.userPreferences) {
                localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(data.userPreferences));
            }
            if (data.categoryStats) {
                const key = this.getLevelKey(this.STORAGE_KEYS.CATEGORY_STATS, targetLevel);
                localStorage.setItem(key, JSON.stringify(data.categoryStats));
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    clearLevelData(level = null) {
        try {
            const targetLevel = level || this.currentLevel;
            
            const progressKey = this.getLevelKey(this.STORAGE_KEYS.WORD_PROGRESS, targetLevel);
            const statsKey = this.getLevelKey(this.STORAGE_KEYS.CATEGORY_STATS, targetLevel);
            
            localStorage.removeItem(progressKey);
            localStorage.removeItem(statsKey);
            
            console.log(`✅ Cleared data for level: ${targetLevel}`);
            return true;
        } catch (error) {
            console.error('Error clearing level data:', error);
            return false;
        }
    }

    clearAllData() {
        try {
            // Clear all level-specific data
            ['N5', 'N4'].forEach(level => {
                this.clearLevelData(level);
            });
            
            // Clear shared data
            localStorage.removeItem(this.STORAGE_KEYS.USER_PREFERENCES);
            localStorage.removeItem(this.STORAGE_KEYS.CURRENT_LEVEL);
            
            console.log('✅ All data cleared');
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    }

    // ===== STORAGE MONITORING =====
    
    getStorageUsage(level = null) {
        const targetLevel = level || this.currentLevel;
        let totalSize = 0;
        const usage = {};

        const keys = {
            wordProgress: this.getLevelKey(this.STORAGE_KEYS.WORD_PROGRESS, targetLevel),
            categoryStats: this.getLevelKey(this.STORAGE_KEYS.CATEGORY_STATS, targetLevel),
            userPreferences: this.STORAGE_KEYS.USER_PREFERENCES
        };

        Object.entries(keys).forEach(([name, key]) => {
            const data = localStorage.getItem(key);
            const size = data ? new Blob([data]).size : 0;
            usage[name] = {
                size: size,
                sizeFormatted: this.formatBytes(size)
            };
            totalSize += size;
        });

        return {
            level: targetLevel,
            individual: usage,
            total: totalSize,
            totalFormatted: this.formatBytes(totalSize)
        };
    }

    getAllStorageUsage() {
        const levels = ['N5', 'N4'];
        const allUsage = {};
        let grandTotal = 0;

        levels.forEach(level => {
            const usage = this.getStorageUsage(level);
            allUsage[level] = usage;
            grandTotal += usage.total;
        });

        return {
            byLevel: allUsage,
            grandTotal: grandTotal,
            grandTotalFormatted: this.formatBytes(grandTotal)
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