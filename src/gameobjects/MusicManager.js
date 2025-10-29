// src/audio/MusicManager.js
export default class MusicManager {
  constructor(game) {
    this.game = game;
    this.currentMusic = null;
    this.currentKey = null;

    const v = MusicManager._readSavedVolume();
    this.game.sfxVolume = v;

    // Default config uses normalized 0..1 (and loop true)
    this.default_config = { loop: true, volume: v };
  }

  // --- Public API ---
  play(scene, key, config) {
    // Ensure the global sound manager is at the right volume BEFORE any play
    if (scene?.sound) scene.sound.volume = this.game.sfxVolume ?? 1;

    // Avoid starting the same track again
    if (this.currentKey === key && this.currentMusic?.isPlaying) return;

    // Stop previous
    if (this.currentMusic?.isPlaying) this.currentMusic.stop();

    // Merge config with our defaults (without overriding provided fields)
    const merged = { ...this.default_config, ...(config || {}) };
    if (typeof merged.volume !== "number") merged.volume = this.game.sfxVolume ?? 1;

    // Create & play
    this.currentMusic = scene.sound.add(key, merged);
    this.currentMusic.play();

    this.currentKey = key;
  }

  stop() {
    if (this.currentMusic?.isPlaying) this.currentMusic.stop();
    this.currentKey = null;
  }

  pause() {
    if (this.currentMusic?.isPlaying) this.currentMusic.pause();
  }

  resume() {
    if (this.currentMusic?.isPaused) this.currentMusic.resume();
  }

  isPlaying() {
    return !!(this.currentMusic?.isPlaying);
  }

  /**
   * Set volume from slider. Accepts 0..1 or 0..100 (or "80%").
   * Persists as 0..1, updates global + live track, and default_config.
   */
  setVolume(v) {
    const vol = MusicManager._normalize(v);
    this.game.sfxVolume = vol;
    localStorage.setItem("volume", String(vol));

    // Update defaults for future tracks
    this.default_config = { ...this.default_config, volume: vol };

    // Update live track
    if (this.currentMusic) this.currentMusic.setVolume(vol);

    // Update global sound manager in whatever scene is active
    // (Phaser exposes the activeScenes array on the game; if not available, caller can set manually)
    const scene = this._tryGetActiveScene();
    if (scene?.sound) scene.sound.volume = vol;
  }

  // --- Helpers ---
  _tryGetActiveScene() {
    // Best effort to find the top-most active scene
    try {
      const sys = this.game.scene;
      if (!sys) return null;
      const keys = sys.getScenes(true);
      return keys?.[keys.length - 1] || null;
    } catch {
      return null;
    }
  }

  static _normalize(raw) {
    if (raw == null) return 1;
    let s = String(raw).trim();
    const pct = s.endsWith("%");
    if (pct) s = s.slice(0, -1).trim();
    let n = parseFloat(s);
    if (!Number.isFinite(n)) return 1;
    if (pct || n > 1) n = n / 100; // accept 0..100 and "80%"
    // clamp 0..1
    return Math.max(0, Math.min(1, n));
  }

  static _readSavedVolume() {
    const raw = localStorage.getItem("volume");
    if (raw == null) return 1;
    return MusicManager._normalize(raw);
  }
}
