// assets/js/ui/QuizRenderer.js
console.log('📦 QuizRenderer.js loading...');

export class QuizRenderer {
    constructor(appState, stateManager, audio, vocabulary, particleQuiz, notifier, onRenderCallback) {
        this.state = appState;
        this.stateManager = stateManager;
        this.audio = audio;
        this.vocabulary = vocabulary;
        this.particleQuiz = particleQuiz;
        this.notifier = notifier;
        this.speedTimerInterval = null;
        this.currentParticleQuestion = null;
        this.currentQuestionDirection = null;
        
        // ✅ Now this will receive the actual callback from UIManager
        this.onRenderCallback = onRenderCallback || (() => {});
        
        console.log('✅ QuizRenderer initialized with callback:', !!onRenderCallback);
    }
    
    render(card) {
        const quizMode = this.state.get('currentQuizMode') || 'multiple-choice';
        
        console.log('🧠 Rendering quiz card:', card.japanese);
        
        const quizQuestion = document.getElementById('quizQuestion');
        const quizOptions = document.getElementById('quizOptions');
        
        if (!quizQuestion || !quizOptions) {
            console.error('❌ Quiz elements not found');
            return;
        }
        
        // Clear previous state
        quizOptions.style.cssText = '';
        quizOptions.innerHTML = '';
        this.clearSpeedTimer();
        
        // ✅ Reset direction for new question
        this.currentQuestionDirection = null;
        
        // Hide audio section by default
        const quizAudioSection = document.getElementById('quizAudioSection');
        if (quizAudioSection) {
            quizAudioSection.style.display = 'none';
        }
        
        // Route to appropriate quiz type
        if (quizMode === 'particle-quiz') {
            this.renderParticleQuiz(card);
        } else {
            this.renderVocabularyQuiz(card, quizMode, quizQuestion, quizOptions, quizAudioSection);
        }
        
        this.state.set('quizAnswered', false);
    }
    
    renderVocabularyQuiz(card, quizMode, quizQuestion, quizOptions, quizAudioSection) {
        // Render question based on mode
        switch (quizMode) {
            case 'listening-first':
                quizQuestion.className = 'japanese-word quiz-question listening-mode';
                quizQuestion.textContent = '🔊 Listen carefully and choose the meaning';
                this.currentQuestionDirection = 'jp-to-en'; // ✅ Set direction
                
                if (quizAudioSection) {
                    quizAudioSection.style.display = 'flex';
                    this.setupAudioButton(card);
                }
                break;
                
            case 'speed-challenge':
                quizQuestion.innerHTML = `
                    <div style="font-size: 56px; margin-bottom: 20px; font-weight: 900;">${card.japanese}</div>
                    <div style="font-size: 14px; color: #ff6b6b; font-weight: 600; text-transform: uppercase;">⚡ SPEED ROUND - 8 SECONDS! ⚡</div>
                `;
                this.currentQuestionDirection = 'jp-to-en'; // ✅ Set direction
                this.startSpeedTimer(8, card);
                break;
                
            case 'kanji-only':
                quizQuestion.innerHTML = `
                    <div style="font-size: 72px; margin-bottom: 25px; font-weight: 900;">${card.japanese}</div>
                    <div style="font-size: 16px; color: #666; font-style: italic;">Recognize this kanji</div>
                `;
                this.currentQuestionDirection = 'jp-to-en'; // ✅ Set direction
                break;
                
            case 'mixed-challenge':
                // ✅ FIX 2: Properly set direction for mixed challenge
                if (Math.random() < 0.5) {
                    // Japanese to English
                    quizQuestion.innerHTML = `
                        <div style="font-size: 36px; margin-bottom: 15px;">${card.japanese}</div>
                        <div style="font-size: 16px; color: #666;">What does this mean?</div>
                    `;
                    this.currentQuestionDirection = 'jp-to-en';
                    console.log('🎯 Mixed Challenge: JP→EN');
                } else {
                    // English to Japanese
                    quizQuestion.innerHTML = `
                        <div style="font-size: 24px; color: #2e7d32; margin-bottom: 15px;">"${card.meaning}"</div>
                        <div style="font-size: 16px; color: #666;">What is this in Japanese?</div>
                    `;
                    this.currentQuestionDirection = 'en-to-jp';
                    console.log('🎯 Mixed Challenge: EN→JP');
                }
                break;
                
            default: // multiple-choice
                quizQuestion.className = 'japanese-word quiz-question';
                quizQuestion.innerHTML = `
                    <div style="font-size: 40px; margin-bottom: 10px; font-weight: bold;">${card.japanese}</div>
                    <div style="font-size: 16px; color: #666;">${card.reading}</div>
                `;
                this.currentQuestionDirection = 'jp-to-en'; // ✅ Set direction
                break;
        }
        
        // Generate and render options
        this.renderQuizOptions(card, quizMode, quizOptions);
    }
    
    setupAudioButton(card) {
        const quizAudioButton = document.getElementById('quizAudioButton');
        if (!quizAudioButton) return;
        
        // Remove old listeners by cloning
        const newButton = quizAudioButton.cloneNode(true);
        quizAudioButton.parentNode.replaceChild(newButton, quizAudioButton);
        
        // Add click handler
        newButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await this.audio.playAudio(card.japanese, { buttonElement: newButton });
            } catch (error) {
                console.error('Audio playback failed:', error);
            }
        });
    }
    
    renderQuizOptions(card, quizMode, container) {
    const cachedOptionsKey = `quiz-options-${card.japanese}`;
    let options;
    
    if (this.state.get(cachedOptionsKey) && !this.state.get('quizAnswered')) {
        options = this.state.get(cachedOptionsKey);
        console.log('♻️ Reusing cached quiz options');
    } else {
        options = this.generateQuizOptions(card, 4);
        this.state.set(cachedOptionsKey, options);
        console.log('🎲 Generated new quiz options');
    }
    
        const kanaMode = this.state.get('kanaMode');
        console.log(`🎨 Rendering ${this.currentQuestionDirection} options with kanaMode: ${kanaMode}`);
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            
            if (this.currentQuestionDirection === 'en-to-jp') {
                // English to Japanese: Show JAPANESE as answers
                const japaneseDiv = document.createElement('div');
                japaneseDiv.style.cssText = 'font-size: 20px; font-weight: 600; font-family: "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;';
                japaneseDiv.textContent = option.japanese;
                button.appendChild(japaneseDiv);
                
                // ✅ FIX: ALWAYS create reading div, control visibility with display
                const readingDiv = document.createElement('div');
                readingDiv.className = 'quiz-option-reading';
                readingDiv.style.cssText = `font-size: 14px; color: #666; margin-top: 5px; display: ${kanaMode ? 'block' : 'none'};`;
                readingDiv.textContent = option.reading;
                button.appendChild(readingDiv);
                
            } else {
                // Japanese to English (default): Show ENGLISH as answers
                const meaningDiv = document.createElement('div');
                meaningDiv.style.cssText = 'font-size: 16px; font-weight: 500;';
                meaningDiv.textContent = option.meaning;
                button.appendChild(meaningDiv);
                
                // ✅ FIX: ALWAYS create reading div (except kanji-only), control visibility
                if (quizMode !== 'kanji-only') {
                    const readingDiv = document.createElement('div');
                    readingDiv.className = 'quiz-option-reading';
                    readingDiv.style.cssText = `font-size: 14px; color: #666; margin-top: 5px; display: ${kanaMode ? 'block' : 'none'};`;
                    readingDiv.textContent = option.reading;
                    button.appendChild(readingDiv);
                }
            }
            
            button.onclick = () => this.selectQuizAnswer(button, option, card);
            container.appendChild(button);
        });
    }
    
    generateQuizOptions(correctCard, count = 4) {
        const allWords = this.vocabulary.getAllWords();
        const options = [correctCard];
        
        const otherCards = allWords.filter(c => c.japanese !== correctCard.japanese);
        const shuffled = this.shuffleArray(otherCards);
        options.push(...shuffled.slice(0, count - 1));
        
        return this.shuffleArray(options);
    }
    
    selectQuizAnswer(button, selectedOption, correctCard, isTimeout = false) {
        if (this.state.get('quizAnswered')) return;
        
        this.clearSpeedTimer();
        this.state.set('quizAnswered', true);
        
        const isCorrect = selectedOption.japanese === correctCard.japanese;
        const allOptions = document.querySelectorAll('.quiz-option');
        
        if (isCorrect && !isTimeout) {
            button.classList.add('correct');
            this.showNotification('✅ Correct!', 'success');
        } else {
            if (button && !isTimeout) {
                button.classList.add('incorrect');
            }
            
            // Highlight correct answer based on direction
            allOptions.forEach(opt => {
                const optText = opt.textContent.trim();
                let isCorrectOption = false;
                
                if (this.currentQuestionDirection === 'en-to-jp') {
                    isCorrectOption = optText.includes(correctCard.japanese);
                } else {
                    isCorrectOption = optText.includes(correctCard.meaning);
                }
                
                if (isCorrectOption) {
                    opt.classList.add('correct');
                }
            });
            
            const message = isTimeout 
                ? `⏰ Time's up! Answer: ${correctCard.meaning} (${correctCard.reading})`
                : `❌ Wrong. Answer: ${correctCard.meaning} (${correctCard.reading})`;
            this.showNotification(message, 'error');
        }
        
        allOptions.forEach(opt => opt.classList.add('disabled'));
        
        // ✅ FIX: Use the callback instead of calling render directly
        setTimeout(() => {
            // Clear cached options for CURRENT card
            this.state.set(`quiz-options-${correctCard.japanese}`, null);
            
            // Advance card via StateManager
            this.stateManager.advanceCard(() => {
                console.log('🔄 Auto-advance triggered callback');
                // ✅ This calls UIManager.renderCurrentCard() + updateAll()
                this.onRenderCallback();
            });
        }, 2000);
    }
    
    // ... (rest of the particle quiz methods remain the same)
    
    renderParticleQuiz(vocabularyCard) {
    console.log('🔗 Rendering particle quiz');
    
    const quizQuestion = document.getElementById('quizQuestion');
    const quizOptions = document.getElementById('quizOptions');
    
    if (!quizQuestion || !quizOptions) {
        console.error('❌ Quiz elements not found');
        return;
    }
    
    const question = this.particleQuiz.generateQuestion();
    
    if (!question) {
        console.error('❌ Failed to generate particle question');
        return;
    }
    
    this.currentParticleQuestion = question;
    
    const sentence = question.example.japanese;
    const correctParticle = question.example.correct;
    
    // ✅ FIX: Search for underscore placeholder, not the particle!
    const particleIndex = sentence.indexOf('_');
    
    if (particleIndex === -1) {
        console.error('❌ Underscore placeholder not found in sentence:', sentence);
        return;
    }
    
    const beforeParticle = sentence.substring(0, particleIndex);
    const afterParticle = sentence.substring(particleIndex + 1);  // Skip underscore
    
    console.log('✂️ Split sentence:', {
        before: beforeParticle, 
        particle: correctParticle, 
        after: afterParticle
    });
        
        const sentenceHTML = `
            <div style="position: relative; padding: 20px 0;">
                <div style="font-size: 32px; line-height: 1.4; margin: 25px 0; font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif; text-align: center; color: #1b5e20; word-spacing: 0.1em;">
                    ${beforeParticle}<span class="particle-blank" id="particleBlank" style="display: inline-block; min-width: 60px; height: 45px; border: 3px dashed #9c27b0; border-radius: 8px; margin: 0 5px; position: relative; vertical-align: middle; background: rgba(156, 39, 176, 0.1); animation: pulse-blank 2s infinite; line-height: 45px; text-align: center; font-size: 18px; font-weight: bold;"></span>${afterParticle}
                </div>
                <div style="font-size: 16px; color: #666; font-style: italic; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0; max-width: 90%; margin-left: auto; margin-right: auto;">
                    ${question.example.english}
                </div>
            </div>
        `;
        
        quizQuestion.className = 'japanese-word quiz-question';
        quizQuestion.innerHTML = sentenceHTML;
        
        quizOptions.innerHTML = '';
        quizOptions.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; justify-content: center; margin: 25px auto; max-width: 200px;';
        
        question.options.forEach(particle => {
            const button = document.createElement('button');
            button.className = 'particle-option';
            button.style.cssText = `
                width: 80px; 
                height: 80px; 
                border: 3px solid #e0e0e0; 
                border-radius: 12px;
                background: white; 
                font-size: 26px; 
                font-weight: bold; 
                cursor: pointer;
                transition: all 0.3s ease; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `;
            button.textContent = particle;
            
            button.addEventListener('mouseenter', () => {
                if (!this.state.get('quizAnswered')) {
                    button.style.borderColor = '#9c27b0';
                    button.style.transform = 'translateY(-3px) scale(1.05)';
                    button.style.boxShadow = '0 6px 20px rgba(156, 39, 176, 0.3)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (!this.state.get('quizAnswered')) {
                    button.style.borderColor = '#e0e0e0';
                    button.style.transform = 'none';
                    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }
            });
            
            button.onclick = () => this.selectParticleAnswer(button, particle);
            quizOptions.appendChild(button);
        });
    }
    
    selectParticleAnswer(button, selectedParticle) {
        if (this.state.get('quizAnswered')) return;
        
        this.state.set('quizAnswered', true);
        
        const question = this.currentParticleQuestion;
        if (!question) return;
        
        const isCorrect = selectedParticle === question.example.correct;
        const allOptions = document.querySelectorAll('.particle-option');
        
        const blank = document.getElementById('particleBlank');
        if (blank) {
            blank.textContent = selectedParticle;
            blank.style.cssText = `
                display: inline-block; 
                min-width: 60px; 
                height: 45px;
                border: 3px solid ${isCorrect ? '#4caf50' : '#f44336'};
                border-radius: 8px; 
                margin: 0 5px;
                background: ${isCorrect ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
                line-height: 45px; 
                text-align: center; 
                font-size: 18px; 
                font-weight: bold;
                color: ${isCorrect ? '#2e7d32' : '#c62828'};
                animation: none;
            `;
        }
        
        if (isCorrect) {
            button.style.borderColor = '#4caf50';
            button.style.background = 'rgba(76, 175, 80, 0.2)';
            button.style.animation = 'correct-bounce 0.6s ease';
            this.showNotification('✅ Correct!', 'success');
        } else {
            button.style.borderColor = '#f44336';
            button.style.background = 'rgba(244, 67, 54, 0.2)';
            button.style.animation = 'incorrect-shake 0.6s ease';
            
            allOptions.forEach(opt => {
                if (opt.textContent === question.example.correct) {
                    opt.style.borderColor = '#4caf50';
                    opt.style.background = 'rgba(76, 175, 80, 0.2)';
                    opt.style.animation = 'correct-bounce 0.6s ease';
                }
            });
            
            this.showNotification(`❌ Wrong. Correct: ${question.example.correct}`, 'error');
        }
        
        allOptions.forEach(opt => {
            opt.style.pointerEvents = 'none';
            opt.style.opacity = '0.7';
        });
        
        setTimeout(() => {
            this.showParticleExplanation(question);
        }, 500);
        
        this.particleQuiz.validateAnswer(selectedParticle);
        
        // ✅ FIX: Use callback here too
        setTimeout(() => {
            this.stateManager.advanceCard(() => {
                console.log('🔄 Particle quiz auto-advance triggered callback');
                this.onRenderCallback();
            });
        }, 4000);
    }
    
    showNotification(message, type) {
        if (this.notifier) {
            this.notifier.show(message, type);
        }
    }
    
    showParticleExplanation(question) {
        const quizQuestion = document.getElementById('quizQuestion');
        if (!quizQuestion) return;
        
        const explanationHTML = `
            <div style="margin-top: 20px; padding: 15px; background: rgba(156, 39, 176, 0.05); border-radius: 8px; border-left: 4px solid #9c27b0; text-align: left;">
                <div style="font-size: 18px; font-weight: bold; color: #7b1fa2; margin-bottom: 5px;">
                    ${question.particle} (${question.reading})
                </div>
                <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                    ${question.function}
                </div>
                <div style="font-size: 16px; color: #333; line-height: 1.4; margin-bottom: 10px;">
                    ${question.description}
                </div>
                <div style="font-size: 14px; color: #666; margin-top: 10px; font-style: italic; padding: 10px; background: white; border-radius: 6px;">
                    💡 ${question.example.explanation}
                </div>
            </div>
        `;
        
        quizQuestion.insertAdjacentHTML('beforeend', explanationHTML);
    }
    
    // ========================================
    // SPEED TIMER - ✅ FIXED
    // ========================================
    
    startSpeedTimer(seconds, card) {
        let timeLeft = seconds;
        const timerDiv = document.createElement('div');
        timerDiv.className = 'speed-timer';
        timerDiv.textContent = `${timeLeft}s`;
        
        const quizContainer = document.getElementById('quizContainer');
        if (quizContainer) {
            quizContainer.appendChild(timerDiv);
        }
        
        this.speedTimerInterval = setInterval(() => {
            timeLeft--;
            if (timerDiv.parentNode) {
                timerDiv.textContent = `${timeLeft}s`;
                if (timeLeft <= 3) timerDiv.classList.add('warning');
            }
            
            if (timeLeft <= 0) {
                this.clearSpeedTimer();
                
                // ✅ FIX 5: Call selectQuizAnswer with timeout flag
                if (!this.state.get('quizAnswered')) {
                    console.log('⏰ Speed timer expired - triggering timeout');
                    this.selectQuizAnswer(null, card, card, true); // isTimeout = true
                }
            }
        }, 1000);
    }
    
    clearSpeedTimer() {
        if (this.speedTimerInterval) {
            clearInterval(this.speedTimerInterval);
            this.speedTimerInterval = null;
        }
        document.querySelectorAll('.speed-timer').forEach(timer => timer.remove());
    }
    
    // ========================================
    // UTILITIES
    // ========================================
    
    updateQuizReadingVisibility(showReadings) {
        const readings = document.querySelectorAll('.quiz-option-reading');
        console.log(`📝 Updating ${readings.length} readings to ${showReadings ? 'VISIBLE' : 'HIDDEN'}`);
        
        readings.forEach(reading => {
            reading.style.display = showReadings ? 'block' : 'none';
        });
    }
    
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

console.log('✅ QuizRenderer.js loaded');