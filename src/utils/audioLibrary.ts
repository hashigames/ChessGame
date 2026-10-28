/**
 * Audio Track Library & Sound Management
 * Supports Oriental Cinematic, Orchestral Battle, Ethereal Ambient, and Custom Uploaded Soundtracks.
 */

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  url: string;
  isCustom?: boolean;
}

export const DEFAULT_TRACKS: AudioTrack[] = [
  {
    id: 'imperial_oriental',
    title: 'Imperial Dynasty War Theme',
    artist: 'Guzheng & Bamboo Flute Ensemble',
    genre: 'Traditional Epic Oriental',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=chinese-martial-arts-theme-112217.mp3'
  },
  {
    id: 'lighthouse_battle',
    title: 'Lighthouse Tactical Symphony',
    artist: 'LightHouse Studio Audio',
    genre: 'Cinematic Orchestral',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=epic-hollywood-trailer-9489.mp3'
  },
  {
    id: 'zen_temple',
    title: 'Ethereal Mountain Temple',
    artist: 'Bamboo & Wind Symphony',
    genre: 'Zen Ambient Meditation',
    url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c5df00da2b.mp3?filename=zen-garden-meditation-ambient-125438.mp3'
  },
  {
    id: 'cyber_clash',
    title: 'Neural Core Overdrive',
    artist: 'AI Studio Synthesizer',
    genre: 'Cyberpunk Electronic',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=action-cyberpunk-electronic-108878.mp3'
  },
  {
    id: 'gothic_realm',
    title: 'Cathedral of Fallen Kings',
    artist: 'Chamber Choir & Cello',
    genre: 'Dark Fantasy Atmospheric',
    url: 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_33d6b05be5.mp3?filename=dark-mystery-trailer-116664.mp3'
  }
];

export function getTrackById(id?: string): AudioTrack {
  if (!id) return DEFAULT_TRACKS[0];
  const found = DEFAULT_TRACKS.find(t => t.id === id);
  return found || DEFAULT_TRACKS[0];
}
