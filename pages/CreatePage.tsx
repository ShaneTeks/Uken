import React, { useState, ChangeEvent, useMemo, useEffect, useCallback } from 'react';
// import { GoogleGenAI } from "@google/genai"; // Import commented out until real API key is available
import type { EditableItemType } from '../types'; // Only import necessary types

// Simulate process.env.API_KEY for structure, actual key must be in environment
// const process = { env: { API_KEY: "YOUR_API_KEY_HERE_OR_FROM_ENVIRONMENT" } }; // Do NOT use like this in prod.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Correct initialization

// --- Local Type Definitions for this component's state ---
interface Shot {
  id: string;
  name: string;
  image_url?: string; // Changed from imageUrl, made optional
  file?: File;
  prompt?: string;
  isGenerating?: boolean;
}

interface Scene {
  id: string;
  type: 'scene';
  name: string;
  shots: Shot[];
}

interface Episode {
  id: string;
  type: 'episode';
  name: string;
  scenes: Scene[];
}

interface Chapter {
  id: string;
  type: 'chapter';
  name: string;
  episodes: Episode[];
}

interface Season {
  id: string;
  type: 'season';
  name: string;
  chapters: Chapter[];
}

type EditableItem = Season | Chapter | Episode | Scene;
// --- End Local Type Definitions ---


const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const XMarkIcon = ({className = "w-5 h-5 text-red-500"}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);


const CreatePage: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]); // Uses local Season
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Editing state
  const [editingItem, setEditingItem] = useState<{ id: string; type: EditableItemType; currentName: string } | null>(null);

  // Shot preview modal state
  const [viewingShot, setViewingShot] = useState<Shot | null>(null); // Uses local Shot

  // Generate Shot modal state
  const [showGenerateShotModal, setShowGenerateShotModal] = useState(false);
  const [genShotChar1, setGenShotChar1] = useState('');
  const [genShotChar2, setGenShotChar2] = useState('');
  const [genShotLocation, setGenShotLocation] = useState('');
  const [genShotPrompt, setGenShotPrompt] = useState('');


  // Memoized selectors
  const selectedSeason = useMemo(() => seasons.find(s => s.id === selectedSeasonId), [seasons, selectedSeasonId]);
  const selectedChapter = useMemo(() => selectedSeason?.chapters.find(c => c.id === selectedChapterId), [selectedSeason, selectedChapterId]);
  const selectedEpisode = useMemo(() => selectedChapter?.episodes.find(e => e.id === selectedEpisodeId), [selectedChapter, selectedEpisodeId]);
  const selectedScene = useMemo(() => selectedEpisode?.scenes.find(s => s.id === selectedSceneId), [selectedEpisode, selectedSceneId]);

  // --- Navigation Handlers ---
  const handleSelectSeason = (id: string | null) => { setSelectedSeasonId(id); setSelectedChapterId(null); setSelectedEpisodeId(null); setSelectedSceneId(null); setEditingItem(null);};
  const handleSelectChapter = (id: string | null) => { setSelectedChapterId(id); setSelectedEpisodeId(null); setSelectedSceneId(null); setEditingItem(null);};
  const handleSelectEpisode = (id: string | null) => { setSelectedEpisodeId(id); setSelectedSceneId(null); setEditingItem(null);};
  const handleSelectScene = (id: string | null) => { setSelectedSceneId(id); setEditingItem(null);};

  // --- Edit Handlers ---
  const handleStartEdit = (item: EditableItem) => { // Uses local EditableItem
    setEditingItem({ id: item.id, type: item.type, currentName: item.name });
  };

  const handleNameChange = (newName: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, currentName: newName });
    }
  };

  const handleSaveName = () => {
    if (!editingItem) return;
    const { id, type, currentName } = editingItem;

    setSeasons(prevSeasons =>
      prevSeasons.map(s => {
        if (s.id === id && type === 'season') return { ...s, name: currentName };
        if (s.id !== selectedSeasonId && type !== 'season') return s; // Optimization

        return {
          ...s,
          chapters: s.chapters.map(c => {
            if (c.id === id && type === 'chapter') return { ...c, name: currentName };
            if (c.id !== selectedChapterId && type !== 'chapter') return c;

            return {
              ...c,
              episodes: c.episodes.map(e => {
                if (e.id === id && type === 'episode') return { ...e, name: currentName };
                if (e.id !== selectedEpisodeId && type !== 'episode') return e;
                
                return {
                  ...e,
                  scenes: e.scenes.map(sc => 
                    (sc.id === id && type === 'scene') ? { ...sc, name: currentName } : sc
                  ),
                };
              }),
            };
          }),
        };
      })
    );
    setEditingItem(null);
  };
  
  const handleCancelEdit = () => setEditingItem(null);

  // --- Add Handlers ---
  const handleAddSeason = () => { setSeasons([...seasons, { id: generateId(), type: 'season', name: `Season ${seasons.length + 1}`, chapters: [] }]); };
  const handleAddChapter = () => {
    if (!selectedSeasonId) return;
    setSeasons(prev => prev.map(s => s.id === selectedSeasonId ? { ...s, chapters: [...s.chapters, { id: generateId(), type: 'chapter', name: `Chapter ${s.chapters.length + 1}`, episodes: [] }] } : s));
  };
  const handleAddEpisode = () => {
    if (!selectedChapterId || !selectedSeasonId) return;
    setSeasons(prev => prev.map(s => s.id === selectedSeasonId ? { ...s, chapters: s.chapters.map(c => c.id === selectedChapterId ? { ...c, episodes: [...c.episodes, { id: generateId(), type: 'episode', name: `Episode ${c.episodes.length + 1}`, scenes: [] }] } : c) } : s));
  };
  const handleAddScene = () => {
    if (!selectedEpisodeId || !selectedChapterId || !selectedSeasonId) return;
    setSeasons(prev => prev.map(s => s.id === selectedSeasonId ? { ...s, chapters: s.chapters.map(c => c.id === selectedChapterId ? { ...c, episodes: c.episodes.map(e => e.id === selectedEpisodeId ? { ...e, scenes: [...e.scenes, { id: generateId(), type: 'scene', name: `Scene ${e.scenes.length + 1}`, shots: [] }] } : e) } : c) } : s));
  };
  
  const addShotToState = (newShot: Shot) => { // Uses local Shot
     if (!selectedSceneId || !selectedEpisodeId || !selectedChapterId || !selectedSeasonId) return;
      setSeasons(prevSeasons =>
        prevSeasons.map(s =>
          s.id === selectedSeasonId
            ? { ...s, chapters: s.chapters.map(c =>
                c.id === selectedChapterId
                  ? { ...c, episodes: c.episodes.map(e =>
                      e.id === selectedEpisodeId
                        ? { ...e, scenes: e.scenes.map(sc =>
                            sc.id === selectedSceneId
                              ? { ...sc, shots: [...sc.shots, newShot] }
                              : sc
                          ),}
                        : e),}
                    : c),}
            : s));
  }

  const handleFileUploadShot = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      addShotToState({
        id: generateId(),
        name: file.name || `Shot ${Date.now()}`,
        image_url: reader.result as string, // Changed to image_url
        file: file,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; 
  };

  const handleGenerateShot = async () => {
    if (!selectedScene) return;
    const prompt = `Characters: ${genShotChar1}${genShotChar2 ? ', ' + genShotChar2 : ''}. Location: ${genShotLocation}. Scene: ${genShotPrompt}`;
    const shotId = generateId();

    // Add placeholder shot immediately with loading state
    addShotToState({
      id: shotId,
      name: `Generating: ${genShotPrompt.substring(0,20)}...`,
      prompt: prompt,
      isGenerating: true,
      image_url: 'https://via.placeholder.com/640x360.png?text=Generating...' // Changed to image_url
    });
    setShowGenerateShotModal(false);
    setGenShotChar1(''); setGenShotChar2(''); setGenShotLocation(''); setGenShotPrompt('');

    // --- SIMULATED Gemini API Call ---
    console.log("Simulating Gemini API call for: ", prompt);
    // try {
    //   // Ensure process.env.API_KEY is available in your execution environment
    //   if (!process.env.API_KEY) {
    //      throw new Error("API_KEY environment variable is not set.");
    //   }
    //   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    //   const response = await ai.models.generateImages({
    //     model: 'imagen-3.0-generate-002',
    //     prompt: prompt,
    //     config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
    //   });
    //   const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    //   const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`; // This would be image_url
      
    //   // Update shot with generated image
    //   setSeasons(prev => prev.map(s => ({ ...s, chapters: s.chapters.map(c => ({ ...c, episodes: c.episodes.map(ep => ({ ...ep, scenes: ep.scenes.map(sc => sc.id === selectedScene.id ? { ...sc, shots: sc.shots.map(sh => sh.id === shotId ? { ...sh, image_url: imageUrl, name: genShotPrompt.substring(0,30) || 'Generated Shot', isGenerating: false } : sh) } : sc ) })) })) }));

    // } catch (error) {
    //   console.error("Error generating image (simulated):", error);
    //   // Update shot to reflect error
    //   setSeasons(prev => prev.map(s => ({ ...s, chapters: s.chapters.map(c => ({ ...c, episodes: c.episodes.map(ep => ({ ...ep, scenes: ep.scenes.map(sc => sc.id === selectedScene.id ? { ...sc, shots: sc.shots.map(sh => sh.id === shotId ? { ...sh, name: 'Generation Failed', isGenerating: false, image_url: 'https://via.placeholder.com/640x360.png?text=Error' } : sh) } : sc ) })) })) }));
    // }
    // --- End SIMULATED Gemini API Call ---
    
    // For now, replace with a different placeholder after a delay to simulate generation
    setTimeout(() => {
        const simulatedImageUrl = `https://picsum.photos/seed/${shotId}/800/450`; // Larger, different placeholder
        setSeasons(prev => prev.map(s => ({ ...s, chapters: s.chapters.map(c => ({ ...c, episodes: c.episodes.map(ep => ({ ...ep, scenes: ep.scenes.map(sc => sc.id === selectedScene.id ? { ...sc, shots: sc.shots.map(sh => sh.id === shotId ? { ...sh, image_url: simulatedImageUrl, name: genShotPrompt.substring(0,30) || 'Generated Shot', isGenerating: false } : sh) } : sc ) })) })) }));
    }, 2000);
  };
  
  // Close modals with Escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (viewingShot) setViewingShot(null);
      if (showGenerateShotModal) setShowGenerateShotModal(false);
      if (editingItem) handleCancelEdit();
    }
  }, [viewingShot, showGenerateShotModal, editingItem]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // --- UI Styling & Reusable Components ---
  const breadcrumbButtonClass = "hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1";
  const activeBreadcrumbClass = "font-semibold text-gray-800";
  const inactiveBreadcrumbClass = "text-gray-500 hover:text-gray-700";
  
  const listItemClass = "block w-full text-left p-3 bg-white hover:bg-gray-50 rounded-md shadow-sm border border-gray-200 mb-2 transition-colors duration-150 ease-in-out";
  const listTitleClass = "text-lg font-medium text-indigo-700";
  const itemActionsClass = "ml-auto flex items-center space-x-2";
  
  const buttonClass = "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors duration-150 ease-in-out";
  const secondaryButtonClass = "bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md text-sm transition-colors";
  const sectionContainerClass = "p-4 bg-gray-100 rounded-lg shadow mt-4";
  
  // Updated shot display classes
  const shotListContainerClass = "mt-4 space-y-6"; // Changed from grid to vertical list
  const shotItemClass = "relative w-full bg-white rounded-lg overflow-hidden shadow-md group cursor-pointer"; // Takes full width, white background
  const shotImageClass = "w-full h-auto object-contain block rounded-md"; // Full width, auto height, contain image

  const shotGeneratingOverlayClass = "absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center text-white p-4";


  const renderEditableName = (item: EditableItem) => { // Uses local EditableItem
    if (editingItem?.id === item.id) {
      return (
        <div className="flex items-center w-full">
          <input
            type="text"
            value={editingItem.currentName}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEdit(); }}
            className="flex-grow p-1 border border-indigo-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
            autoFocus
          />
          <button onClick={handleSaveName} className="p-1 ml-2" aria-label="Save name"><CheckIcon /></button>
          <button onClick={handleCancelEdit} className="p-1 ml-1" aria-label="Cancel edit"><XMarkIcon /></button>
        </div>
      );
    }
    return (
      <div className="flex items-center w-full">
        <span className={listTitleClass}>{item.name}</span>
        <div className={itemActionsClass}>
          <button onClick={(e) => { e.stopPropagation(); handleStartEdit(item);}} className="p-1 text-gray-400 hover:text-indigo-600" aria-label={`Edit name for ${item.name}`}>
            <PencilIcon />
          </button>
        </div>
      </div>
    );
  };
  

  // --- Render Functions for Content ---
  const renderSeasons = () => (
    <div className={sectionContainerClass}>
      <h2 className="text-xl font-semibold text-gray-700 mb-3">Seasons</h2>
      <button onClick={handleAddSeason} className={`${buttonClass} mb-2`} aria-label="Add new season">Add Season</button>
      {seasons.length === 0 && <p className="text-gray-500">No seasons yet.</p>}
      {seasons.map(s => <button key={s.id} onClick={() => !editingItem && handleSelectSeason(s.id)} className={listItemClass}>{renderEditableName(s)}</button>)}
    </div>
  );

  const renderChapters = () => {
    if (!selectedSeason) return null;
    return (
      <div className={sectionContainerClass}>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Chapters in {selectedSeason.name}</h2>
        <button onClick={handleAddChapter} className={`${buttonClass} mb-2`} aria-label={`Add chapter to ${selectedSeason.name}`}>Add Chapter</button>
        {selectedSeason.chapters.length === 0 && <p className="text-gray-500">No chapters yet.</p>}
        {selectedSeason.chapters.map(c => <button key={c.id} onClick={() => !editingItem && handleSelectChapter(c.id)} className={listItemClass}>{renderEditableName(c)}</button>)}
      </div>
    );
  };

  const renderEpisodes = () => {
    if (!selectedChapter) return null;
    return (
      <div className={sectionContainerClass}>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Episodes in {selectedChapter.name}</h2>
        <button onClick={handleAddEpisode} className={`${buttonClass} mb-2`} aria-label={`Add episode to ${selectedChapter.name}`}>Add Episode</button>
        {selectedChapter.episodes.length === 0 && <p className="text-gray-500">No episodes yet.</p>}
        {selectedChapter.episodes.map(e => <button key={e.id} onClick={() => !editingItem && handleSelectEpisode(e.id)} className={listItemClass}>{renderEditableName(e)}</button>)}
      </div>
    );
  };

  const renderScenes = () => {
    if (!selectedEpisode) return null;
    return (
      <div className={sectionContainerClass}>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Scenes in {selectedEpisode.name}</h2>
        <button onClick={handleAddScene} className={`${buttonClass} mb-2`} aria-label={`Add scene to ${selectedEpisode.name}`}>Add Scene</button>
        {selectedEpisode.scenes.length === 0 && <p className="text-gray-500">No scenes yet.</p>}
        {selectedEpisode.scenes.map(sc => <button key={sc.id} onClick={() => !editingItem && handleSelectScene(sc.id)} className={listItemClass}>{renderEditableName(sc)}</button>)}
      </div>
    );
  };

  const renderShots = () => {
    if (!selectedScene) return null;
    return (
      <div className={sectionContainerClass}>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Shots in {selectedScene.name}</h2>
        <div className="flex space-x-2 mb-4">
            <label htmlFor={`shot-upload-${selectedScene.id}`} className={`${buttonClass} cursor-pointer inline-block`}>
               Upload Image
            </label>
            <input type="file" id={`shot-upload-${selectedScene.id}`} className="hidden" accept="image/*" onChange={handleFileUploadShot} aria-label={`Upload shot to ${selectedScene.name}`}/>
            <button onClick={() => setShowGenerateShotModal(true)} className={`${secondaryButtonClass}`}>Generate Shot</button>
        </div>

        {selectedScene.shots.length === 0 && <p className="text-gray-500 mt-2">No shots in this scene yet.</p>}
        <div className={shotListContainerClass}> {/* Use new class for list layout */}
          {selectedScene.shots.map(shot => (
            <div key={shot.id} className={shotItemClass} title={shot.name} onClick={() => setViewingShot(shot)}>
              {shot.image_url && ( // Changed to image_url
                <img 
                  src={shot.image_url} // Changed to image_url
                  alt={shot.name} 
                  className={shotImageClass} // Use new class for image styling
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                <p className="text-sm font-medium truncate">{shot.name}</p>
                {shot.prompt && <p className="text-xs truncate hidden md:block">{shot.prompt}</p>}
              </div>
              {shot.isGenerating && (
                <div className={shotGeneratingOverlayClass}>
                  <svg className="animate-spin h-8 w-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Generating Image...</span>
                   {shot.name && shot.name.startsWith("Generating:") && <span className="text-xs text-gray-300 mt-1">{shot.name.replace("Generating:", "").trim()}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-2 sm:p-6 bg-gray-50 rounded-lg shadow-inner min-h-[calc(100vh-10rem)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Create Your Animation Project</h1>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 p-3 bg-white rounded-md shadow-sm">
        <ol className="flex items-center space-x-2 text-sm flex-wrap">
          <li><button onClick={() => handleSelectSeason(null)} className={`${breadcrumbButtonClass} ${!selectedSeasonId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={!selectedSeasonId ? 'page' : undefined}>All Seasons</button></li>
          {selectedSeason && (<><li><span className="text-gray-400">/</span></li><li><button onClick={() => {handleSelectSeason(selectedSeasonId); handleSelectChapter(null);}} className={`${breadcrumbButtonClass} ${selectedSeasonId && !selectedChapterId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={selectedSeasonId && !selectedChapterId ? 'page' : undefined}>{selectedSeason.name}</button></li></>)}
          {selectedChapter && (<><li><span className="text-gray-400">/</span></li><li><button onClick={() => {handleSelectChapter(selectedChapterId); handleSelectEpisode(null);}} className={`${breadcrumbButtonClass} ${selectedChapterId && !selectedEpisodeId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={selectedChapterId && !selectedEpisodeId ? 'page' : undefined}>{selectedChapter.name}</button></li></>)}
          {selectedEpisode && (<><li><span className="text-gray-400">/</span></li><li><button onClick={() => {handleSelectEpisode(selectedEpisodeId); handleSelectScene(null);}} className={`${breadcrumbButtonClass} ${selectedEpisodeId && !selectedSceneId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={selectedEpisodeId && !selectedSceneId ? 'page' : undefined}>{selectedEpisode.name}</button></li></>)}
          {selectedScene && (<><li><span className="text-gray-400">/</span></li><li><span className={`${activeBreadcrumbClass} px-1`} aria-current="page">{selectedScene.name}</span></li></>)}
        </ol>
      </nav>

      {!selectedSeasonId && renderSeasons()}
      {selectedSeasonId && !selectedChapterId && renderChapters()}
      {selectedChapterId && !selectedEpisodeId && renderEpisodes()}
      {selectedEpisodeId && !selectedSceneId && renderScenes()}
      {selectedSceneId && renderShots()}

      {/* Shot Preview Modal */}
      {viewingShot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={() => setViewingShot(null)} role="dialog" aria-modal="true" aria-labelledby="shot-preview-title">
          <div className="bg-white p-2 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
                <h3 id="shot-preview-title" className="text-lg font-medium text-gray-800 truncate">{viewingShot.name}</h3>
                <button onClick={() => setViewingShot(null)} className="text-gray-500 hover:text-gray-800" aria-label="Close image preview">
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>
            {viewingShot.image_url && <img src={viewingShot.image_url} alt={`Preview of ${viewingShot.name}`} className="w-full h-auto object-contain max-h-[calc(90vh-50px)] rounded" />}
             {viewingShot.prompt && <p className="text-xs text-gray-500 mt-2 p-1 bg-gray-100 rounded">Prompt: {viewingShot.prompt}</p>}
          </div>
        </div>
      )}

      {/* Generate Shot Modal */}
      {showGenerateShotModal && selectedScene && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={() => setShowGenerateShotModal(false)} role="dialog" aria-modal="true" aria-labelledby="generate-shot-title">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 id="generate-shot-title" className="text-xl font-semibold text-gray-800">Generate New Shot for {selectedScene.name}</h3>
                    <button onClick={() => setShowGenerateShotModal(false)} className="text-gray-500 hover:text-gray-800" aria-label="Close generate shot dialog">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleGenerateShot(); }} className="space-y-4">
                    <div>
                        <label htmlFor="genChar1" className="block text-sm font-medium text-gray-700">Character 1 (Optional)</label>
                        <input type="text" id="genChar1" value={genShotChar1} onChange={e => setGenShotChar1(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Brave Knight" />
                    </div>
                    <div>
                        <label htmlFor="genChar2" className="block text-sm font-medium text-gray-700">Character 2 (Optional)</label>
                        <input type="text" id="genChar2" value={genShotChar2} onChange={e => setGenShotChar2(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Friendly Dragon" />
                    </div>
                    <div>
                        <label htmlFor="genLocation" className="block text-sm font-medium text-gray-700">Location (Optional)</label>
                        <input type="text" id="genLocation" value={genShotLocation} onChange={e => setGenShotLocation(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Enchanted Forest" />
                    </div>
                    <div>
                        <label htmlFor="genPrompt" className="block text-sm font-medium text-gray-700">Prompt for Gemini</label>
                        <textarea id="genPrompt" value={genShotPrompt} onChange={e => setGenShotPrompt(e.target.value)} rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Describe the scene, actions, mood..." required />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setShowGenerateShotModal(false)} className={secondaryButtonClass}>Cancel</button>
                        <button type="submit" className={buttonClass}>Generate Shot</button>
                    </div>
                </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default CreatePage;