import { useState, ChangeEvent, useMemo, useEffect, useCallback } from 'react';
import type { Season, Chapter, Episode, Scene, Shot, EditableNamedItem, EditableItemType } from '../../types'; // Adjusted path
import Navbar from './components/Navbar.tsx';
import { PencilIcon } from './components/PencilIcon.tsx';
import { CheckIcon } from './components/CheckIcon.tsx';
import { XMarkIcon } from '../../components/icons/XMarkIcon.tsx';
import { supabase } from '../../supabaseClient.ts';
import { useBackground } from '../../contexts/BackgroundContext.tsx';
import LoadingScreen from './components/LoadingScreen';
// import { GoogleGenAI } from "@google/genai"; // Real Gemini API

const PAGE_KEY = "create"; // Unique key for this page's background
const STORAGE_BUCKET_NAME = 'location-images'; // Images will go to public/{scene_id}/, Videos will go to public/videos/{scene_id}/

const CreatePage = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<{ id: string; type: EditableItemType; currentName: string } | null>(null);
  const [editingDescriptionItem, setEditingDescriptionItem] = useState<{ id: string; type: 'chapter' | 'episode' | 'scene'; currentDescription: string } | null>(null);

  const [viewingShot, setViewingShot] = useState<Shot | null>(null);
  const [showGenerateShotModal, setShowGenerateShotModal] = useState(false);
  const [genShotChar1, setGenShotChar1] = useState('');
  const [genShotChar2, setGenShotChar2] = useState('');
  const [genShotLocation, setGenShotLocation] = useState('');
  const [genShotPromptText, setGenShotPromptText] = useState('');

  const { backgrounds, isLoading: isLoadingBackgrounds } = useBackground();

  useEffect(() => {
    const bgImage = backgrounds[PAGE_KEY] || backgrounds['global'];
    document.body.style.backgroundImage = bgImage ? `url(${bgImage})` : '';
    document.body.style.backgroundSize = bgImage ? 'cover' : '';
    document.body.style.backgroundPosition = bgImage ? 'center center' : '';
    document.body.style.backgroundRepeat = bgImage ? 'no-repeat' : '';
    document.body.style.backgroundAttachment = bgImage ? 'fixed' : '';

    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    };
  }, [backgrounds]);

  const selectedSeason = useMemo(() => seasons.find(s => s.id === selectedSeasonId), [seasons, selectedSeasonId]);
  const selectedChapter = useMemo(() => selectedSeason?.chapters.find(c => c.id === selectedChapterId), [selectedSeason, selectedChapterId]);
  const selectedEpisode = useMemo(() => selectedChapter?.episodes.find(e => e.id === selectedEpisodeId), [selectedChapter, selectedEpisodeId]);
  const selectedScene = useMemo(() => selectedEpisode?.scenes.find(s => s.id === selectedSceneId), [selectedEpisode, selectedSceneId]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('seasons')
        .select(`
          id, name, created_at, updated_at,
          chapters (
            id, name, description, season_id, order, created_at, updated_at,
            episodes (
              id, name, description, chapter_id, order, created_at, updated_at,
              scenes (
                id, name, description, episode_id, order, created_at, updated_at,
                shots (
                  id, name, scene_id, image_url, prompt, animation_prompt, video_url, created_at, updated_at
                )
              )
            )
          )
        `)
        .order('name', { ascending: true })
        .order('order', { foreignTable: 'chapters', ascending: true });

      if (fetchError) throw fetchError;

      const processedData = data.map(s => ({
        ...s,
        chapters: s.chapters.map(c => ({
          ...c,
          episodes: c.episodes.map(e => ({
            ...e,
            scenes: e.scenes.map(sc => ({
              ...sc,
              shots: (sc.shots ? (Array.isArray(sc.shots) ? sc.shots : [sc.shots]) : []).map(shot => ({
                ...shot,
                isAnimating: false,
                isGenerating: false,
              }))
            })).sort((a, b) => a.order - b.order),
          })).sort((a,b) => a.order - b.order),
        })),
      }));
      setSeasons(processedData || []);

    } catch (e: any) {
      console.error("Full error object during fetch:", e);
      let errorMessage = "An unknown error occurred while fetching data.";
      if (e && typeof e.message === 'string' && e.message) {
        errorMessage = e.message;
      } else if (typeof e === 'string' && e) {
        errorMessage = e;
      } else {
        try {
          const stringifiedError = JSON.stringify(e);
          if (stringifiedError !== '{}') {
            errorMessage = stringifiedError;
          }
        } catch (stringifyError) {
          console.error("Failed to stringify error:", stringifyError);
        }
      }
      setError(`Failed to load project data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectSeason = (id: string | null) => { setSelectedSeasonId(id); setSelectedChapterId(null); setSelectedEpisodeId(null); setSelectedSceneId(null); setEditingItem(null); setEditingDescriptionItem(null);};
  const handleSelectChapter = (id: string | null) => { setSelectedChapterId(id); setSelectedEpisodeId(null); setSelectedSceneId(null); setEditingItem(null); setEditingDescriptionItem(null);};
  const handleSelectEpisode = (id: string | null) => { setSelectedEpisodeId(id); setSelectedSceneId(null); setEditingItem(null); setEditingDescriptionItem(null);};
  const handleSelectScene = (id: string | null) => { setSelectedSceneId(id); setEditingItem(null); setEditingDescriptionItem(null);};

  const handleStartEdit = (item: EditableNamedItem, type: EditableItemType) => {
    setEditingItem({ id: item.id, type, currentName: item.name });
    setEditingDescriptionItem(null);
  };
  const handleNameChange = (newName: string) => {
    if (editingItem) setEditingItem({ ...editingItem, currentName: newName });
  };
  const handleCancelEdit = () => setEditingItem(null);

  const handleSaveName = async () => {
    if (!editingItem) return;
    const { id, type, currentName } = editingItem;
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from(type + 's')
        .update({ name: currentName, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      await fetchData();
      setEditingItem(null);
    } catch (e: any) {
      console.error(`Error updating ${type} name:`, e);
      setError(`Failed to update ${type} name: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditDescription = (item: Chapter | Episode | Scene, type: 'chapter' | 'episode' | 'scene') => {
    setEditingDescriptionItem({ id: item.id, type, currentDescription: item.description || '' });
    setEditingItem(null);
  };
  const handleDescriptionChange = (newDescription: string) => {
    if (editingDescriptionItem) setEditingDescriptionItem({ ...editingDescriptionItem, currentDescription: newDescription });
  };
  const handleCancelEditDescription = () => setEditingDescriptionItem(null);

  const handleSaveDescription = async () => {
    if (!editingDescriptionItem) return;
    const { id, type, currentDescription } = editingDescriptionItem;
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from(type + 's')
        .update({ description: currentDescription, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      await fetchData();
      setEditingDescriptionItem(null);
    } catch (e: any) {
      console.error(`Error updating ${type} description:`, e);
      setError(`Failed to update ${type} description: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSeason = async () => {
    setIsLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('seasons')
        .insert({ name: `New Season ${seasons.length + 1}` })
        .select()
        .single();
      if (insertError) throw insertError;
      if (data) await fetchData();
    } catch (e: any) {
      console.error("Error adding season:", e);
      setError(`Failed to add season: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChapter = async () => {
    if (!selectedSeasonId || !selectedSeason) return;
    setIsLoading(true);
    try {
      const nextOrder = selectedSeason.chapters.length > 0 ? Math.max(...selectedSeason.chapters.map(c => c.order)) + 1 : 1;
      const { error: insertError } = await supabase
        .from('chapters')
        .insert({
          name: `New Chapter ${selectedSeason.chapters.length + 1}`,
          season_id: selectedSeasonId,
          order: nextOrder,
          description: ""
        });
      if (insertError) throw insertError;
      await fetchData();
    } catch (e: any) {
      console.error("Error adding chapter:", e);
      setError(`Failed to add chapter: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEpisode = async () => {
    if (!selectedChapterId || !selectedChapter) return;
    setIsLoading(true);
    try {
      const nextOrder = selectedChapter.episodes.length > 0 ? Math.max(...selectedChapter.episodes.map(e => e.order)) + 1 : 1;
      const { error: insertError } = await supabase
        .from('episodes')
        .insert({
          name: `New Episode ${selectedChapter.episodes.length + 1}`,
          chapter_id: selectedChapterId,
          order: nextOrder,
          description: ""
        });
      if (insertError) throw insertError;
      await fetchData();
    } catch (e: any) {
      console.error("Error adding episode:", e);
      setError(`Failed to add episode: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddScene = async () => {
    if (!selectedEpisodeId || !selectedEpisode) return;
    setIsLoading(true);
    try {
      const nextOrder = selectedEpisode.scenes.length > 0 ? Math.max(...selectedEpisode.scenes.map(s => s.order)) + 1 : 1;
      const { error: insertError } = await supabase
        .from('scenes')
        .insert({
          name: `New Scene ${selectedEpisode.scenes.length + 1}`,
          episode_id: selectedEpisodeId,
          order: nextOrder,
          description: ""
        });
      if (insertError) throw insertError;
      await fetchData();
    } catch (e: any) {
      console.error("Error adding scene:", e);
      setError(`Failed to add scene: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateClientShotState = (sceneId: string, updatedShotData: Partial<Shot>, shotIdToUpdate?: string) => {
    setSeasons(prevSeasons => prevSeasons.map(s => ({
      ...s,
      chapters: s.chapters.map(c => ({
        ...c,
        episodes: c.episodes.map(e => ({
          ...e,
          scenes: e.scenes.map(sc => {
            if (sc.id === sceneId) {
              if (shotIdToUpdate) {
                return {
                  ...sc,
                  shots: sc.shots?.map(sh => sh.id === shotIdToUpdate ? { ...sh, ...updatedShotData } : sh) ?? []
                };
              } else {
                const newShotBase: Shot = {
                    id: `temp-${Date.now()}`,
                    name: 'New Shot',
                    scene_id: sceneId,
                    isAnimating: false,
                    isGenerating: false,
                    ...updatedShotData
                };
                return { ...sc, shots: [newShotBase] };
              }
            }
            return sc;
          })
        }))
      }))
    })));
  };

  const handleFileUploadShot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedScene) return;

    setIsLoading(true);
    setError(null);

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `public/${selectedScene.id}/${fileName}`;

    const existingShot = selectedScene.shots?.[0];

    try {
      updateClientShotState(selectedScene.id, {
        name: `Uploading ${file.name}...`,
        image_url: 'https://via.placeholder.com/640x360.png?text=Uploading...',
        isGenerating: true,
      }, existingShot?.id || `temp-upload-${Date.now()}`);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Could not retrieve public URL for the uploaded file.");
      }

      const shotBaseData = {
        name: file.name || `Uploaded Shot ${Date.now()}`,
        image_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      };

      if (existingShot && existingShot.id && !existingShot.id.startsWith('temp-') && !existingShot.id.startsWith('generating-')) {
        const { error: updateError } = await supabase
            .from('shots')
            .update({
                ...shotBaseData,
                prompt: existingShot.prompt,
                animation_prompt: existingShot.animation_prompt,
                video_url: existingShot.video_url,
            })
            .eq('id', existingShot.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
            .from('shots')
            .insert({
                ...shotBaseData,
                scene_id: selectedScene.id,
                animation_prompt: "", 
            });
        if (insertError) throw insertError;
      }
      await fetchData();
    } catch (e: any) {
      console.error("Error uploading shot:", e);
      setError(`Failed to upload shot: ${e.message}`);
      updateClientShotState(selectedScene.id, {
        name: `Upload Failed`,
        image_url: 'https://via.placeholder.com/640x360.png?text=Upload+Error',
        isGenerating: false,
      }, existingShot?.id || `temp-error-${Date.now()}`);
    } finally {
      setIsLoading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleGenerateShot = async () => {
    if (!selectedScene) return;
    const descriptivePrompt = `Characters: ${genShotChar1}${genShotChar2 ? ', ' + genShotChar2 : ''}. Location: ${genShotLocation}. Scene: ${genShotPromptText}`;
    const existingShot = selectedScene.shots?.[0];
    const shotIdForUpdate = existingShot?.id && !existingShot.id.startsWith('temp-') && !existingShot.id.startsWith('generating-') ? existingShot.id : undefined;

    updateClientShotState(selectedScene.id, {
      id: shotIdForUpdate || `generating-${Date.now()}`,
      name: `Generating: ${genShotPromptText.substring(0,20)}...`,
      prompt: descriptivePrompt,
      isGenerating: true,
      isAnimating: false,
      video_url: null,
      image_url: 'https://via.placeholder.com/640x360.png?text=Generating...'
    }, shotIdForUpdate);

    setShowGenerateShotModal(false);
    setGenShotChar1(''); setGenShotChar2(''); setGenShotLocation(''); setGenShotPromptText('');
    setIsLoading(true);

    try {
      console.log("Simulating Gemini API call for: ", descriptivePrompt);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const simulatedImageUrl = `https://picsum.photos/seed/${Date.now()}/800/450`;

      const shotBaseData = {
        name: genShotPromptText.substring(0, 30) || 'Generated Shot',
        image_url: simulatedImageUrl,
        prompt: descriptivePrompt,
        updated_at: new Date().toISOString(),
      };
      
      if (shotIdForUpdate) {
         const { error: updateError } = await supabase
            .from('shots')
            .update({
                ...shotBaseData,
                animation_prompt: existingShot?.animation_prompt || "",
                video_url: null,
            })
            .eq('id', shotIdForUpdate);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
            .from('shots')
            .insert({
                ...shotBaseData,
                scene_id: selectedScene.id,
                animation_prompt: "",
            });
        if (insertError) throw insertError;
      }
      await fetchData();
    } catch (e: any) {
      console.error("Error generating shot:", e);
      setError(`Failed to generate shot: ${e.message}`);
      await fetchData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShot = async () => {
    if (!selectedScene || !selectedScene.shots || selectedScene.shots.length === 0) return;
    const shotToRemove = selectedScene.shots[0];

    if (shotToRemove.id.startsWith('generating-') || shotToRemove.id.startsWith('temp-')) {
      updateClientShotState(selectedScene.id, { shots: [] } as any, shotToRemove.id);
      return;
    }
    setIsLoading(true);
    try {
      if (shotToRemove.image_url && shotToRemove.image_url.includes(STORAGE_BUCKET_NAME)) {
        const imagePath = shotToRemove.image_url.substring(shotToRemove.image_url.indexOf(STORAGE_BUCKET_NAME) + STORAGE_BUCKET_NAME.length + 1);
        if (imagePath) {
            const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET_NAME).remove([imagePath]);
            if (storageError) console.warn("Failed to delete image from storage:", storageError.message);
            else console.log("Image deleted from storage:", imagePath);
        }
      }
      if (shotToRemove.video_url && shotToRemove.video_url.includes(STORAGE_BUCKET_NAME)) {
        const videoPath = shotToRemove.video_url.substring(shotToRemove.video_url.indexOf(STORAGE_BUCKET_NAME) + STORAGE_BUCKET_NAME.length + 1);
         if (videoPath) {
            const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET_NAME).remove([videoPath]);
            if (storageError) console.warn("Failed to delete video from storage:", storageError.message);
            else console.log("Video deleted from storage:", videoPath);
        }
      }

      const { error: deleteError } = await supabase.from('shots').delete().eq('id', shotToRemove.id);
      if (deleteError) throw deleteError;
      await fetchData();
    } catch (e: any) {
      console.error("Error removing shot:", e);
      setError(`Failed to remove shot: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnimationPromptChange = async (sceneId: string, shotId: string, newPrompt: string) => {
    updateClientShotState(sceneId, { animation_prompt: newPrompt }, shotId);
    try {
        const { error: updateError } = await supabase
            .from('shots')
            .update({ animation_prompt: newPrompt, updated_at: new Date().toISOString() })
            .eq('id', shotId);
        if (updateError) {
            throw updateError;
        }
    } catch (e: any) {
        console.error("Error updating animation prompt:", e);
        setError(`Failed to save animation prompt: ${e.message}`);
        await fetchData();
    }
  };

  const handleAnimateShot = async (sceneId: string, shotId: string) => {
    const shot = selectedScene?.shots?.find(sh => sh.id === shotId);
    if (!shot || !shot.animation_prompt) {
        alert("Please enter an animation prompt.");
        return;
    }
    if (!shot.image_url || shot.image_url.startsWith('https://via.placeholder.com')) {
        alert("Shot image is not available or is a placeholder. Cannot animate.");
        return;
    }
    if (shot.id.startsWith('generating-') || shot.id.startsWith('temp-')) {
        alert("Shot is not yet saved to the database. Please wait for image generation/upload to complete.");
        return;
    }

    updateClientShotState(sceneId, { isAnimating: true, video_url: undefined }, shotId);
    setIsLoading(true);
    setError(null);

    try {
        const webhookUrl = 'https://shaneteksn8n.up.railway.app/webhook-test/9801dbad-30c7-4e62-ad9d-666a30c17c97';
        const webhookPayload = {
            imageUrl: shot.image_url,
            animationPrompt: shot.animation_prompt,
        };

        console.log("Calling animation webhook:", webhookUrl, "with payload:", webhookPayload);
        updateClientShotState(sceneId, { name: `Animating: ${shot.animation_prompt.substring(0,20)}...`}, shotId);

        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            throw new Error(`Webhook call failed with status ${webhookResponse.status}: ${errorText}`);
        }
        
        const responseData = await webhookResponse.json();
        const itvFileUrl = responseData.itvFile;

        if (!itvFileUrl || typeof itvFileUrl !== 'string') {
            throw new Error("Invalid or missing 'itvFile' URL in webhook response.");
        }
        console.log("Webhook successful. Received itvFile URL:", itvFileUrl);
        updateClientShotState(sceneId, { name: `Processing video...`}, shotId);

        console.log("Downloading video from:", itvFileUrl);
        const videoFileResponse = await fetch(itvFileUrl);
        if (!videoFileResponse.ok) {
            throw new Error(`Failed to download video from itvFileUrl: Status ${videoFileResponse.status}`);
        }
        const videoBlob = await videoFileResponse.blob();
        console.log("Video downloaded successfully. Size:", videoBlob.size);

        const videoFileName = `${shot.id}-animated-${Date.now()}.mp4`;
        if (!selectedScene) {
            console.error("Scene not selected, cannot determine video file path.");
            throw new Error("Scene not selected.");
        }
        const videoFilePath = `public/videos/${selectedScene.id}/${videoFileName}`;
        
        console.log("Uploading video to Supabase Storage at:", videoFilePath);
        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .upload(videoFilePath, videoBlob, {
                contentType: 'video/mp4',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Failed to upload video to Supabase Storage: ${uploadError.message}`);
        }
        console.log("Video uploaded to Supabase Storage successfully.");

        const { data: publicUrlData } = supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .getPublicUrl(videoFilePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error("Could not retrieve public URL for the uploaded video from Supabase Storage.");
        }
        const newVideoUrl = publicUrlData.publicUrl;
        console.log("Retrieved public URL for video from Supabase Storage:", newVideoUrl);

        const { error: dbUpdateError } = await supabase
            .from('shots')
            .update({ video_url: newVideoUrl, name: shot.name.replace(/^Animating: /,'').replace(/^Processing video.../, ''), updated_at: new Date().toISOString() })
            .eq('id', shotId);

        if (dbUpdateError) {
            throw new Error(`Failed to update shot in database: ${dbUpdateError.message}`);
        }
        console.log("Shot updated in database with new video URL.");

        await fetchData();

    } catch (e: any) {
        console.error("Error during animation process:", e);
        setError(`Animation process failed: ${e.message}`);
        updateClientShotState(sceneId, { isAnimating: false, name: shot.name.replace(/^Animating: /,'').replace(/^Processing video.../, '') }, shotId);
    } finally {
        setIsLoading(false);
        const finalShotCheck = seasons.flatMap(s => s.chapters).flatMap(c => c.episodes).flatMap(e => e.scenes).find(sc => sc.id === sceneId)?.shots?.find(sh => sh.id === shotId);
        if (finalShotCheck?.isAnimating) {
             updateClientShotState(sceneId, { isAnimating: false }, shotId);
        }
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (viewingShot) setViewingShot(null);
      if (showGenerateShotModal) setShowGenerateShotModal(false);
      if (editingItem) handleCancelEdit();
      if (editingDescriptionItem) handleCancelEditDescription();
    }
  }, [viewingShot, showGenerateShotModal, editingItem, editingDescriptionItem, handleCancelEdit, handleCancelEditDescription]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const breadcrumbButtonClass = "hover:underline focus:outline-none focus:ring-1 focus:ring-stone-500 rounded px-1";
  const activeBreadcrumbClass = "font-semibold text-gray-800";
  const inactiveBreadcrumbClass = "text-gray-500 hover:text-gray-700";
  const listItemClass = "block w-full text-left p-3 bg-white hover:bg-gray-50 rounded-md shadow-sm border border-gray-200 mb-2 transition-colors duration-150 ease-in-out";
  const listTitleClass = "text-lg font-medium text-stone-700";
  const itemActionsClass = "ml-auto flex items-center space-x-2";
  const buttonClass = "bg-stone-600 hover:bg-stone-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonClass = "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-md shadow-sm text-sm transition-colors disabled:opacity-50";
  const destructiveButtonClass = "bg-white hover:bg-red-50 text-red-700 font-semibold py-2 px-4 border border-red-400 rounded-md shadow-sm text-sm transition-colors disabled:opacity-50";
  const shotContainerClass = "mt-4 space-y-4";
  const shotMediaContainerClass = "relative w-full bg-white rounded-lg overflow-hidden shadow-md group";
  const shotMediaClass = "w-full h-auto object-contain block rounded-md max-h-[70vh]";
  const shotOverlayClass = "absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center text-white p-4 text-center";
  const smallIconButtonClass = "p-1 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm disabled:opacity-50 transition-colors";

  const renderEditableName = (item: EditableNamedItem, type: EditableItemType) => {
    if (editingItem?.id === item.id) {
      return (
        <div className="flex items-center w-full">
          <input
            type="text"
            value={editingItem.currentName}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEdit(); }}
            className="flex-grow p-1 border border-stone-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500 text-lg"
            autoFocus
            disabled={isLoading}
          />
          <button onClick={handleSaveName} className={`${smallIconButtonClass} ml-2`} aria-label="Save name" disabled={isLoading}><CheckIcon /></button>
          <button onClick={handleCancelEdit} className={`${smallIconButtonClass} ml-1`} aria-label="Cancel edit" disabled={isLoading}><XMarkIcon /></button>
        </div>
      );
    }
    return (
      <div className="flex items-center w-full">
        <span className={listTitleClass}>{item.name}</span>
        <div className={itemActionsClass}>
          <button onClick={(e) => { e.stopPropagation(); handleStartEdit(item, type);}} className="p-1 text-gray-400 hover:text-stone-600" aria-label={`Edit name for ${item.name}`} disabled={isLoading}>
            <PencilIcon />
          </button>
        </div>
      </div>
    );
  };

  const renderEditableDescription = (item: Chapter | Episode | Scene, type: 'chapter' | 'episode' | 'scene') => {
    if (editingDescriptionItem?.id === item.id && editingDescriptionItem?.type === type) {
        return (
            <div className="mt-2 w-full">
                <textarea
                    value={editingDescriptionItem.currentDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveDescription(); if (e.key === 'Escape') handleCancelEditDescription();}}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500 text-sm"
                    rows={3}
                    placeholder={`Enter description for ${item.name}...`}
                    autoFocus
                    disabled={isLoading}
                />
                <div className="flex justify-end space-x-2 mt-1">
                    <button onClick={handleSaveDescription} className={`${buttonClass} text-xs px-2 py-1`} disabled={isLoading}>Save Desc.</button>
                    <button onClick={handleCancelEditDescription} className={`${secondaryButtonClass} text-xs px-2 py-1`} disabled={isLoading}>Cancel</button>
                </div>
            </div>
        );
    }
    return (
        <div className="mt-1 text-sm text-gray-600 w-full flex justify-between items-start group">
            <p className="whitespace-pre-wrap break-words flex-grow pr-2">{item.description || <span className="text-gray-400 italic">No description.</span>}</p>
            <button
                onClick={(e) => { e.stopPropagation(); handleStartEditDescription(item, type);}}
                className="p-1 text-gray-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`Edit description for ${item.name}`}
                disabled={isLoading}
            >
                <PencilIcon />
            </button>
        </div>
    );
  };

  const renderItemWithDescription = (item: Chapter | Episode | Scene, type: 'chapter' | 'episode' | 'scene', onSelect: (id:string) => void) => {
    return (
        <button
            key={item.id}
            onClick={() => !editingItem && !editingDescriptionItem && onSelect(item.id)}
            className={listItemClass}
            disabled={isLoading || !!editingItem || !!editingDescriptionItem}
        >
            {renderEditableName(item, type)}
            {renderEditableDescription(item, type)}
        </button>
    );
  };

  const renderProjectStructure = () => (
    <div className="col-span-1 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Project Structure</h2>
        <nav aria-label="Breadcrumb" className="mb-4 p-2 bg-gray-50 rounded-md">
            <ol className="flex items-center space-x-1 text-xs flex-wrap">
            <li><button onClick={() => handleSelectSeason(null)} className={`${breadcrumbButtonClass} ${!selectedSeasonId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={!selectedSeasonId ? 'page' : undefined} disabled={isLoading || !!editingItem || !!editingDescriptionItem}>Seasons</button></li>
            {selectedSeason && (<><li><span className="text-gray-400">/</span></li><li><button onClick={() => { handleSelectSeason(selectedSeasonId); handleSelectChapter(null);}} className={`${breadcrumbButtonClass} ${selectedSeasonId && !selectedChapterId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={selectedSeasonId && !selectedChapterId ? 'page' : undefined} disabled={isLoading || !!editingItem || !!editingDescriptionItem}>{selectedSeason.name}</button></li></>)}
            {selectedChapter && (<><li><span className="text-gray-400">/</span></li><li><button onClick={() => {handleSelectChapter(selectedChapterId); handleSelectEpisode(null);}} className={`${breadcrumbButtonClass} ${selectedChapterId && !selectedEpisodeId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={selectedChapterId && !selectedEpisodeId ? 'page' : undefined} disabled={isLoading || !!editingItem || !!editingDescriptionItem}>{selectedChapter.name}</button></li></>)}
            {selectedEpisode && (<><li><span className="text-gray-400">/</span></li><li><button onClick={() => {handleSelectEpisode(selectedEpisodeId); handleSelectScene(null);}} className={`${breadcrumbButtonClass} ${selectedEpisodeId && !selectedSceneId ? activeBreadcrumbClass : inactiveBreadcrumbClass}`} aria-current={selectedEpisodeId && !selectedSceneId ? 'page' : undefined} disabled={isLoading || !!editingItem || !!editingDescriptionItem}>{selectedEpisode.name}</button></li></>)}
            {selectedScene && (<><li><span className="text-gray-400">/</span></li><li><span className={`${activeBreadcrumbClass} px-1`} aria-current="page">{selectedScene.name}</span></li></>)}
            </ol>
        </nav>

        {!selectedSeasonId && (
            <div>
                <button onClick={handleAddSeason} className={`${buttonClass} mb-2 w-full`} aria-label="Add new season" disabled={isLoading}>Add Season</button>
                {seasons.length === 0 && !isLoading && <p className="text-gray-500 text-sm">No seasons yet. Click "Add Season" to start.</p>}
                {seasons.map(s => <button key={s.id} onClick={() => !editingItem && handleSelectSeason(s.id)} className={listItemClass} disabled={isLoading || !!editingItem}>{renderEditableName(s, 'season')}</button>)}
            </div>
        )}
        {selectedSeasonId && !selectedChapterId && (
             <div>
                <button onClick={handleAddChapter} className={`${buttonClass} mb-2 w-full`} aria-label={`Add chapter to ${selectedSeason?.name}`} disabled={isLoading}>Add Chapter</button>
                {selectedSeason?.chapters.length === 0 && !isLoading && <p className="text-gray-500 text-sm">No chapters in this season yet.</p>}
                {selectedSeason?.chapters.map(c => renderItemWithDescription(c, 'chapter', handleSelectChapter))}
            </div>
        )}
        {selectedChapterId && !selectedEpisodeId && (
            <div>
                <button onClick={handleAddEpisode} className={`${buttonClass} mb-2 w-full`} aria-label={`Add episode to ${selectedChapter?.name}`} disabled={isLoading}>Add Episode</button>
                {selectedChapter?.episodes.length === 0 && !isLoading && <p className="text-gray-500 text-sm">No episodes in this chapter yet.</p>}
                {selectedChapter?.episodes.map(e => renderItemWithDescription(e, 'episode', handleSelectEpisode))}
            </div>
        )}
        {selectedEpisodeId && (
             <div>
                <button onClick={handleAddScene} className={`${buttonClass} mb-2 w-full`} aria-label={`Add scene to ${selectedEpisode?.name}`} disabled={isLoading}>Add Scene</button>
                {selectedEpisode?.scenes.length === 0 && !isLoading && <p className="text-gray-500 text-sm">No scenes in this episode yet.</p>}
                {selectedEpisode?.scenes.map(sc => renderItemWithDescription(sc, 'scene', handleSelectScene))}
            </div>
        )}
    </div>
  );

  const renderSceneDetails = () => {
    if (!selectedScene) {
        return (
            <div className="col-span-1 bg-white p-4 rounded-lg shadow-md flex items-center justify-center">
                <p className="text-gray-500">Select a scene to see its details.</p>
            </div>
        );
    }
    const shot = selectedScene.shots?.[0];

    return (
      <div className="col-span-1 bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-gray-700 truncate pr-2">Scene: {selectedScene.name}</h2>
          {shot && (
            <button
                onClick={handleRemoveShot}
                className={`${destructiveButtonClass} text-xs`}
                aria-label="Remove shot from scene"
                disabled={isLoading || (shot && (shot.id.startsWith('generating-') || shot.id.startsWith('temp-') || shot.isGenerating || shot.isAnimating ))}
            >
                Remove Shot
            </button>
          )}
        </div>

        {!shot && !isLoading && <p className="text-gray-500 mt-2">No shot in this scene yet. Use the Assets panel to add one.</p>}

        {shot && (
          <div className={shotContainerClass}>
            <p className="text-sm font-medium text-gray-600 mb-1">{shot.name}</p>
            <div className={shotMediaContainerClass}>
              {shot.isAnimating ? (
                <LoadingScreen imageUrl={shot.image_url || 'https://placehold.co/1920x1080/4a2a6c/eae0d0?text=Source+Image'} />
              ) : shot.isGenerating ? (
                <div className={shotOverlayClass}>
                  <svg className="animate-spin h-10 w-10 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{'Generating Image...'}</span>
                  {shot.name && shot.name.startsWith("Generating:") && 
                    <span className="text-xs text-gray-300 mt-1 truncate max-w-full px-2">{shot.name.substring(shot.name.indexOf(":") + 1).trim()}</span>}
                </div>
              ) : null}
              {!shot.isAnimating && !shot.isGenerating && shot.video_url && (
                <video src={shot.video_url} controls className={shotMediaClass} aria-label={`Animated video for ${shot.name}`} />
              )}
              {!shot.isAnimating && !shot.isGenerating && !shot.video_url && shot.image_url && (
                <img
                    src={shot.image_url}
                    alt={shot.name}
                    className={`${shotMediaClass} ${shot.image_url.startsWith('https://via.placeholder.com') ? '' : 'cursor-pointer'}`}
                    onClick={() => !shot.image_url?.startsWith('https://via.placeholder.com') && setViewingShot(shot)}
                />
              )}
            </div>
            {shot.prompt && !shot.isGenerating && (
                <p className="text-xs text-gray-500 mt-2 p-1 bg-gray-50 rounded">Image Gen Prompt: {shot.prompt}</p>
            )}

            <div className="mt-4">
                <label htmlFor={`anim-prompt-${shot.id}`} className="block text-sm font-medium text-gray-700 mb-1">Animation Prompt (Image to Video)</label>
                <textarea
                    id={`anim-prompt-${shot.id}`}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="e.g., Make the character wave, subtle wind in the trees..."
                    value={shot.animation_prompt || ''}
                    onChange={(e) => handleAnimationPromptChange(selectedScene.id, shot.id, e.target.value)}
                    disabled={isLoading || shot.id.startsWith('generating-') || shot.id.startsWith('temp-') || shot.isGenerating || shot.isAnimating}
                />
            </div>
            <button
                onClick={() => handleAnimateShot(selectedScene.id, shot.id)}
                className={`${buttonClass} mt-2 w-full`}
                disabled={isLoading || shot.isAnimating || shot.isGenerating || !shot.image_url || shot.image_url.startsWith('https://via.placeholder.com') || shot.id.startsWith('generating-') || shot.id.startsWith('temp-') || !shot.animation_prompt}
            >
                {shot.isAnimating ? 'Animating...' : shot.video_url ? 'Re-Animate' : 'Animate'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAssetsPanel = () => {
    const shot = selectedScene?.shots?.[0];
    return (
        <div className="col-span-1 bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Assets</h2>
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-gray-600 mb-2">Characters</h3>
                    <div className="p-4 bg-gray-100 rounded-md text-center text-sm text-gray-500">
                        Character management coming soon.
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-600 mb-2">Locations</h3>
                     <div className="p-4 bg-gray-100 rounded-md text-center text-sm text-gray-500">
                        Location management coming soon.
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-600 mb-2">Shot Actions</h3>
                    <div className="space-y-2">
                         <label htmlFor={`shot-upload-${selectedScene?.id}`} className={`${buttonClass} w-full cursor-pointer inline-block text-center ${!selectedScene || isLoading || (shot && (shot.isGenerating || shot.isAnimating)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                           {shot && shot.image_url && !shot.image_url.startsWith('https://via.placeholder.com') ? 'Replace Image' : 'Upload Image'}
                        </label>
                        <input
                            type="file"
                            id={`shot-upload-${selectedScene?.id}`}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUploadShot}
                            aria-label={`Upload shot to ${selectedScene?.name}`}
                            disabled={!selectedScene || isLoading || (shot && (shot.isGenerating || shot.isAnimating))}
                        />
                        <button
                            onClick={() => setShowGenerateShotModal(true)}
                            className={`${secondaryButtonClass} w-full`}
                            disabled={!selectedScene || isLoading || (shot && (shot.isGenerating || shot.isAnimating))}
                        >
                            {shot && shot.image_url && !shot.image_url.startsWith('https://via.placeholder.com') ? 'Generate New Image' : 'Generate with AI'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
            <div className={`p-2 sm:p-4 rounded-lg shadow-inner min-h-[calc(100vh-12rem)] ${backgrounds[PAGE_KEY] || backgrounds['global'] ? 'bg-gray-50/80 backdrop-blur-sm' : 'bg-gray-50'}`}>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Create</h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
                        Error: {error} <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700 font-semibold">Dismiss</button>
                    </div>
                )}
                 {(isLoading && !error && !seasons.length) && <div className="mb-4 p-3 bg-blue-100 text-blue-700 border border-blue-300 rounded-md">Loading project structure...</div>}
                 {(isLoadingBackgrounds && !isLoading && !error) && <div className="mb-4 p-3 bg-purple-100 text-purple-700 border border-purple-300 rounded-md">Loading background styles...</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderProjectStructure()}
                    {renderSceneDetails()}
                    {renderAssetsPanel()}
                </div>

                {viewingShot && viewingShot.image_url && !viewingShot.image_url.startsWith('https://via.placeholder.com') && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={() => setViewingShot(null)} role="dialog" aria-modal="true" aria-labelledby="shot-preview-title">
                    <div className="bg-white p-2 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 id="shot-preview-title" className="text-lg font-medium text-gray-800 truncate">{viewingShot.name}</h3>
                            <button onClick={() => setViewingShot(null)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100" aria-label="Close image preview">
                                <XMarkIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <img src={viewingShot.image_url} alt={`Preview of ${viewingShot.name}`} className="w-full h-auto object-contain max-h-[calc(90vh-50px)] rounded" />
                        {viewingShot.prompt && <p className="text-xs text-gray-500 mt-2 p-1 bg-gray-100 rounded">Image Gen Prompt: {viewingShot.prompt}</p>}
                    </div>
                    </div>
                )}

                {showGenerateShotModal && selectedScene && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={() => setShowGenerateShotModal(false)} role="dialog" aria-modal="true" aria-labelledby="generate-shot-title">
                        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 id="generate-shot-title" className="text-xl font-semibold text-gray-800">Generate New Shot for {selectedScene.name}</h3>
                                <button onClick={() => setShowGenerateShotModal(false)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100" aria-label="Close generate shot dialog" disabled={isLoading}>
                                    <XMarkIcon className="w-6 h-6"/>
                                </button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleGenerateShot(); }} className="space-y-4">
                                <div>
                                    <label htmlFor="genChar1" className="block text-sm font-medium text-gray-700">Character 1 (Optional)</label>
                                    <input type="text" id="genChar1" value={genShotChar1} onChange={e => setGenShotChar1(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500" placeholder="e.g., Brave Knight" disabled={isLoading} />
                                </div>
                                <div>
                                    <label htmlFor="genChar2" className="block text-sm font-medium text-gray-700">Character 2 (Optional)</label>
                                    <input type="text" id="genChar2" value={genShotChar2} onChange={e => setGenShotChar2(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500" placeholder="e.g., Friendly Dragon" disabled={isLoading} />
                                </div>
                                <div>
                                    <label htmlFor="genLocation" className="block text-sm font-medium text-gray-700">Location (Optional)</label>
                                    <input type="text" id="genLocation" value={genShotLocation} onChange={e => setGenShotLocation(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500" placeholder="e.g., Enchanted Forest" disabled={isLoading} />
                                </div>
                                <div>
                                    <label htmlFor="genPromptText" className="block text-sm font-medium text-gray-700">Prompt for Gemini</label>
                                    <textarea id="genPromptText" value={genShotPromptText} onChange={e => setGenShotPromptText(e.target.value)} rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500" placeholder="Describe the scene, actions, mood..." required disabled={isLoading} />
                                </div>
                                <div className="flex justify-end space-x-3 pt-2">
                                    <button type="button" onClick={() => setShowGenerateShotModal(false)} className={secondaryButtonClass} disabled={isLoading}>Cancel</button>
                                    <button type="submit" className={buttonClass} disabled={isLoading}>Generate Shot</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
};

export default CreatePage;
