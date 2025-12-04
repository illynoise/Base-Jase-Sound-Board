import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_COLORS, PadColor, ModalTab } from '../types';
import { generateSpeech } from '../services/geminiService';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, blob: Blob | null, volume: number, shortcut?: string) => void;
  initialName?: string;
  initialColor?: string;
  initialVolume?: number;
  initialShortcut?: string;
}

const EditModal: React.FC<EditModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialName = '', 
  initialColor = PadColor.BLUE,
  initialVolume = 1.0,
  initialShortcut = ''
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [volume, setVolume] = useState(initialVolume);
  const [shortcut, setShortcut] = useState(initialShortcut);
  const [activeTab, setActiveTab] = useState<ModalTab>(ModalTab.UPLOAD);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // AI Gen State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  // Shortcut Recording
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const shortcutInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setColor(initialColor);
      setVolume(initialVolume);
      setShortcut(initialShortcut);
      setSelectedFile(null);
      setGeneratedBlob(null);
      setPrompt('');
      setAiError(null);
    }
  }, [isOpen, initialName, initialColor, initialVolume, initialShortcut]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-set name if empty
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const blob = await generateSpeech(prompt, selectedVoice);
      setGeneratedBlob(blob);
      if (!name) {
        setName(prompt.substring(0, 15) + (prompt.length > 15 ? '...' : ''));
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate speech');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    let blobToSave: Blob | null = null;
    
    if (activeTab === ModalTab.UPLOAD && selectedFile) {
      blobToSave = selectedFile;
    } else if (activeTab === ModalTab.AI_GENERATE && generatedBlob) {
      blobToSave = generatedBlob;
    }

    onSave(name, color, blobToSave, volume, shortcut);
    onClose();
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore standalone modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    // Handle Backspace/Delete to clear
    if (e.key === 'Backspace' || e.key === 'Delete') {
      setShortcut('');
      setIsRecordingShortcut(false);
      shortcutInputRef.current?.blur();
      return;
    }

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');
    
    // Normalize key
    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toUpperCase();
    
    parts.push(key);
    
    setShortcut(parts.join('+'));
    
    // Stop recording after capturing valid combo
    setIsRecordingShortcut(false);
    shortcutInputRef.current?.blur();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gray-850 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gray-900">
          <h2 className="text-xl font-bold text-white">Edit Sound Pad</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === ModalTab.UPLOAD ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab(ModalTab.UPLOAD)}
          >
            Upload MP3
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === ModalTab.AI_GENERATE ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab(ModalTab.AI_GENERATE)}
          >
            Generate (Gemini AI)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Label</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Air Horn"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Shortcut Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Shortcut</label>
              <div className="relative">
                <input 
                  ref={shortcutInputRef}
                  type="text" 
                  value={isRecordingShortcut ? 'Press keys...' : (shortcut || '')}
                  onFocus={() => setIsRecordingShortcut(true)}
                  onBlur={() => setIsRecordingShortcut(false)}
                  onKeyDown={handleShortcutKeyDown}
                  placeholder="Click to record"
                  readOnly={!isRecordingShortcut} 
                  className={`w-full bg-gray-900 border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 cursor-pointer
                    ${isRecordingShortcut ? 'border-blue-500 ring-2 ring-blue-500/50 text-blue-300' : 'border-gray-700'}
                  `}
                />
                {shortcut && !isRecordingShortcut && (
                  <button 
                    onClick={(e) => { e.preventDefault(); setShortcut(''); }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                    title="Clear Shortcut"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Specific Content */}
          {activeTab === ModalTab.UPLOAD ? (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-900/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept="audio/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className="text-4xl mb-2">📂</div>
                <p className="text-sm text-gray-400">
                  {selectedFile ? selectedFile.name : "Click to select an audio file"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Text to Speech Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter text for the AI to speak..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                />
              </div>

              <div className="flex space-x-4">
                 <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Voice</label>
                    <select 
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Kore">Kore (Female, Soothing)</option>
                      <option value="Puck">Puck (Male, Energetic)</option>
                      <option value="Charon">Charon (Male, Deep)</option>
                      <option value="Fenrir">Fenrir (Male, Intense)</option>
                      <option value="Zephyr">Zephyr (Female, Calm)</option>
                    </select>
                 </div>
                 <div className="flex items-end">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt}
                      className={`px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center ${isGenerating || !prompt ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : 'Generate'}
                    </button>
                 </div>
              </div>
              
              {aiError && (
                 <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{aiError}</p>
              )}

              {generatedBlob && (
                <div className="bg-green-900/20 border border-green-800 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-green-400 text-sm">Audio Generated Successfully!</span>
                  <button 
                    onClick={() => {
                        // Quick preview
                        const url = URL.createObjectURL(generatedBlob);
                        new Audio(url).play();
                    }}
                    className="text-xs bg-green-700 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    ▶ Preview
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Color Picker */}
          <div>
             <label className="block text-sm font-medium text-gray-400 mb-2">Button Color</label>
             <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`h-8 w-full rounded transition-transform ${c.value} ${color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                    title={c.label}
                  />
                ))}
             </div>
          </div>
          
           {/* Volume Slider */}
           <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Volume: {Math.round(volume * 100)}%</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-900/50 transition-colors"
          >
            Save Pad
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditModal;