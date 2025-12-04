import React, { useState, useEffect } from 'react';
import { SoundPadData, PadColor } from '../types';
import { playAudioBlob } from '../utils/audio';

interface PadProps {
  data: SoundPadData;
  isEditMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPlay: () => void; // Parent handles play coordination
  isTriggered: boolean; // For external trigger visual feedback
}

const Pad: React.FC<PadProps> = ({ data, isEditMode, onEdit, onDelete, onPlay, isTriggered }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Handle external trigger (e.g. keyboard shortcut)
  useEffect(() => {
    if (isTriggered) {
      setIsPlaying(true);
      const timeout = setTimeout(() => setIsPlaying(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [isTriggered]);

  const handlePlayClick = async () => {
    if (isEditMode) return;
    if (!data.audioBlob) return;

    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 200);

    onPlay(); // Notify parent to coordinate play
    await playAudioBlob(data.audioBlob, data.volume);
  };

  const handleClick = () => {
    if (isEditMode) {
      onEdit();
    } else {
      handlePlayClick();
    }
  };

  return (
    <div 
      className="relative aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleClick}
        className={`
          w-full h-full rounded-xl transition-all duration-100 flex flex-col items-center justify-center p-4 shadow-lg border-b-4 relative
          ${data.audioBlob ? data.color : 'bg-gray-800 border-gray-700'}
          ${data.audioBlob ? 'text-white' : 'text-gray-500'}
          ${data.audioBlob ? 'hover:brightness-110 active:border-b-0 active:translate-y-1' : 'hover:bg-gray-750'}
          ${isPlaying ? 'brightness-125 scale-95 border-b-0 translate-y-1' : ''}
          ${isEditMode && isHovered ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
          ${data.audioBlob ? 'border-opacity-80 border-black/30' : ''}
        `}
      >
        {/* Shortcut Badge */}
        {data.shortcut && !isEditMode && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-block px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono font-bold text-white/90 backdrop-blur-sm border border-white/10 uppercase">
              {data.shortcut}
            </span>
          </div>
        )}

        {data.audioBlob ? (
          <>
            <div className="text-3xl mb-2 drop-shadow-md transition-transform duration-200" style={{ transform: isPlaying ? 'scale(1.2)' : 'scale(1)' }}>
               {isPlaying ? '🔊' : '🎵'}
            </div>
            <span className="text-sm font-bold truncate w-full text-center drop-shadow-md select-none">
              {data.name}
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center">
             <span className="text-4xl opacity-50 mb-1">+</span>
             <span className="text-xs font-medium opacity-50 uppercase tracking-wider">Empty</span>
          </div>
        )}
      </button>

      {/* Edit Overlay Controls */}
      {isEditMode && data.audioBlob && (
        <div className="absolute top-2 right-2 flex space-x-1">
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(); }}
             className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-500 shadow-lg transform hover:scale-110 transition-all z-20"
             title="Delete Sound"
           >
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>
        </div>
      )}
       {isEditMode && !data.audioBlob && isHovered && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="bg-gray-900/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">Click to Add</span>
         </div>
       )}
    </div>
  );
};

export default Pad;