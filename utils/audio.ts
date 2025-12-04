// AudioContext singleton to reuse across the app
let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

interface AudioSourceEntry {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

// Keep track of active sources and their gain nodes to allow Stop/Fade functionality
const activeSources: Set<AudioSourceEntry> = new Set();
let fadeTimeout: number | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Create Master Gain Node
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = 1.0;
    masterGainNode.connect(audioContext.destination);
  }
  return audioContext;
};

export const setMasterVolume = (volume: number) => {
  const ctx = getAudioContext();
  if (masterGainNode) {
    // Smooth transition to prevent clicks
    masterGainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
  }
};

export const stopAllSounds = () => {
  // Cancel any pending fade stop
  if (fadeTimeout) {
    window.clearTimeout(fadeTimeout);
    fadeTimeout = null;
  }

  activeSources.forEach(({ source, gain }) => {
    try {
      // Cancel any scheduled ramps (e.g. if we interrupt a fade with a hard stop)
      gain.gain.cancelScheduledValues(0);
      source.stop();
    } catch (e) {
      // Ignore errors if already stopped
    }
  });
  activeSources.clear();
};

export const fadeOutAllSounds = (duration: number) => {
  const ctx = getAudioContext();
  
  if (activeSources.size === 0) return;

  // If duration is effectively 0, just stop immediately
  if (duration <= 0.05) {
    stopAllSounds();
    return;
  }

  // Clear any existing fade timeout to avoid overlapping stops
  if (fadeTimeout) {
    window.clearTimeout(fadeTimeout);
    fadeTimeout = null;
  }

  // Ramp down all active gains
  const endTime = ctx.currentTime + duration;
  activeSources.forEach(({ gain }) => {
    try {
      // Cancel current scheduled values to start fresh
      gain.gain.cancelScheduledValues(ctx.currentTime);
      // Set value explicitly to current value to prevent jumping
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      // Linear ramp to 0
      gain.gain.linearRampToValueAtTime(0, endTime);
    } catch (e) {
      console.error("Error scheduling fade", e);
    }
  });

  // Schedule the hard stop after the fade completes
  fadeTimeout = window.setTimeout(() => {
    stopAllSounds();
  }, duration * 1000);
};

export const playAudioBlob = async (blob: Blob, volume: number = 1.0): Promise<void> => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Enforce Solo Mode: Stop all other sounds before starting this one
    stopAllSounds();

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const padGainNode = ctx.createGain();
    padGainNode.gain.value = volume;

    // Signal chain: Source -> Pad Gain -> Master Gain -> Destination
    source.connect(padGainNode);
    
    if (masterGainNode) {
      padGainNode.connect(masterGainNode);
    } else {
      // Fallback if master gain init failed
      padGainNode.connect(ctx.destination);
    }

    const entry: AudioSourceEntry = { source, gain: padGainNode };

    source.onended = () => {
      activeSources.delete(entry);
    };

    activeSources.add(entry);
    source.start(0);
  } catch (error) {
    console.error("Error playing audio:", error);
  }
};

// Utility to convert base64 to Blob
export const base64ToBlob = (base64: string, mimeType: string = 'audio/mp3'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};