// In assets/js/features/audioSystem.js

export class AudioSystem {
    constructor() {
        this.audioCache = null;
        this.currentAudio = null;
        this.isInitialized = false;
        this.defaultVoice = 'ja-JP-Wavenet-B';
        this.defaultSpeed = 1.0;
        this.isPlaying = false; // 🆕 ADD THIS
        this.initializeCache();
    }

    // Main audio playback function
    async playAudio(text, options = {}) {
        // 🆕 PREVENT DUPLICATE PLAYBACK
        if (this.isPlaying) {
            console.log('🔊 Audio already playing, ignoring duplicate call');
            return;
        }

        const {
            voice = this.defaultVoice,
            speed = this.defaultSpeed,
            buttonElement = null
        } = options;

        if (!text || typeof text !== 'string') {
            throw new Error('Text is required and must be a string');
        }

        const cacheKey = `${text}-${voice}-${speed}`;
        
        this.isPlaying = true; // 🆕 LOCK
        
        // Update button state if provided
        if (buttonElement) {
            this.updateButtonState(buttonElement, 'loading');
        }

        try {
            // Stop any currently playing audio
            this.stopCurrentAudio();
            
            // Check cache first
            let audioData = await this.getAudioFromCache(cacheKey);
            
            if (!audioData) {
                // Fetch from TTS API
                audioData = await this.fetchFromTTS(text, voice, speed);
                
                // Cache the result
                await this.saveAudioToCache(cacheKey, audioData);
            }
            
            // Convert base64 to audio and play
            await this.playAudioData(audioData);
            
            return true;
            
        } catch (error) {
            console.error('Audio playback error:', error);
            this.showAudioError();
            throw error;
        } finally {
            // Reset button state
            if (buttonElement) {
                this.updateButtonState(buttonElement, 'normal');
            }
            this.isPlaying = false; // 🆕 UNLOCK
        }
    }

    // UPDATED: playAudioData with instance tracking
    async playAudioData(audioData) {
        try {
            // 🆕 ENSURE ONLY ONE INSTANCE
            this.stopCurrentAudio();
            
            // Convert base64 to audio blob
            const audioBlob = new Blob([
                Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
            ], { type: 'audio/mpeg' });
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            // 🆕 STORE BEFORE PLAYING
            this.currentAudio = audio;
            
            // Set up cleanup when audio ends
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                }
                this.isPlaying = false; // 🆕 UNLOCK ON END
            };
            
            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                }
                this.isPlaying = false; // 🆕 UNLOCK ON ERROR
                throw new Error('Audio playback failed');
            };
            
            // 🆕 SINGLE PLAY CALL
            await audio.play();
            console.log('🔊 Audio started playing');
            
        } catch (error) {
            this.isPlaying = false; // 🆕 UNLOCK ON EXCEPTION
            throw new Error(`Audio playback error: ${error.message}`);
        }
    }

    // UPDATED: stopCurrentAudio with unlock
    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.isPlaying = false; // 🆕 UNLOCK
    }
}