import CoverCard from '../components/CoverCard';
import SongRow from '../components/SongRow';
import type { Track } from '../lib/mediaStore';

type Props = {
  hasTracks: boolean;
  isScanning: boolean;
  mostPlayed: Track[];
  filteredSongs: Track[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
};

export default function HomePage({
  hasTracks,
  isScanning,
  mostPlayed,
  filteredSongs,
  searchQuery,
  onSearchChange,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onAddToPlaylist
}: Props) {
  return (
    <>
      <div className="search-row">
        <span className="search-icon">🔍</span>
        <input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search songs, artists, albums"
        />
      </div>

      <div className="scroll-area">
        {!hasTracks && !isScanning && (
          <div className="empty-state">
            <p>No audio files found on this device.</p>
            <p className="empty-sub">Download or transfer some songs, then tap rescan.</p>
          </div>
        )}

        {mostPlayed.length > 0 && !searchQuery && (
          <section>
            <h2>Most listened</h2>
            <div className="hscroll">
              {mostPlayed.map(t => (
                <CoverCard
                  key={t.id}
                  title={t.title}
                  subtitle={t.artist}
                  art={t.albumArtUri}
                  active={t.id === currentTrackId}
                  onClick={() => onPlayTrack(t)}
                />
              ))}
            </div>
          </section>
        )}

        {hasTracks && (
          <section>
            <h2>{searchQuery ? `Results for "${searchQuery}"` : 'All songs'}</h2>
            <div className="song-list">
              {filteredSongs.map(t => (
                <SongRow
                  key={t.id}
                  track={t}
                  active={t.id === currentTrackId}
                  playing={isPlaying && t.id === currentTrackId}
                  onClick={() => onPlayTrack(t)}
                  onAddToPlaylist={() => onAddToPlaylist(t)}
                />
              ))}
              {filteredSongs.length === 0 && (
                <p className="empty-sub" style={{ padding: '12px 4px' }}>No matches.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
