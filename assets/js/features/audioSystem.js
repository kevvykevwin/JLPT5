// assets/js/features/audioSystem.js - FIXED Browser-Compatible Audio System

class AudioSystem {
    constructor() {
        this.audioCache = null;
        this.currentAudio = null;
        this.isInitialized = false;
        this.apiEndpoint = '/.netlify/functions/tts';
    }

    // Initialize IndexedDB for audio caching
    async initializeCache() {
        try {
            this.audioCache = await this.openDatabase();
            this.isInitialized = true;
            console.log('🔊 Audio cache initialized successfully');
        } catch (error) {
            console.warn('Audio cache initialization failed, continuing without cache:', error);
            this.isInitialized = false;
        }
    }

    // Open IndexedDB database
    openDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open('jlpt-audio-cache', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('audio')) {
                    const store = db.createObjectStore('audio', { keyPath: 'cacheKey' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Generate cache key for audio
    generateCacheKey(text, voice = 'ja-JP-Wavenet-B', speed = 1.0) {
        return `${text}-${voice}-${speed}`;
    }

    // Get audio from cache
    async getAudioFromCache(cacheKey) {
        if (!this.audioCache) return null;
        
        return new Promise((resolve) => {
            try {
                const transaction = this.audioCache.transaction(['audio'], 'readonly');
                const store = transaction.objectStore('audio');
                const request = store.get(cacheKey);
                
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        // Check if cache is still valid (30 days)
                        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                        if (result.timestamp > thirtyDaysAgo) {
                            resolve(result.audioData);
                        } else {
                            // Delete expired cache entry
                            this.deleteFromCache(cacheKey);
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = () => resolve(null);
            } catch (error) {
                console.error('Error getting audio from cache:', error);
                resolve(null);
            }
        });
    }

    // Save audio to cache
    async saveAudioToCache(cacheKey, audioData) {
        if (!this.audioCache) return;
        
        try {
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            
            store.put({
                cacheKey: cacheKey,
                audioData: audioData,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error saving audio to cache:', error);
        }
    }

    // Delete from cache
    async deleteFromCache(cacheKey) {
        if (!this.audioCache) return;
        
        try {
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            store.delete(cacheKey);
        } catch (error) {
            console.error('Error deleting from cache:', error);
        }
    }

    // Fetch audio from TTS API
    async fetchAudioFromAPI(text, voice = 'ja-JP-Wavenet-B', speed = 1.0) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice: voice,
                    speed: speed
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result.audio;
            
        } catch (error) {
            console.error('TTS API error:', error);
            throw error;
        }
    }

    // Main play audio function
    async playAudio(text, audioButton = null) {
        if (!text) {
            console.warn('No text provided for audio');
            return false;
        }

        const cacheKey = this.generateCacheKey(text);
        let success = false;

        // Update button state
        if (audioButton) {
            this.updateButtonState(audioButton, 'loading');
        }

        try {
            // Stop any currently playing audio
            this.stopCurrentAudio();

            // Try to get from cache first
            let audioData = await this.getAudioFromCache(cacheKey);
            
            if (!audioData) {
                // Fetch from API
                audioData = await this.fetchAudioFromAPI(text);
                
                // Cache the result
                await this.saveAudioToCache(cacheKey, audioData);
            }
            
            // Convert base64 to audio and play
            const audioBlob = new Blob([
                Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
            ], { type: 'audio/mpeg' });
            
            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudio = new Audio(audioUrl);
            
            // Set up event handlers
            this.currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
            };

            this.currentAudio.onerror = (error) => {
                console.error('Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
            };
            
            // Play the audio
            await this.currentAudio.play();
            success = true;
            
        } catch (error) {
            console.error('Audio playback failed:', error);
            this.showAudioError();
            success = false;
        } finally {
            // Reset button state
            if (audioButton) {
                this.updateButtonState(audioButton, 'normal');
            }
        }

        return success;
    }

    // Stop currently playing audio
    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    // Update button visual state
    updateButtonState(button, state) {
        if (!button) return;

        button.classList.remove('loading');
        button.disabled = false;

        switch (state) {
            case 'loading':
                button.classList.add('loading');
                button.disabled = true;
                button.innerHTML = '⏳';
                break;
            case 'normal':
                button.innerHTML = '🔊';
                break;
            case 'error':
                button.innerHTML = '❌';
                setTimeout(() => {
                    button.innerHTML = '🔊';
                }, 2000);
                break;
        }
    }

    // Show user-friendly error message
    showAudioError() {
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
            z-index: 1001;
            font-weight: 500;
        `;
        errorMsg.textContent = '🔊 Audio temporarily unavailable';
        document.body.appendChild(errorMsg);
        
        setTimeout(() => {
            if (document.body.contains(errorMsg)) {
                document.body.removeChild(errorMsg);
            }
        }, 3000);
    }

    // Clear all cached audio
    async clearCache() {
        if (!this.audioCache) return false;

        try {
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            store.clear();
            console.log('🗑️ Audio cache cleared');
            return true;
        } catch (error) {
            console.error('Error clearing audio cache:', error);
            return false;
        }
    }
}

// Create singleton instance
const audioSystem = new AudioSystem();

// Initialize audio system
export async function initializeAudio() {
    await audioSystem.initializeCache();
    return audioSystem;
}

// Export function to play card audio
export async function playCardAudio(text, button = null) {
    return await audioSystem.playAudio(text, button);
}

// Export for global access
export { AudioSystem, audioSystem };