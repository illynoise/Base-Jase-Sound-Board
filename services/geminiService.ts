import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToBlob } from '../utils/audio';

// NOTE: We do not check for API Key here. We assume the caller checks or the environment has it.
// If process.env.API_KEY is missing, the GoogleGenAI constructor might throw or fail on call.
// We'll handle errors gracefully in the UI.

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<Blob> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using the Flash TTS model as requested in guidelines
  const model = "gemini-2.5-flash-preview-tts";

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates returned from Gemini API");
  }

  const audioPart = candidates[0].content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('audio'));
  const base64Data = audioPart?.inlineData?.data;

  if (!base64Data) {
    throw new Error("No audio data found in the response.");
  }

  // The API returns raw PCM or encoded audio depending on internal defaults, 
  // but typically for TTS it handles encoding if we treat it as such or if specified.
  // The system instruction says: "The audio bytes returned by the API is raw PCM data... it contains no header information."
  // HOWEVER, for `gemini-2.5-flash-preview-tts` specifically, the response is typically audio data we can decode via AudioContext.
  // Wait, the system instruction says: "The audio bytes returned by the API is raw PCM data."
  // If it is raw PCM, we need to wrap it in a WAV container or decode it manually.
  // Let's use the decoding helper pattern from the system instructions which uses AudioContext to decode.
  // BUT, to save it as a Blob that is reusable for `audio.ts` (which uses `decodeAudioData` on a Blob), 
  // we need a Blob that `decodeAudioData` understands (like WAV/MP3).
  // If it's raw PCM, `decodeAudioData` might fail if it's not a supported container format.
  // 
  // Re-reading system instructions carefully: 
  // "The audio bytes returned by the API is raw PCM data. It is not a standard file format... it contains no header information."
  // 
  // To make this Blob usable by a standard <audio> tag or standard decodeAudioData later (after a page reload),
  // we should convert the raw PCM to a WAV Blob.
  
  // Step 1: Decode the base64 to a Uint8Array (PCM data)
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Step 2: Create a WAV header for the PCM data.
  // Gemini TTS default sample rate is 24000Hz (from system instruction example).
  // It is 1 channel (mono).
  // 16-bit depth (usually).
  const wavBlob = createWavFile(bytes, 24000, 1, 16);
  return wavBlob;
};

// Helper to create a WAV header for raw PCM data
function createWavFile(samples: Uint8Array, sampleRate: number, numChannels: number, bitDepth: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length, true);

  // write the PCM samples
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(samples);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}