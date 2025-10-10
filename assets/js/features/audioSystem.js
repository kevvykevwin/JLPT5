// assets/js/features/audioSystem.js

export class AudioSystem {
    constructor() {
        this.audioCache = null;
        this.currentAudio = null;
        this.isInitialized = false;
        this.defaultVoice = 'ja-JP-Wavenet-B';
        this.defaultSpeed = 1.0;
        this.isPlaying = false; // 🆕 ADDED
        this.initializeCache();
    }

    // Initialize IndexedDB for audio caching
    async initializeCache() {
        try {
            this.audioCache = await this.openDatabase();
            this.isInitialized = true;
            console.log('Audio cache initialized successfully');
        } catch (error) {
            console.warn('Audio cache initialization failed:', error);
            // Continue without caching
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
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

    // Get audio from cache
    async getAudioFromCache(cacheKey) {
        if (!this.audioCache) return null;
        
        try {
            return new Promise((resolve) => {
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
            });
        } catch (error) {
            console.warn('Error retrieving from audio cache:', error);
            return null;
        }
    }

    // Save audio to cache
    async saveAudioToCache(cacheKey, audioData) {
        if (!this.audioCache) return;
        
        try {
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            
            await store.put({
                cacheKey: cacheKey,
                audioData: audioData,
                timestamp: Date.now()
            });
        } catch (error) {
            console.warn('Error saving to audio cache:', error);
        }
    }

    // Delete from cache
    async deleteFromCache(cacheKey) {
        if (!this.audioCache) return;
        
        try {
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            await store.delete(cacheKey);
        } catch (error) {
            console.warn('Error deleting from audio cache:', error);
        }
    }

    // Clear old cache entries
    async clearOldCache(daysOld = 30) {
        if (!this.audioCache) return;
        
        try {
            const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            const index = store.index('timestamp');
            
            const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        } catch (error) {
            console.warn('Error clearing old cache:', error);
        }
    }

    // 🆕 UPDATED: Main audio playback function
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

    async fetchFromTTS(text, voice, speed) {
        const response = await fetch('/.netlify/functions/tts', {
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
            throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.audio) {
            throw new Error('No audio data received from TTS API');
        }
        
        return result.audio;
    }

    // 🆕 UPDATED: playAudioData with instance tracking
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

    // 🆕 UPDATED: stopCurrentAudio with unlock
    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.isPlaying = false; // 🆕 UNLOCK
    }

    updateButtonState(buttonElement, state) {
        if (!buttonElement) return;
        
        buttonElement.disabled = state === 'loading';
        
        switch (state) {
            case 'loading':
                buttonElement.classList.add('loading');
                buttonElement.innerHTML = '⏳';
                break;
            case 'normal':
                buttonElement.classList.remove('loading');
                buttonElement.innerHTML = '🔊';
                break;
            case 'error':
                buttonElement.classList.remove('loading');
                buttonElement.innerHTML = '❌';
                setTimeout(() => {
                    buttonElement.innerHTML = '🔊';
                }, 2000);
                break;
        }
    }

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

    // Quick play function for event handlers
    async quickPlay(text, buttonElement) {
        try {
            await this.playAudio(text, { buttonElement });
        } catch (error) {
            console.error('Quick play failed:', error);
            if (buttonElement) {
                this.updateButtonState(buttonElement, 'error');
            }
        }
    }

    // Preload audio for better performance
    async preloadAudio(textArray, options = {}) {
        const results = [];
        
        for (const text of textArray) {
            try {
                const {
                    voice = this.defaultVoice,
                    speed = this.defaultSpeed
                } = options;
                
                const cacheKey = `${text}-${voice}-${speed}`;
                
                // Check if already cached
                const cached = await this.getAudioFromCache(cacheKey);
                if (cached) {
                    results.push({ text, status: 'cached' });
                    continue;
                }
                
                // Fetch and cache
                const audioData = await this.fetchFromTTS(text, voice, speed);
                await this.saveAudioToCache(cacheKey, audioData);
                results.push({ text, status: 'preloaded' });
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                results.push({ text, status: 'failed', error: error.message });
            }
        }
        
        return results;
    }

    // Get cache statistics
    async getCacheStats() {
        if (!this.audioCache) {
            return { supported: false };
        }
        
        try {
            const transaction = this.audioCache.transaction(['audio'], 'readonly');
            const store = transaction.objectStore('audio');
            
            return new Promise((resolve) => {
                const countRequest = store.count();
                countRequest.onsuccess = () => {
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = () => {
                        const entries = getAllRequest.result;
                        let totalSize = 0;
                        
                        entries.forEach(entry => {
                            totalSize += new Blob([entry.audioData]).size;
                        });
                        
                        resolve({
                            supported: true,
                            entryCount: entries.length,
                            totalSize: totalSize,
                            totalSizeFormatted: this.formatBytes(totalSize),
                            oldestEntry: entries.length > 0 ? 
                                new Date(Math.min(...entries.map(e => e.timestamp))) : null,
                            newestEntry: entries.length > 0 ? 
                                new Date(Math.max(...entries.map(e => e.timestamp))) : null
                        });
                    };
                };
            });
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return { supported: true, error: error.message };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Clear all cached audio
    async clearCache() {
        if (!this.audioCache) return false;
        
        try {
            const transaction = this.audioCache.transaction(['audio'], 'readwrite');
            const store = transaction.objectStore('audio');
            await store.clear();
            return true;
        } catch (error) {
            console.error('Error clearing audio cache:', error);
            return false;
        }
    }

    // Check if audio is supported
    isAudioSupported() {
        return !!(window.Audio && window.fetch && window.indexedDB);
    }

    // Get current audio status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isPlaying: !!(this.currentAudio && !this.currentAudio.paused),
            cacheSupported: !!this.audioCache,
            audioSupported: this.isAudioSupported()
        };
    }

    // Cleanup method
    cleanup() {
        this.stopCurrentAudio();
        if (this.audioCache) {
            this.audioCache.close();
            this.audioCache = null;
        }
    }
}