export interface SoundPadData {
  id: string;
  name: string;
  color: string;
  volume: number;
  shortcut?: string;
  audioBlob?: Blob; // The actual audio data
}

export interface SoundPadConfig {
  id: string;
  name: string;
  color: string;
  volume: number;
  shortcut?: string;
}

export enum PadColor {
  RED = 'bg-red-500',
  ORANGE = 'bg-orange-500',
  AMBER = 'bg-amber-500',
  GREEN = 'bg-green-500',
  EMERALD = 'bg-emerald-500',
  TEAL = 'bg-teal-500',
  CYAN = 'bg-cyan-500',
  SKY = 'bg-sky-500',
  BLUE = 'bg-blue-500',
  INDIGO = 'bg-indigo-500',
  VIOLET = 'bg-violet-500',
  PURPLE = 'bg-purple-500',
  FUCHSIA = 'bg-fuchsia-500',
  PINK = 'bg-pink-500',
  ROSE = 'bg-rose-500',
  SLATE = 'bg-slate-500',
}

export const AVAILABLE_COLORS = [
  { label: 'Red', value: PadColor.RED },
  { label: 'Orange', value: PadColor.ORANGE },
  { label: 'Yellow', value: PadColor.AMBER },
  { label: 'Green', value: PadColor.GREEN },
  { label: 'Teal', value: PadColor.TEAL },
  { label: 'Blue', value: PadColor.BLUE },
  { label: 'Indigo', value: PadColor.INDIGO },
  { label: 'Purple', value: PadColor.PURPLE },
  { label: 'Pink', value: PadColor.PINK },
  { label: 'Gray', value: PadColor.SLATE },
];

export enum ModalTab {
  UPLOAD = 'Upload File',
  AI_GENERATE = 'AI Generate',
}