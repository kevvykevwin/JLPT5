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
        // 🆕 ADD THIS GUARD
        if (this.isPlaying) {
            console.log('Audio already playing, ignoring duplicate call');
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
        
        this.isPlaying = true; // 🆕 SET FLAG
        
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
            this.isPlaying = false; // 🆕 RESET FLAG
        }
    }

    async playAudioData(audioData) {
        try {
            // Convert base64 to audio blob
            const audioBlob = new Blob([
                Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
            ], { type: 'audio/mpeg' });
            
            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudio = new Audio(audioUrl);
            
            // Set up cleanup when audio ends
            this.currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                this.isPlaying = false; // 🆕 RESET ON END
            };
            
            this.currentAudio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                this.isPlaying = false; // 🆕 RESET ON ERROR
                throw new Error('Audio playback failed');
            };
            
            await this.currentAudio.play();
            
        } catch (error) {
            this.isPlaying = false; // 🆕 RESET ON EXCEPTION
            throw new Error(`Audio playback error: ${error.message}`);
        }
    }

    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.isPlaying = false; // 🆕 RESET FLAG
    }
}