// assets/js/core/storage.js - Data Persistence & User Preferences

/**
 * Storage utility for managing user preferences and settings
 */

const STORAGE_KEYS = {
    WORD_PROGRESS: 'jlpt-word-progress',
    USER_PREFERENCES: 'jlpt-user-preferences',
    READING_TOGGLE: 'jlpt-reading-toggle',
    QUIZ_SETTINGS: 'jlpt-quiz-settings',
    STATS_DATA: 'jlpt-stats-data'
};

/**
 * Default user preferences
 */
const DEFAULT_PREFERENCES = {
    readingToggle: false,
    currentQuizMode: 'multiple-choice',
    audioEnabled: true,
    keyboardShortcuts: true,
    autoAdvance: true,
    theme: 'default',
    language: 'en'
};

/**
 * Safe localStorage operations with error handling
 */
class SafeStorage {
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage (${key}):`, error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage (${key}):`, error);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from localStorage (${key}):`, error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    static isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

/**
 * Load user preferences with defaults
 */
export function loadUserPreferences() {
    if (!SafeStorage.isAvailable()) {
        console.warn('localStorage not available, using defaults');
        return DEFAULT_PREFERENCES;
    }

    const saved = SafeStorage.get(STORAGE_KEYS.USER_PREFERENCES, {});
    const preferences = { ...DEFAULT_PREFERENCES, ...saved };
    
    console.log('📋 User preferences loaded:', preferences);
    return preferences;
}

/**
 * Save user preferences
 */
export function saveUserPreferences(preferences) {
    if (!SafeStorage.isAvailable()) {
        console.warn('localStorage not available, cannot save preferences');
        return false;
    }

    const success = SafeStorage.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
    if (success) {
        console.log('💾 User preferences saved:', preferences);
    }
    return success;
}

/**
 * Load reading toggle preference
 */
export function loadReadingToggle() {
    return SafeStorage.get(STORAGE_KEYS.READING_TOGGLE, false);
}

/**
 * Save reading toggle preference
 */
export function saveReadingToggle(enabled) {
    return SafeStorage.set(STORAGE_KEYS.READING_TOGGLE, enabled);
}

/**
 * Load quiz settings
 */
export function loadQuizSettings() {
    const defaultSettings = {
        currentMode: 'multiple-choice',
        readingsHidden: false,
        speedChallengeTime: 8000,
        autoAdvance: true,
        soundEnabled: true
    };

    return SafeStorage.get(STORAGE_KEYS.QUIZ_SETTINGS, defaultSettings);
}

/**
 * Save quiz settings
 */
export function saveQuizSettings(settings) {
    return SafeStorage.set(STORAGE_KEYS.QUIZ_SETTINGS, settings);
}

/**
 * Load statistics data
 */
export function loadStatsData() {
    const defaultStats = {
        totalFlips: 0,
        totalQuizzes: 0,
        correctAnswers: 0,
        studySessionsCount: 0,
        totalStudyTime: 0,
        streakDays: 0,
        lastStudyDate: null,
        categoryStats: {
            'noun': { studied: [], quizAttempts: 0, quizCorrect: 0 },
            'verb': { studied: [], quizAttempts: 0, quizCorrect: 0 },
            'i-adjective': { studied: [], quizAttempts: 0, quizCorrect: 0 },
            'na-adjective': { studied: [], quizAttempts: 0, quizCorrect: 0 }
        }
    };

    return SafeStorage.get(STORAGE_KEYS.STATS_DATA, defaultStats);
}

/**
 * Save statistics data
 */
export function saveStatsData(stats) {
    return SafeStorage.set(STORAGE_KEYS.STATS_DATA, stats);
}

/**
 * Export all user data
 */
export function exportAllData() {
    const data = {
        wordProgress: SafeStorage.get(STORAGE_KEYS.WORD_PROGRESS, {}),
        preferences: SafeStorage.get(STORAGE_KEYS.USER_PREFERENCES, {}),
        quizSettings: SafeStorage.get(STORAGE_KEYS.QUIZ_SETTINGS, {}),
        statsData: SafeStorage.get(STORAGE_KEYS.STATS_DATA, {}),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Import all user data
 */
export function importAllData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        let importCount = 0;

        if (data.wordProgress) {
            SafeStorage.set(STORAGE_KEYS.WORD_PROGRESS, data.wordProgress);
            importCount++;
        }

        if (data.preferences) {
            SafeStorage.set(STORAGE_KEYS.USER_PREFERENCES, data.preferences);
            importCount++;
        }

        if (data.quizSettings) {
            SafeStorage.set(STORAGE_KEYS.QUIZ_SETTINGS, data.quizSettings);
            importCount++;
        }

        if (data.statsData) {
            SafeStorage.set(STORAGE_KEYS.STATS_DATA, data.statsData);
            importCount++;
        }

        console.log(`✅ Successfully imported ${importCount} data sections`);
        return { success: true, importCount };

    } catch (error) {
        console.error('❌ Error importing data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clear all stored data (with confirmation)
 */
export function clearAllData(confirm = false) {
    if (!confirm) {
        console.warn('clearAllData called without confirmation');
        return false;
    }

    const keysToRemove = Object.values(STORAGE_KEYS);
    let removedCount = 0;

    keysToRemove.forEach(key => {
        if (SafeStorage.remove(key)) {
            removedCount++;
        }
    });

    console.log(`🗑️ Cleared ${removedCount}/${keysToRemove.length} storage keys`);
    return removedCount === keysToRemove.length;
}

/**
 * Get storage usage statistics
 */
export function getStorageStats() {
    if (!SafeStorage.isAvailable()) {
        return { available: false };
    }

    const stats = {
        available: true,
        keys: Object.keys(STORAGE_KEYS).length,
        data: {}
    };

    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        const data = SafeStorage.get(key);
        if (data) {
            const size = JSON.stringify(data).length;
            stats.data[name] = {
                size: size,
                sizeFormatted: formatBytes(size),
                lastModified: data.lastModified || 'Unknown'
            };
        }
    });

    return stats;
}

/**
 * Format bytes into human readable format
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if data migration is needed
 */
export function checkDataMigration() {
    // Future functionality for data format migrations
    const currentVersion = '1.0.0';
    const storedVersion = SafeStorage.get('data_version', '1.0.0');
    
    return {
        needed: currentVersion !== storedVersion,
        currentVersion,
        storedVersion
    };
}

/**
 * Create backup before major operations
 */
export function createBackup() {
    const backup = {
        timestamp: Date.now(),
        data: exportAllData()
    };

    const backupKey = `jlpt-backup-${Date.now()}`;
    return SafeStorage.set(backupKey, backup);
}

export { STORAGE_KEYS, DEFAULT_PREFERENCES };