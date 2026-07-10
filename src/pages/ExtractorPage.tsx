import { useRef, useState } from 'react';
import { extractAudioFromVideo, type ExtractStage } from '../lib/audioExtractor';

type Props = {
  onExtracted: () => void;
};

const STAGE_LABEL: Record<ExtractStage, string> = {
  loading: 'Loading extractor (first time only)…',
  extracting: 'Extracting audio…',
  saving: 'Saving to your library…',
  done: 'Done!'
};

export default function ExtractorPage({ onExtracted }: Props) {
  const [stage, setStage] = useState<ExtractStage | 'idle' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [resultName, setResultName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setStage('loading');
    setProgress(0);
    setResultName(null);
    setErrorMsg(null);

    try {
      const result = await extractAudioFromVideo(file, p => {
        setStage(p.stage);
        setProgress(p.progress);
      });
      setResultName(result.fileName);
      setStage('done');
      onExtracted();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong extracting the audio.');
      setStage('error');
    }
  };

  const busy = stage === 'loading' || stage === 'extracting' || stage === 'saving';

  return (
    <div className="scroll-area extractor-page">
      <section>
        <h2>Video to audio</h2>
        <p className="empty-sub extractor-intro">
          Pick a video that already has the audio you want — something you recorded, or
          any video file on your phone — and this pulls just the audio track out and
          adds it straight to your library.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden-file-input"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        <button
          className="extractor-pick-btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? 'Working…' : '🎬 Choose a video'}
        </button>

        {busy && (
          <div className="extractor-progress">
            <div className="extractor-stage-label">{STAGE_LABEL[stage as ExtractStage]}</div>
            <div className="progress-track">
              {stage === 'loading' ? (
                <div className="progress-fill indeterminate" />
              ) : (
                <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
              )}
            </div>
          </div>
        )}

        {stage === 'done' && resultName && (
          <div className="extractor-result success">
            Saved "{resultName}" — it's on the Home tab now.
          </div>
        )}

        {stage === 'error' && errorMsg && (
          <div className="extractor-result error">{errorMsg}</div>
        )}
      </section>
    </div>
  );
}
