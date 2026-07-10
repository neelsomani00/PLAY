type Props = {
  isScanning: boolean;
  onGrantAccess: () => void;
};

export default function PermissionGate({ isScanning, onGrantAccess }: Props) {
  return (
    <div className="permission-gate">
      <div className="permission-icon">♪</div>
      <h1>PLAY</h1>
      <p>To show your music, PLAY needs permission to see the audio files stored on this phone.</p>
      <p className="permission-sub">Everything stays on your device — this only reads local files so it can play them.</p>
      <button className="grant-btn" onClick={onGrantAccess} disabled={isScanning}>
        {isScanning ? 'Checking…' : 'Grant access'}
      </button>
    </div>
  );
}
