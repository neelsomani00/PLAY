import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

type Props = {
  art?: string;
  className?: string;
};

// Not every track has usable embedded album art, and the legacy albumart
// content URI Android exposes isn't guaranteed to resolve on every device.
// This renders a note-glyph tile instead of a broken image whenever that
// happens, and resets itself whenever the art source changes so a failed
// image doesn't stay stuck covering later, perfectly loadable art.
export default function AlbumArt({ art, className }: Props) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => setImgError(false), [art]);

  const showImg = !!art && !imgError;

  return (
    <div className={`album-art ${className ?? ''}`}>
      {showImg ? (
        <img src={Capacitor.convertFileSrc(art as string)} alt="" onError={() => setImgError(true)} />
      ) : (
        <span className="album-art-fallback">♪</span>
      )}
    </div>
  );
}
