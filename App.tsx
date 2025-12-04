import React, { useEffect, useState, useRef } from 'react';
import { SoundPadData, PadColor } from './types';
import Pad from './components/Pad';
import EditModal from './components/EditModal';
import { savePadToDB, getPadsFromDB, deletePadFromDB } from './utils/db';
import { stopAllSounds, fadeOutAllSounds, setMasterVolume, playAudioBlob } from './utils/audio';

const TOTAL_PADS = 16; // 4x4 Grid

const App: React.FC = () => {
  const [pads, setPads] = useState<SoundPadData[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Audio State
  const [masterVolume, setMasterVolumeState] = useState(1.0);
  const [fadeDuration, setFadeDuration] = useState(2.0);
  
  // Visual Trigger State (for keyboard feedback)
  const [triggeredPadId, setTriggeredPadId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPadId, setEditingPadId] = useState<string | null>(null);

  // Ref for pads to access in event listeners
  const padsRef = useRef<SoundPadData[]>([]);

  // Update ref when pads change
  useEffect(() => {
    padsRef.current = pads;
  }, [pads]);

  // Global Keyboard Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Ignore standalone modifiers
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Meta');

      let key = e.key;
      if (key === ' ') key = 'Space';
      if (key.length === 1) key = key.toUpperCase();
      
      parts.push(key);
      const combo = parts.join('+');

      const pad = padsRef.current.find(p => p.shortcut === combo);
      
      // If we found a pad with this shortcut and it has audio
      if (pad && pad.audioBlob) {
        e.preventDefault();
        
        // Trigger Visual Feedback
        setTriggeredPadId(pad.id);
        setTimeout(() => setTriggeredPadId(null), 200);

        // Play Sound (Solo Logic is built into playAudioBlob)
        playAudioBlob(pad.audioBlob, pad.volume);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Initialize Pads
  useEffect(() => {
    const initPads = async () => {
      // Create skeleton pads
      const skeletonPads: SoundPadData[] = Array.from({ length: TOTAL_PADS }, (_, i) => ({
        id: `pad-${i}`,
        name: 'Empty',
        color: PadColor.SLATE,
        volume: 1.0,
      }));

      try {
        const storedPads = await getPadsFromDB();
        // Merge stored pads into skeleton
        const merged = skeletonPads.map(sk => {
          const found = storedPads.find(sp => sp.id === sk.id);
          return found ? found : sk;
        });
        setPads(merged);
      } catch (e) {
        console.error("Failed to load pads from DB", e);
        setPads(skeletonPads);
      }
    };
    initPads();
  }, []);

  const handleEditPad = (id: string) => {
    setEditingPadId(id);
    setIsModalOpen(true);
  };

  const handleSavePad = async (name: string, color: string, blob: Blob | null, volume: number, shortcut?: string) => {
    if (!editingPadId) return;

    // Determine if we are updating an existing pad with data or creating new
    const existingPad = pads.find(p => p.id === editingPadId);
    
    // If no blob is provided and we are just changing name/color/volume, keep old blob
    const finalBlob = blob || existingPad?.audioBlob;

    if (!finalBlob) return; // Should probably validate this in modal

    const newPadData: SoundPadData = {
      id: editingPadId,
      name,
      color,
      volume,
      shortcut, // Save shortcut
      audioBlob: finalBlob
    };

    // Optimistic Update
    setPads(prev => prev.map(p => p.id === editingPadId ? newPadData : p));

    // Persist
    try {
      await savePadToDB(newPadData);
    } catch (e) {
      console.error("Failed to save to DB", e);
      alert("Could not save sound. Storage might be full.");
    }
  };

  const handleDeletePad = async (id: string) => {
    if (!window.confirm("Are you sure you want to clear this sound?")) return;
    
    // Reset to empty state
    const emptyPad: SoundPadData = {
        id,
        name: 'Empty',
        color: PadColor.SLATE,
        volume: 1.0
    };

    setPads(prev => prev.map(p => p.id === id ? emptyPad : p));
    
    try {
      await deletePadFromDB(id);
    } catch (e) {
      console.error("Failed to delete from DB", e);
    }
  };

  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVolumeState(val);
    setMasterVolume(val);
  };

  const handleFadeOut = () => {
    fadeOutAllSounds(fadeDuration);
  };

  const activePad = pads.find(p => p.id === editingPadId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col">
      
      {/* Navbar */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
               <span className="text-white font-bold text-lg">B</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">Base Jase Sound Board</h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
             {/* Master Volume */}
             <div className="hidden sm:flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1.5 border border-gray-700/50">
                <div className="text-gray-400 px-1">
                   {masterVolume === 0 ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                   ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                   )}
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={masterVolume}
                  onChange={handleMasterVolumeChange}
                  className="w-20 lg:w-32 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
                />
             </div>

             <div className="h-8 w-px bg-gray-700 mx-1 hidden sm:block"></div>

             {/* Mode Toggle */}
             <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                <button
                   onClick={() => setIsEditMode(false)}
                   className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all ${!isEditMode ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                   Play
                </button>
                <button
                   onClick={() => setIsEditMode(true)}
                   className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all ${isEditMode ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                   Edit
                </button>
             </div>
             
             {/* Fade Controls */}
             <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
               <div className="flex flex-col px-1 justify-center">
                 <span className="text-[10px] text-gray-400 uppercase font-bold leading-none">Fade</span>
                 <span className="text-[10px] text-blue-400 font-mono leading-none">{fadeDuration}s</span>
               </div>
               <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.5"
                  value={fadeDuration}
                  onChange={(e) => setFadeDuration(parseFloat(e.target.value))}
                  className="w-16 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  title={`Fade Duration: ${fadeDuration}s`}
               />
               <button
                 onClick={handleFadeOut}
                 className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md font-bold text-xs uppercase shadow-lg shadow-orange-900/30 transition-all active:scale-95"
                 title={`Fade out over ${fadeDuration} seconds`}
               >
                 Fade
               </button>
             </div>

             {/* Stop All Button */}
             <button
               onClick={stopAllSounds}
               className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg font-bold shadow-lg shadow-red-900/50 transition-all transform active:scale-95 ml-2 border border-red-500"
               title="Stop All Currently Playing Sounds Immediately"
             >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
                <span className="hidden lg:inline">STOP ALL</span>
                <span className="lg:hidden">STOP</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Status Bar */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
             <div>
                <h2 className="text-2xl font-bold text-white mb-1">Soundboard</h2>
                <p className="text-gray-400 text-sm">
                   {isEditMode 
                     ? 'Select a pad to edit its sound or appearance.' 
                     : 'Click pads or use shortcuts to play (Solo Mode Active).'}
                </p>
             </div>
             
             {/* Mobile Volume (only shown on small screens) */}
             <div className="sm:hidden w-full flex items-center space-x-2 bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                 <span className="text-xs text-gray-500 uppercase font-bold">Vol</span>
                 <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={masterVolume}
                  onChange={handleMasterVolumeChange}
                  className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
             </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {pads.map((pad) => (
              <Pad
                key={pad.id}
                data={pad}
                isEditMode={isEditMode}
                onEdit={() => handleEditPad(pad.id)}
                onDelete={() => handleDeletePad(pad.id)}
                onPlay={() => {}} // Local play is handled by Pad click, logic is in Pad
                isTriggered={triggeredPadId === pad.id}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-600 text-sm border-t border-gray-900 bg-gray-950">
        <p>Base Jase Sound Board &copy; 2024. Powered by Gemini AI.</p>
      </footer>

      {/* Modals */}
      <EditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePad}
        initialName={activePad?.name}
        initialColor={activePad?.color}
        initialVolume={activePad?.volume}
        initialShortcut={activePad?.shortcut}
      />
    </div>
  );
};

export default App;