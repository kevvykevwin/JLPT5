// assets/js/features/particleQuiz.js - FIXED Particle Quiz Implementation

// Japanese particle data with practice sentences
const particleData = [
  {
    particle: "は",
    reading: "wa",
    function: "topic marker",
    description: "Marks what the sentence is about (the topic)",
    examples: [
      {
        japanese: "私は学生です",
        english: "I am a student", 
        correct: "は",
        options: ["は", "が", "を"],
        explanation: "私 is the topic being discussed in this sentence"
      },
      {
        japanese: "今日は天気がいいです",
        english: "Today's weather is good",
        correct: "は", 
        options: ["は", "が", "の"],
        explanation: "今日 is the topic of the sentence (what we're talking about)"
      },
      {
        japanese: "日本語は難しいです",
        english: "Japanese is difficult",
        correct: "は",
        options: ["は", "が", "を"],
        explanation: "日本語 is what we're talking about (the topic)"
      }
    ]
  },
  {
    particle: "が",
    reading: "ga", 
    function: "subject marker",
    description: "Marks the grammatical subject, often for emphasis or new information",
    examples: [
      {
        japanese: "犬が好きです",
        english: "I like dogs",
        correct: "が",
        options: ["が", "は", "を"],
        explanation: "犬 is the object being liked (grammatical subject of 好き)"
      },
      {
        japanese: "雨が降っています",
        english: "It's raining",
        correct: "が",
        options: ["が", "は", "に"],
        explanation: "雨 is the subject performing the action of falling"
      },
      {
        japanese: "誰が来ましたか",
        english: "Who came?",
        correct: "が",
        options: ["が", "は", "を"],
        explanation: "Question words (誰, 何, etc.) typically use が as the particle"
      }
    ]
  },
  {
    particle: "を",
    reading: "wo/o",
    function: "direct object marker", 
    description: "Marks what receives the action of the verb (the direct object)",
    examples: [
      {
        japanese: "本を読みます",
        english: "I read a book",
        correct: "を",
        options: ["を", "が", "に"],
        explanation: "本 is what is being read (the direct object of the verb)"
      },
      {
        japanese: "映画を見ました",
        english: "I watched a movie",
        correct: "を",
        options: ["を", "が", "で"],
        explanation: "映画 is what was watched (direct object)"
      },
      {
        japanese: "日本語を勉強します",
        english: "I study Japanese",
        correct: "を",
        options: ["を", "に", "で"],
        explanation: "日本語 is what is being studied (direct object)"
      }
    ]
  },
  {
    particle: "に",
    reading: "ni",
    function: "direction/time/indirect object marker",
    description: "Shows direction, specific time, or recipient of an action",
    examples: [
      {
        japanese: "学校に行きます",
        english: "I go to school",
        correct: "に",
        options: ["に", "で", "を"],
        explanation: "学校 is the destination (direction marker)"
      },
      {
        japanese: "友達に手紙を書きます",
        english: "I write a letter to my friend",
        correct: "に",
        options: ["に", "が", "を"],
        explanation: "友達 is the recipient of the letter (indirect object)"
      },
      {
        japanese: "七時に起きます",
        english: "I wake up at 7 o'clock",
        correct: "に",
        options: ["に", "で", "から"],
        explanation: "七時 is a specific time point"
      }
    ]
  },
  {
    particle: "で",
    reading: "de",
    function: "location of action/method marker",
    description: "Shows where an action takes place or the method/means used",
    examples: [
      {
        japanese: "図書館で勉強します",
        english: "I study at the library",
        correct: "で",
        options: ["で", "に", "を"],
        explanation: "図書館 is where the action of studying takes place"
      },
      {
        japanese: "電車で行きます",
        english: "I go by train",
        correct: "で",
        options: ["で", "に", "が"],
        explanation: "電車 is the method of transportation (means)"
      },
      {
        japanese: "日本語で話します",
        english: "I speak in Japanese",
        correct: "で",
        options: ["で", "を", "に"],
        explanation: "日本語 is the language used (method/means of communication)"
      }
    ]
  },
  {
    particle: "から",
    reading: "kara",
    function: "starting point marker",
    description: "Shows starting point in time or space, or indicates source",
    examples: [
      {
        japanese: "家から出ます",
        english: "I leave from home",
        correct: "から",
        options: ["から", "に", "で"],
        explanation: "家 is the starting point of the action"
      },
      {
        japanese: "九時から始まります",
        english: "It starts from 9 o'clock",
        correct: "から",
        options: ["から", "に", "まで"],
        explanation: "九時 is the starting time"
      }
    ]
  },
  {
    particle: "まで",
    reading: "made",
    function: "ending point marker",
    description: "Shows ending point in time or space (until/to)",
    examples: [
      {
        japanese: "駅まで歩きます",
        english: "I walk to the station",
        correct: "まで",
        options: ["まで", "に", "で"],
        explanation: "駅 is the destination/end point of walking"
      },
      {
        japanese: "五時まで働きます",
        english: "I work until 5 o'clock",
        correct: "まで",
        options: ["まで", "に", "から"],
        explanation: "五時 is the ending time of working"
      }
    ]
  },
  {
    particle: "と",
    reading: "to",
    function: "conjunction/accompaniment marker",
    description: "Connects nouns ('and') or shows accompaniment ('with')",
    examples: [
      {
        japanese: "友達と映画を見ます",
        english: "I watch a movie with my friend",
        correct: "と",
        options: ["と", "に", "が"],
        explanation: "友達 is who you're with (accompaniment)"
      },
      {
        japanese: "パンと牛乳を買います",
        english: "I buy bread and milk",
        correct: "と",
        options: ["と", "を", "に"],
        explanation: "と connects two items being bought together"
      }
    ]
  }
];

// Difficulty progression system
const particleDifficulty = {
  beginner: ["は", "を", "が"],
  intermediate: ["に", "で", "から", "まで"], 
  advanced: ["と", "の", "へ", "より"]
};

// Common particle confusions for targeted practice
const confusionPairs = [
  {particles: ["は", "が"], context: "topic vs subject"},
  {particles: ["に", "で"], context: "location markers"},
  {particles: ["から", "まで"], context: "starting vs ending points"},
  {particles: ["を", "が"], context: "object vs subject with certain verbs"}
];

export class ParticleQuiz {
    constructor() {
        this.difficulty = 'beginner';
        this.particleProgress = {};
        this.currentQuestion = null;
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            particleSpecificStats: {}
        };
        
        this.initializeProgress();
        console.log('🔗 Particle Quiz initialized with difficulty:', this.difficulty);
    }

    initializeProgress() {
        // Load existing progress or create new
        try {
            const saved = localStorage.getItem('jlpt-particle-progress');
            if (saved) {
                this.particleProgress = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Error loading particle progress:', error);
            this.particleProgress = {};
        }

        // Initialize progress for all particles
        particleData.forEach(particleInfo => {
            if (!this.particleProgress[particleInfo.particle]) {
                this.particleProgress[particleInfo.particle] = {
                    state: 'new',
                    attempts: 0,
                    correct: 0,
                    lastSeen: null,
                    difficulty: 'beginner'
                };
            }
        });

        this.saveProgress();
    }

    saveProgress() {
        try {
            localStorage.setItem('jlpt-particle-progress', JSON.stringify(this.particleProgress));
        } catch (error) {
            console.error('Error saving particle progress:', error);
        }
    }

    generateQuestion() {
        // Get particles for current difficulty level
        const availableParticles = particleDifficulty[this.difficulty] || particleDifficulty.beginner;
        
        if (availableParticles.length === 0) {
            console.error('No particles available for difficulty:', this.difficulty);
            return null;
        }

        // Find particle data for available particles
        const availableParticleData = particleData.filter(p => 
            availableParticles.includes(p.particle)
        );

        if (availableParticleData.length === 0) {
            console.error('No particle data found for available particles');
            return null;
        }

        // Select a particle (weighted towards less practiced ones)
        const selectedParticle = this.selectParticleForPractice(availableParticleData);
        
        if (!selectedParticle || !selectedParticle.examples || selectedParticle.examples.length === 0) {
            console.error('Selected particle has no examples:', selectedParticle);
            return null;
        }

        // Select a random example from the particle
        const randomExample = selectedParticle.examples[
            Math.floor(Math.random() * selectedParticle.examples.length)
        ];

        // Generate distractors (wrong options)
        const options = this.generateOptions(selectedParticle.particle, availableParticles);

        this.currentQuestion = {
            particle: selectedParticle.particle,
            reading: selectedParticle.reading,
            function: selectedParticle.function,
            description: selectedParticle.description,
            example: randomExample,
            options: options
        };

        console.log('🔗 Generated particle question for:', selectedParticle.particle);
        return this.currentQuestion;
    }

    selectParticleForPractice(availableParticleData) {
        // Weight selection towards particles that need more practice
        const weights = availableParticleData.map(particle => {
            const progress = this.particleProgress[particle.particle];
            const successRate = progress.attempts > 0 ? progress.correct / progress.attempts : 0;
            
            // Lower success rate = higher weight (more likely to be selected)
            return {
                particle: particle,
                weight: Math.max(0.1, 1 - successRate)
            };
        });

        // Weighted random selection
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.particle;
            }
        }

        // Fallback to first particle
        return availableParticleData[0];
    }

    generateOptions(correctParticle, availableParticles) {
        // Start with the correct answer
        const options = [correctParticle];
        
        // Add 2-3 distractors from available particles
        const distractors = availableParticles.filter(p => p !== correctParticle);
        
        // Shuffle and take up to 3 distractors
        const shuffled = this.shuffleArray([...distractors]);
        options.push(...shuffled.slice(0, 3));
        
        // If we don't have enough options, add some from other difficulty levels
        if (options.length < 4) {
            const allParticles = particleData.map(p => p.particle);
            const moreDistractors = allParticles.filter(p => !options.includes(p));
            const moreShuffled = this.shuffleArray(moreDistractors);
            options.push(...moreShuffled.slice(0, 4 - options.length));
        }

        // Shuffle the final options
        return this.shuffleArray(options);
    }

    validateAnswer(selectedParticle) {
        if (!this.currentQuestion) {
            return {
                isCorrect: false,
                correctParticle: '?',
                explanation: 'No active question',
                particleInfo: {
                    reading: '',
                    function: '',
                    description: ''
                }
            };
        }

        const correctParticle = this.currentQuestion.particle;
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

        // Update particle-specific progress
        const progress = this.particleProgress[correctParticle];
        if (progress) {
            progress.attempts++;
            if (isCorrect) {
                progress.correct++;
            }
            progress.lastSeen = Date.now();
            
            // Update state based on performance
            this.updateParticleState(correctParticle, isCorrect);
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
                description: this.currentQuestion.description
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
            // Incorrect answer - might demote state
            if (progress.state === 'mastered' && successRate < 0.8) {
                progress.state = 'review';
            } else if (progress.state === 'review' && successRate < 0.6) {
                progress.state = 'learning';
            }
        }
    }

    adjustDifficulty() {
        const sessionSuccessRate = this.sessionStats.attempted > 0 
            ? this.sessionStats.correct / this.sessionStats.attempted 
            : 0;

        // Adjust difficulty based on recent performance
        if (this.consecutiveCorrect >= 5 && sessionSuccessRate >= 0.8) {
            if (this.difficulty === 'beginner') {
                this.difficulty = 'intermediate';
                console.log('🔗 Difficulty increased to intermediate');
            } else if (this.difficulty === 'intermediate') {
                this.difficulty = 'advanced';
                console.log('🔗 Difficulty increased to advanced');
            }
            this.consecutiveCorrect = 0; // Reset counter
        } else if (this.consecutiveIncorrect >= 3 || sessionSuccessRate < 0.4) {
            if (this.difficulty === 'advanced') {
                this.difficulty = 'intermediate';
                console.log('🔗 Difficulty decreased to intermediate');
            } else if (this.difficulty === 'intermediate') {
                this.difficulty = 'beginner';
                console.log('🔗 Difficulty decreased to beginner');
            }
            this.consecutiveIncorrect = 0; // Reset counter
        }
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    getStats() {
        const stats = {
            session: this.sessionStats,
            difficulty: this.difficulty,
            particleProgress: {}
        };

        // Calculate stats for each particle
        Object.entries(this.particleProgress).forEach(([particle, progress]) => {
            stats.particleProgress[particle] = {
                state: progress.state,
                attempts: progress.attempts,
                correct: progress.correct,
                successRate: progress.attempts > 0 ? Math.round((progress.correct / progress.attempts) * 100) : 0
            };
        });

        return stats;
    }

    resetProgress() {
        this.particleProgress = {};
        this.difficulty = 'beginner';
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        this.sessionStats = {
            attempted: 0,
            correct: 0,
            particleSpecificStats: {}
        };
        
        this.initializeProgress();
        console.log('🔗 Particle quiz progress reset');
    }
}

// Export the particle data as well for external use
export { particleData, particleDifficulty, confusionPairs };