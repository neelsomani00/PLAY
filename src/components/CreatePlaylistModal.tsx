import { useState } from 'react';

type Props = {
  onCreate: (name: string) => void;
  onClose: () => void;
};

export default function CreatePlaylistModal({ onCreate, onClose }: Props) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New playlist</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="new-playlist-row new-playlist-row-modal">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Playlist name"
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button className="new-playlist-btn" onClick={handleCreate} disabled={!name.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
