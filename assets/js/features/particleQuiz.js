// assets/js/features/particleQuiz.js - ULTIMATE MERGE VERSION
import { 
    particleData, 
    particleDifficulty, 
    particlesByJLPTLevel,
    confusionPairs,
    getParticlesForLevel,
    getParticleInfo
} from '../core/particleData.js';

console.log('📦 ParticleQuiz.js loading...');

export class ParticleQuiz {
    constructor(currentJLPTLevel = 'N5') {
        // ✅ Core settings
        this.jlptLevel = currentJLPTLevel; // N5, N4, etc.
        this.difficulty = 'beginner'; // Internal difficulty within level
        
        // ✅ Progress tracking (particle-level)
        this.particleProgress = {};
        
        // ✅ Advanced tracking (example-level) - YOUR FEATURES
        this.exampleProgress = {};
        this.recentlyShown = [];
        this.maxRecentHistory = 8;
        
        // ✅ Session stats
        this.currentQuestion = null;
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            particleSpecificStats: {}
        };
        
        this.initializeProgress();
        console.log(`🔗 Particle Quiz initialized - Level: ${this.jlptLevel}, Difficulty: ${this.difficulty}`);
    }

    // ========================================
    // JLPT LEVEL MANAGEMENT (NEW HELPERS)
    // ========================================

    /**
     * ✨ Set JLPT level and reset difficulty
     */
    setJLPTLevel(level) {
        if (!particlesByJLPTLevel[level]) {
            console.warn(`❌ Invalid JLPT level: ${level}, staying on ${this.jlptLevel}`);
            return false;
        }
        
        console.log(`🎓 Particle quiz switching from ${this.jlptLevel} to ${level}`);
        this.jlptLevel = level;
        this.difficulty = 'beginner'; // Reset difficulty when changing levels
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        
        // Clear recently shown when switching levels
        this.recentlyShown = [];
        
        return true;
    }

    /**
     * ✨ Get current JLPT level
     */
    getJLPTLevel() {
        return this.jlptLevel;
    }

    /**
     * ✨ Get all particles available for current level
     */
    getAvailableParticles() {
        return getParticlesForLevel(this.jlptLevel);
    }

    /**
     * ✨ Get count of available particles
     */
    getAvailableParticleCount() {
        return this.getAvailableParticles().length;
    }

    // ========================================
    // PROGRESS MANAGEMENT
    // ========================================

    initializeProgress() {
        try {
            const saved = localStorage.getItem('jlpt-particle-progress');
            if (saved) {
                const data = JSON.parse(saved);
                this.particleProgress = data.particleProgress || {};
                this.exampleProgress = data.exampleProgress || {};
                this.recentlyShown = data.recentlyShown || [];
            }
        } catch (error) {
            console.warn('Error loading particle progress:', error);
            this.particleProgress = {};
            this.exampleProgress = {};
            this.recentlyShown = [];
        }

        // Initialize particle-level progress
        particleData.forEach(particleInfo => {
            if (!this.particleProgress[particleInfo.particle]) {
                this.particleProgress[particleInfo.particle] = {
                    state: 'new',
                    attempts: 0,
                    correct: 0,
                    lastSeen: null,
                    difficulty: 'beginner',
                    jlptLevel: particleInfo.jlptLevel // ✨ Track which level this particle belongs to
                };
            }
            
            // Initialize example-level progress
            particleInfo.examples.forEach((example, idx) => {
                const exampleKey = `${particleInfo.particle}-${idx}`;
                if (!this.exampleProgress[exampleKey]) {
                    this.exampleProgress[exampleKey] = {
                        lastSeen: null,
                        attempts: 0,
                        correct: 0,
                        cooldownUntil: 0
                    };
                }
            });
        });

        this.saveProgress();
    }

    saveProgress() {
        try {
            localStorage.setItem('jlpt-particle-progress', JSON.stringify({
                particleProgress: this.particleProgress,
                exampleProgress: this.exampleProgress,
                recentlyShown: this.recentlyShown.slice(-this.maxRecentHistory)
            }));
        } catch (error) {
            console.error('Error saving particle progress:', error);
        }
    }

    // ========================================
    // QUESTION GENERATION
    // ========================================

    generateQuestion() {
        // ✅ Get particles for current JLPT level
        const levelParticles = particlesByJLPTLevel[this.jlptLevel] || particlesByJLPTLevel.N5;
        
        console.log(`🔗 Generating question for ${this.jlptLevel} (${levelParticles.length} particles available)`);
        
        // ✅ Apply internal difficulty within the level
        const availableParticles = this.difficulty === 'beginner' 
            ? levelParticles.slice(0, Math.min(5, levelParticles.length)) // Start with first 5
            : levelParticles; // All particles for this level
        
        if (availableParticles.length === 0) {
            console.error('No particles available for this level');
            return null;
        }

        // ✅ Filter particle data to only include particles from this level
        const availableParticleData = particleData.filter(p => 
            availableParticles.includes(p.particle)
        );

        if (availableParticleData.length === 0) {
            console.error('No particle data found for available particles');
            return null;
        }

        // Get available examples (not recently shown + passed cooldown)
        const now = Date.now();
        const availableExamples = this.getAvailableExamples(availableParticleData, now);
        
        if (availableExamples.length === 0) {
            console.warn('⚠️ All examples in cooldown, resetting cooldowns');
            this.resetCooldowns();
            return this.generateQuestion(); // Retry
        }

        // Select example with weighted priority
        const selectedExample = this.selectExampleForPractice(availableExamples);
        
        if (!selectedExample) {
            console.error('Failed to select example');
            return null;
        }

        // Generate options from particles at this level
        const options = this.generateOptions(
            selectedExample.particleInfo.particle, 
            availableParticles
        );

        // Record this question
        this.recordQuestionShown(selectedExample.exampleKey, now);

        this.currentQuestion = {
            particle: selectedExample.particleInfo.particle,
            reading: selectedExample.particleInfo.reading,
            function: selectedExample.particleInfo.function,
            description: selectedExample.particleInfo.description,
            jlptLevel: selectedExample.particleInfo.jlptLevel, // ✨ Include level info
            example: selectedExample.example,
            options: options,
            exampleKey: selectedExample.exampleKey
        };

        console.log(`🔗 Generated question: ${selectedExample.exampleKey} (${this.jlptLevel})`);
        return this.currentQuestion;
    }

    getAvailableExamples(particleDataList, now) {
        const available = [];
        
        particleDataList.forEach(particleInfo => {
            particleInfo.examples.forEach((example, idx) => {
                const exampleKey = `${particleInfo.particle}-${idx}`;
                const progress = this.exampleProgress[exampleKey];
                
                const notRecentlyShown = !this.recentlyShown.includes(exampleKey);
                const cooldownPassed = !progress || progress.cooldownUntil <= now;
                
                if (notRecentlyShown && cooldownPassed) {
                    available.push({
                        particleInfo: particleInfo,
                        example: example,
                        exampleKey: exampleKey,
                        progress: progress
                    });
                }
            });
        });
        
        return available;
    }

    selectExampleForPractice(availableExamples) {
        if (availableExamples.length === 0) return null;
        
        const now = Date.now();
        const weights = availableExamples.map(item => {
            const particleProgress = this.particleProgress[item.particleInfo.particle];
            const exampleProgress = item.progress;
            
            // Particle-level weighting
            const particleSuccessRate = particleProgress.attempts > 0 
                ? particleProgress.correct / particleProgress.attempts 
                : 0.5;
            const particleWeight = Math.max(0.1, 1 - particleSuccessRate);
            
            // Example-level weighting
            const exampleSuccessRate = exampleProgress.attempts > 0
                ? exampleProgress.correct / exampleProgress.attempts
                : 0.5;
            const exampleWeight = Math.max(0.1, 1 - exampleSuccessRate);
            
            // Time-based weighting
            const timeSinceLastSeen = exampleProgress.lastSeen 
                ? now - exampleProgress.lastSeen 
                : Infinity;
            const timeWeight = Math.min(2, timeSinceLastSeen / (60 * 60 * 1000));
            
            const totalWeight = (particleWeight * 0.4 + exampleWeight * 0.4 + timeWeight * 0.2);
            
            return {
                example: item,
                weight: totalWeight
            };
        });

        // Weighted random selection
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.example;
            }
        }

        return availableExamples[0];
    }

    recordQuestionShown(exampleKey, now) {
        this.recentlyShown.push(exampleKey);
        if (this.recentlyShown.length > this.maxRecentHistory) {
            this.recentlyShown.shift();
        }
        
        if (this.exampleProgress[exampleKey]) {
            this.exampleProgress[exampleKey].lastSeen = now;
        }
    }

    generateOptions(correctParticle, availableParticles) {
        const options = [correctParticle];
        
        // Add distractors from available particles at this level
        const distractors = availableParticles.filter(p => p !== correctParticle);
        const shuffled = this.shuffleArray([...distractors]);
        options.push(...shuffled.slice(0, 3));
        
        // If we don't have enough options (rare), add from all particles
        if (options.length < 4) {
            const allParticles = particleData.map(p => p.particle);
            const moreDistractors = allParticles.filter(p => !options.includes(p));
            const moreShuffled = this.shuffleArray(moreDistractors);
            options.push(...moreShuffled.slice(0, 4 - options.length));
        }

        return this.shuffleArray(options);
    }

    // ========================================
    // ANSWER VALIDATION
    // ========================================

    validateAnswer(selectedParticle) {
        if (!this.currentQuestion) {
            return {
                isCorrect: false,
                correctParticle: '?',
                explanation: 'No active question',
                particleInfo: { reading: '', function: '', description: '' }
            };
        }

        const correctParticle = this.currentQuestion.particle;
        const exampleKey = this.currentQuestion.exampleKey;
        const isCorrect = selectedParticle === correctParticle;
        
        // Update session stats
        this.sessionStats.attempted++;
        if (isCorrect) {
            this.sessionStats.correct++;
            this.consecutiveCorrect++;
            this.consecutiveIncorrect = 0;
        } else {
            this.consecutiveIncorrect++;
            this.consecutiveCorrect = 0;
        }

        // Update particle-level progress
        const particleProgress = this.particleProgress[correctParticle];
        if (particleProgress) {
            particleProgress.attempts++;
            if (isCorrect) particleProgress.correct++;
            particleProgress.lastSeen = Date.now();
            this.updateParticleState(correctParticle, isCorrect);
        }

        // Update example-level progress with cooldown
        const exampleProgress = this.exampleProgress[exampleKey];
        if (exampleProgress) {
            exampleProgress.attempts++;
            if (isCorrect) exampleProgress.correct++;
            
            // Cooldown: correct = 30 min, incorrect = 10 min
            const cooldownMinutes = isCorrect ? 30 : 10;
            exampleProgress.cooldownUntil = Date.now() + (cooldownMinutes * 60 * 1000);
        }

        // Update particle-specific session stats
        if (!this.sessionStats.particleSpecificStats[correctParticle]) {
            this.sessionStats.particleSpecificStats[correctParticle] = {
                attempted: 0,
                correct: 0
            };
        }
        this.sessionStats.particleSpecificStats[correctParticle].attempted++;
        if (isCorrect) {
            this.sessionStats.particleSpecificStats[correctParticle].correct++;
        }

        this.saveProgress();

        return {
            isCorrect: isCorrect,
            correctParticle: correctParticle,
            explanation: this.currentQuestion.example.explanation,
            particleInfo: {
                reading: this.currentQuestion.reading,
                function: this.currentQuestion.function,
                description: this.currentQuestion.description,
                jlptLevel: this.currentQuestion.jlptLevel // ✨ Include level
            }
        };
    }

    updateParticleState(particle, isCorrect) {
        const progress = this.particleProgress[particle];
        if (!progress) return;

        const successRate = progress.attempts > 0 ? progress.correct / progress.attempts : 0;

        if (isCorrect) {
            if (progress.state === 'new' && successRate >= 0.6) {
                progress.state = 'learning';
            } else if (progress.state === 'learning' && successRate >= 0.8 && progress.attempts >= 3) {
                progress.state = 'review';
            } else if (progress.state === 'review' && successRate >= 0.9 && progress.attempts >= 5) {
                progress.state = 'mastered';
            }
        } else {
            if (progress.state === 'mastered' && successRate < 0.8) {
                progress.state = 'review';
            } else if (progress.state === 'review' && successRate < 0.6) {
                progress.state = 'learning';
            }
        }
    }

    // ========================================
    // DIFFICULTY ADJUSTMENT
    // ========================================

    adjustDifficulty() {
        const sessionSuccessRate = this.sessionStats.attempted > 0 
            ? this.sessionStats.correct / this.sessionStats.attempted 
            : 0;

        // Increase difficulty
        if (this.consecutiveCorrect >= 5 && sessionSuccessRate >= 0.8) {
            if (this.difficulty === 'beginner') {
                this.difficulty = 'intermediate';
                console.log('🔗 Difficulty increased to intermediate');
            } else if (this.difficulty === 'intermediate') {
                this.difficulty = 'advanced';
                console.log('🔗 Difficulty increased to advanced');
            }
            this.consecutiveCorrect = 0;
        } 
        // Decrease difficulty
        else if (this.consecutiveIncorrect >= 3 || sessionSuccessRate < 0.4) {
            if (this.difficulty === 'advanced') {
                this.difficulty = 'intermediate';
                console.log('🔗 Difficulty decreased to intermediate');
            } else if (this.difficulty === 'intermediate') {
                this.difficulty = 'beginner';
                console.log('🔗 Difficulty decreased to beginner');
            }
            this.consecutiveIncorrect = 0;
        }
    }

    // ========================================
    // STATISTICS & REPORTING
    // ========================================

    getStats() {
        // ✅ Get particles for current level only
        const levelParticles = this.getAvailableParticles();
        
        const stats = {
            session: this.sessionStats,
            difficulty: this.difficulty,
            jlptLevel: this.jlptLevel, // ✨ Current level
            availableParticles: levelParticles, // ✨ Particles at this level
            particleProgress: {}
        };

        // Only include particles from current level
        levelParticles.forEach(particle => {
            const progress = this.particleProgress[particle];
            if (progress) {
                stats.particleProgress[particle] = {
                    state: progress.state,
                    attempts: progress.attempts,
                    correct: progress.correct,
                    successRate: progress.attempts > 0 ? 
                        Math.round((progress.correct / progress.attempts) * 100) : 0
                };
            }
        });

        return stats;
    }

    /**
     * ✨ NEW: Get progress summary for current level
     */
    getLevelProgressSummary() {
        const availableParticles = this.getAvailableParticles();
        const summary = {
            level: this.jlptLevel,
            totalParticles: availableParticles.length,
            new: 0,
            learning: 0,
            review: 0,
            mastered: 0
        };

        availableParticles.forEach(particle => {
            const progress = this.particleProgress[particle];
            if (!progress || progress.state === 'new') {
                summary.new++;
            } else if (progress.state === 'learning') {
                summary.learning++;
            } else if (progress.state === 'review') {
                summary.review++;
            } else if (progress.state === 'mastered') {
                summary.mastered++;
            }
        });

        return summary;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    resetCooldowns() {
        Object.keys(this.exampleProgress).forEach(key => {
            this.exampleProgress[key].cooldownUntil = 0;
        });
        this.recentlyShown = [];
        console.log('🔄 Cooldowns reset');
    }

    resetProgress() {
        this.particleProgress = {};
        this.exampleProgress = {};
        this.recentlyShown = [];
        this.difficulty = 'beginner';
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            particleSpecificStats: {}
        };
        
        this.initializeProgress();
        console.log(`🔗 Particle quiz progress reset for ${this.jlptLevel}`);
    }
}

// Export particle data for external use
export { particleData, particlesByJLPTLevel, confusionPairs };

console.log('✅ ParticleQuiz.js loaded');