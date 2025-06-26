import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import Navbar from './components/Navbar.tsx';
import { useBackground } from '../../contexts/BackgroundContext.tsx';
import { supabase } from '../../supabaseClient.ts';
import type { Character, CharacterImage } from '../../types.ts';

const PAGE_KEY = "characters";
const STORAGE_BUCKET_NAME = 'character-images';

const CharactersPage: React.FC = () => {
  const { backgrounds, isLoading: isLoadingBackgrounds } = useBackground();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

  const fetchCharacters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('characters')
        .select(`
          *,
          images:character_images (*)
        `)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCharacters(data || []);
    } catch (e: any) {
      setError(`Failed to load characters: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    const bgImage = backgrounds[PAGE_KEY] || backgrounds['global'];
    document.body.style.backgroundImage = bgImage ? `url(${bgImage})` : '';
    document.body.style.backgroundSize = bgImage ? 'cover' : '';
    document.body.style.backgroundPosition = bgImage ? 'center center' : '';
    document.body.style.backgroundRepeat = bgImage ? 'no-repeat' : '';
    document.body.style.backgroundAttachment = bgImage ? 'fixed' : '';

    return () => {
      document.body.style.backgroundImage = '';
    };
  }, [backgrounds]);

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingCharacter(null);
    setShowModal(true);
  }

  const closeModal = () => {
      setShowModal(false);
      setEditingCharacter(null);
  }

  const truncate = (text: string | null | undefined, length: number) => {
    if (!text) return 'N/A';
    return text.length > length ? `${text.substring(0, length)}...` : text;
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className={`p-6 rounded-lg shadow ${backgrounds[PAGE_KEY] || backgrounds['global'] ? 'bg-white/80 backdrop-blur-sm' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Manage Characters</h1>
            <button onClick={handleAdd} className="bg-stone-600 hover:bg-stone-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm text-sm transition-colors">
              Add Character
            </button>
          </div>

          {error && <p className="text-red-500">{error}</p>}
          {isLoading && <p>Loading characters...</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {characters.map(char => (
              <div key={char.id} className="bg-white rounded-lg shadow-lg overflow-hidden group flex flex-col transform hover:scale-105 transition-transform duration-300">
                <div className="w-full h-56 bg-gray-200 flex items-center justify-center relative">
                    <img src={char.image_url || 'https://via.placeholder.com/400x300.png?text=No+Image'} alt={char.name} className="w-full h-full object-contain cursor-pointer" onClick={() => setViewingCharacter(char)} />
                    <div className="absolute top-0 right-0 p-2">
                        <button onClick={(e) => {e.stopPropagation(); handleEdit(char)}} className="bg-white text-gray-700 hover:bg-gray-100 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
                <div className="p-4 flex-grow cursor-pointer" onClick={() => setViewingCharacter(char)}>
                  <h2 className="text-xl font-bold text-gray-900">{char.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{char.role ?? 'Role not specified'}</p>
                  <p className="text-sm text-gray-700 mt-3 font-semibold">Description:</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{truncate(char.description, 120)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      {showModal && <CharacterModal character={editingCharacter} onClose={closeModal} onSave={() => {fetchCharacters(); closeModal();}} />}
      {viewingCharacter && <CharacterDetailsModal character={viewingCharacter} onClose={() => setViewingCharacter(null)} onSave={fetchCharacters} />} 
    </div>
  );
};

const CharacterModal: React.FC<{ character: Character | null; onClose: () => void; onSave: () => void; }> = ({ character, onClose, onSave }) => {
  const [name, setName] = useState(character?.name || '');
  const [role, setRole] = useState(character?.role || '');
  const [powers, setPowers] = useState(character?.powers?.join(', ') || '');
  const [description, setDescription] = useState(character?.description || '');
  const [origin, setOrigin] = useState(character?.origin || '');
  const [cardImageFile, setCardImageFile] = useState<File | null>(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState<FileList | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCardImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setCardImageFile(file);
    }
  };

  const handleGalleryImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGalleryImageFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
        let imageUrl = character?.image_url;
        if (cardImageFile) {
            const fileName = `card-${Date.now()}-${cardImageFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET_NAME)
                .upload(fileName, cardImageFile);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        const characterData = {
            name,
            role,
            powers: powers.split(',').map(p => p.trim()),
            description,
            origin,
            image_url: imageUrl,
        };

        let characterId = character?.id;

        if (character) {
            const { error: updateError } = await supabase.from('characters').update(characterData).eq('id', character.id);
            if (updateError) throw updateError;
        } else {
            const { data, error: insertError } = await supabase.from('characters').insert(characterData).select().single();
            if (insertError) throw insertError;
            characterId = data.id;
        }

        if (galleryImageFiles && characterId) {
            for (const file of Array.from(galleryImageFiles)) {
                const fileName = `${characterId}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKET_NAME)
                    .upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(fileName);
                await supabase.from('character_images').insert({ character_id: characterId, image_url: urlData.publicUrl });
            }
        }

        onSave();
    } catch (e: any) {
        setError(`Failed to save character: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">{character ? 'Edit' : 'Add'} Character</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" required />
                <input type="text" placeholder="Role" value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded" />
                <textarea placeholder="Powers (comma-separated)" value={powers} onChange={e => setPowers(e.target.value)} className="w-full p-2 border rounded" rows={2}></textarea>
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded" rows={4}></textarea>
                <textarea placeholder="Origin" value={origin} onChange={e => setOrigin(e.target.value)} className="w-full p-2 border rounded" rows={3}></textarea>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Card Image</label>
                    <input type="file" onChange={handleCardImageChange} accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Gallery Images</label>
                    <input type="file" onChange={handleGalleryImagesChange} accept="image/*" multiple className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100"/>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="bg-stone-600 text-white px-4 py-2 rounded" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    </div>
  );
}

const CharacterDetailsModal: React.FC<{ character: Character; onClose: () => void; onSave: () => void; }> = ({ character, onClose, onSave }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteImage = async (imageId: string) => {
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('character_images').delete().eq('id', imageId);
            if (error) throw error;
            onSave(); // Refetch characters to update the view
        } catch (e: any) {
            console.error("Failed to delete image", e);
        }
        finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{character.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="bg-gray-100 rounded-md flex items-center justify-center">
                            <img src={character.image_url || 'https://via.placeholder.com/400x300.png?text=No+Image'} alt={character.name} className="max-w-full max-h-96 object-contain rounded-md" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {character.images?.map(img => (
                                <div key={img.id} className="bg-gray-100 rounded-md flex items-center justify-center relative group">
                                    <img src={img.image_url} alt={character.name} className="max-w-full max-h-48 object-contain rounded-md" />
                                    <button onClick={() => handleDeleteImage(img.id)} disabled={isDeleting} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-md"><span className="font-semibold">Role:</span> {character.role ?? 'N/A'}</p>
                        <p className="text-md mt-2"><span className="font-semibold">Powers:</span> {character.powers?.join(', ') ?? 'N/A'}</p>
                        <p className="text-md mt-2"><span className="font-semibold">Description:</span></p>
                        <p className="whitespace-pre-wrap text-gray-700">{character.description ?? 'N/A'}</p>
                        <p className="text-md mt-2"><span className="font-semibold">Origin:</span></p>
                        <p className="whitespace-pre-wrap text-gray-700">{character.origin ?? 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CharactersPage;


