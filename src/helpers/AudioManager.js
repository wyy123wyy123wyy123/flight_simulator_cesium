// src/helpers/AudioManager.js

export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {};
        this.sources = {};
        this.isEnabled = true;
        this.masterGain = this.audioContext.createGain(); // 主音量控制器
        this.masterGain.connect(this.audioContext.destination);
        this.masterVolume = 0.5;
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        this.isUnlocked = false;
    }

    async unlock() {
        if (this.isUnlocked) return true;
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.isUnlocked = this.audioContext.state === 'running';
        if (this.isUnlocked) console.log('AudioContext unlocked successfully');
        return this.isUnlocked;
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
        } catch (error) {
            console.error(`Failed to load sound: ${name}`, error);
            throw error;
        }
    }

    play(name, options = {}) {
        if (!this.isEnabled || !this.buffers[name] || !this.isUnlocked || this.sources[name]) {
             // 如果已经在播放，则不重复播放
            return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = options.loop || false;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(options.volume ?? 1.0, this.audioContext.currentTime);
        gainNode.connect(this.masterGain);
        source.connect(gainNode);

        source.start(0);

        this.sources[name] = { source, gainNode, baseVolume: options.volume ?? 1.0 };
    }

    stop(name) {
        if (this.sources[name]) {
            this.sources[name].source.stop(0);
            delete this.sources[name];
        }
    }
    
    // 播放一次性音效
    playOneShot(name, options = {}) {
        if (!this.isEnabled || !this.buffers[name] || !this.isUnlocked) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[name];
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime((options.volume ?? 1.0), this.audioContext.currentTime);
        
        gainNode.connect(this.masterGain);
        source.connect(gainNode);
        source.start(0);
    }

    updateEngineSound(speed, maxSpeed, stallSpeed) {
        const engine = this.sources.engine;
        if (!engine || !this.isUnlocked) return;

        const speedRatio = Math.max(0, Math.min(1, speed / maxSpeed));
        
        // 更新音量
        const volumeFactor = speed < stallSpeed ? 0.3 : 0.5 + speedRatio * 0.5;
        const targetVolume = engine.baseVolume * volumeFactor;
        // 使用线性渐变，避免音量突变
        engine.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + 0.1);

        // 更新播放速率 (音高)
        const playbackRate = 0.8 + speedRatio * 0.7;
        engine.source.playbackRate.linearRampToValueAtTime(playbackRate, this.audioContext.currentTime + 0.1);
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) this.stopAll();
    }

    stopAll() {
        Object.keys(this.sources).forEach(name => this.stop(name));
    }

    destroy() {
        this.stopAll();
        this.audioContext.close();
        this.buffers = {};
    }
}