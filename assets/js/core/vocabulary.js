// assets/js/core/vocabulary.js - Multi-Level Vocabulary Manager

import { N5_VOCABULARY } from './vocabularyN5.js';
import { N4_VOCABULARY } from './vocabularyN4.js';

// Level configuration
export const LEVEL_CONFIG = {
    N5: {
        level: 'N5',
        displayName: 'JLPT N5',
        description: 'Beginner-level Japanese vocabulary',
        color: '#4CAF50', // Green
        vocabulary: N5_VOCABULARY,
        enabled: true
    },
    N4: {
        level: 'N4',
        displayName: 'JLPT N4',
        description: 'Elementary-level Japanese vocabulary',
        color: '#FF9800', // Orange
        vocabulary: N4_VOCABULARY,
        enabled: true // DORMANT - Enable when ready
    }
    // Future expansion ready:
    // N3: { ... },
    // N2: { ... },
    // N1: { ... }
};

export class VocabularyManager {
    constructor(initialLevel = 'N5') {
        this.currentLevel = initialLevel;
        this.allLevels = LEVEL_CONFIG;
        this.loadLevel(initialLevel);
    }

    // Load specific level
    loadLevel(level) {
        const levelConfig = this.allLevels[level];
        
        if (!levelConfig) {
            console.error(`Level ${level} not found, defaulting to N5`);
            level = 'N5';
        }

        if (!levelConfig.enabled) {
            console.warn(`Level ${level} is dormant/disabled`);
            // Still allow loading for development purposes
        }

        this.currentLevel = level;
        this.vocabulary = levelConfig.vocabulary || [];
        this.levelConfig = levelConfig;
        this.wordCounts = this.calculateWordCounts();
        
        console.log(`📚 Loaded ${level}: ${this.vocabulary.length} words`);
    }

    // Get current level info
    getCurrentLevelInfo() {
        return {
            level: this.currentLevel,
            displayName: this.levelConfig.displayName,
            description: this.levelConfig.description,
            color: this.levelConfig.color,
            wordCount: this.vocabulary.length,
            enabled: this.levelConfig.enabled
        };
    }

    // Get all available levels (including dormant)
    getAvailableLevels() {
        return Object.entries(this.allLevels).map(([key, config]) => ({
            level: key,
            displayName: config.displayName,
            enabled: config.enabled,
            wordCount: config.vocabulary.length,
            color: config.color
        }));
    }

    // Switch to different level
    switchLevel(newLevel) {
        if (this.currentLevel === newLevel) {
            console.log(`Already on level ${newLevel}`);
            return false;
        }

        this.loadLevel(newLevel);
        return true;
    }

    // Get combined vocabulary from multiple levels (for future mixed mode)
    getCombinedVocabulary(levels = []) {
        const combined = [];
        
        levels.forEach(level => {
            const config = this.allLevels[level];
            if (config && config.vocabulary) {
                combined.push(...config.vocabulary.map(word => ({
                    ...word,
                    sourceLevel: level
                })));
            }
        });

        return combined;
    }

    // ===== EXISTING METHODS (unchanged) =====
    
    calculateWordCounts() {
        const counts = {
            all: this.vocabulary.length,
            noun: 0,
            verb: 0,
            'i-adjective': 0,
            'na-adjective': 0
        };

        this.vocabulary.forEach(card => {
            if (counts[card.type] !== undefined) {
                counts[card.type]++;
            }
        });

        return counts;
    }

    getWordCounts() {
        return { ...this.wordCounts };
    }

    filterByTypes(types) {
        if (types.includes('all')) {
            return [...this.vocabulary];
        }

        return this.vocabulary.filter(card => types.includes(card.type));
    }

    shuffleArray(array) {
        if (!array || array.length === 0) return [];
        
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    interleavedShuffle(array) {
        if (!array || array.length <= 1) return array.slice();
        
        const cardsByType = {
            noun: [],
            verb: [],
            'i-adjective': [],
            'na-adjective': []
        };
        
        array.forEach(card => {
            if (cardsByType[card.type]) {
                cardsByType[card.type].push(card);
            }
        });
        
        Object.keys(cardsByType).forEach(type => {
            cardsByType[type] = this.shuffleArray(cardsByType[type]);
        });
        
        const result = [];
        const typeKeys = Object.keys(cardsByType).filter(type => cardsByType[type].length > 0);
        
        if (typeKeys.length === 0) return this.shuffleArray(array);
        
        let typeIndex = 0;
        while (result.length < array.length) {
            const currentType = typeKeys[typeIndex % typeKeys.length];
            if (cardsByType[currentType].length > 0) {
                result.push(cardsByType[currentType].shift());
            }
            
            if (cardsByType[currentType].length === 0) {
                typeKeys.splice(typeKeys.indexOf(currentType), 1);
                if (typeKeys.length === 0) break;
            }
            
            typeIndex++;
        }
        
        const lightShuffled = [...result];
        const swapCount = Math.max(1, Math.floor(array.length * 0.15));
        
        for (let i = 0; i < swapCount; i++) {
            const pos1 = Math.floor(Math.random() * lightShuffled.length);
            const pos2 = Math.floor(Math.random() * lightShuffled.length);
            [lightShuffled[pos1], lightShuffled[pos2]] = [lightShuffled[pos2], lightShuffled[pos1]];
        }
        
        return lightShuffled;
    }

    generateQuizOptions(correctCard, count = 4, sameTypeWeight = 0.7) {
        const options = [correctCard];
        const otherCards = this.vocabulary.filter(card => 
            card.japanese !== correctCard.japanese
        );
        
        if (otherCards.length === 0) return options;
        
        const sameTypeCards = this.shuffleArray(
            otherCards.filter(card => card.type === correctCard.type)
        );
        const diffTypeCards = this.shuffleArray(
            otherCards.filter(card => card.type !== correctCard.type)
        );
        
        const wrongAnswers = [];
        const sameTypeCount = Math.floor((count - 1) * sameTypeWeight);
        
        if (sameTypeCards.length > 0) {
            wrongAnswers.push(...sameTypeCards.slice(0, Math.min(sameTypeCount, sameTypeCards.length)));
        }
        
        const remainingSlots = (count - 1) - wrongAnswers.length;
        if (remainingSlots > 0 && diffTypeCards.length > 0) {
            wrongAnswers.push(...diffTypeCards.slice(0, remainingSlots));
        }
        
        while (wrongAnswers.length < (count - 1) && otherCards.length >= (count - 1)) {
            const remaining = otherCards.filter(card => 
                !wrongAnswers.some(wa => wa.japanese === card.japanese)
            );
            if (remaining.length > 0) {
                wrongAnswers.push(remaining[Math.floor(Math.random() * remaining.length)]);
            } else {
                break;
            }
        }
        
        options.push(...wrongAnswers);
        return this.shuffleArray(options);
    }

    searchWords(query) {
        if (!query || query.trim() === '') return [...this.vocabulary];
        
        const searchTerm = query.toLowerCase().trim();
        
        return this.vocabulary.filter(card => 
            card.japanese.toLowerCase().includes(searchTerm) ||
            card.reading.toLowerCase().includes(searchTerm) ||
            card.meaning.toLowerCase().includes(searchTerm)
        );
    }

    getRandomWord(excludeWords = []) {
        const availableWords = this.vocabulary.filter(card => 
            !excludeWords.includes(card.japanese)
        );
        
        if (availableWords.length === 0) return null;
        
        return availableWords[Math.floor(Math.random() * availableWords.length)];
    }

    getWordByJapanese(japanese) {
        return this.vocabulary.find(card => card.japanese === japanese) || null;
    }

    getAllWords() {
        return [...this.vocabulary];
    }
}