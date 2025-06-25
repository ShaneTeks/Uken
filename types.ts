// types.ts

// Base type for items that can have their name edited directly in the UI
export interface EditableNamedItem {
  id: string;
  name: string;
}
export type EditableItemType = 'season' | 'chapter' | 'episode' | 'scene';


export interface Shot extends EditableNamedItem {
  // id is UUID from DB
  // name is from DB
  scene_id: string; // Foreign key to Scene
  image_url?: string | null; // URL from Supabase Storage or data URI / placeholder
  prompt?: string | null; // For generated shots
  animation_prompt?: string | null; // Prompt for image-to-video animation
  video_url?: string | null; // URL of the generated video
  
  // Client-side only states, not in DB table 'shots' directly like this
  file?: File; // For new uploads before they are sent to storage
  isGenerating?: boolean; // UI state for image generation
  isAnimating?: boolean; // UI state for video animation

  created_at?: string;
  updated_at?: string;
}

export interface Scene extends EditableNamedItem {
  // id is UUID from DB
  // name is from DB
  episode_id: string; // Foreign key to Episode
  order: number;
  description?: string | null; // Optional description for the scene
  shots?: Shot[]; // In DB, shot has scene_id. For client, we'll nest it. Max 1 shot.
  created_at?: string;
  updated_at?: string;
}

export interface Episode extends EditableNamedItem {
  // id is UUID from DB
  // name is from DB
  chapter_id: string; // Foreign key to Chapter
  order: number;
  description?: string | null; // Optional description for the episode
  scenes: Scene[];
  created_at?: string;
  updated_at?: string;
}

export interface Chapter extends EditableNamedItem {
  // id is UUID from DB
  // name is from DB
  season_id: string; // Foreign key to Season
  order: number;
  description?: string | null; // Optional description for the chapter
  episodes: Episode[];
  created_at?: string;
  updated_at?: string;
}

export interface Season extends EditableNamedItem {
  // id is UUID from DB
  // name is from DB
  chapters: Chapter[];
  // user_id?: string; // If linking to users
  created_at?: string;
  updated_at?: string;
}