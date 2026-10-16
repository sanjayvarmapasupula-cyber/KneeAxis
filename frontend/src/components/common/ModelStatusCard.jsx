import StatusPill from './StatusPill';

export default function ModelStatusCard({
  name,
  architecture,
  input,
  output,
  weightsInstalled = false,
  status = 'Not trained',
  metrics = null,
  onRun = null,
}) {
  // Determine display status and pill variant
  let pillVariant = 'pending';
  let statusText = status || 'Not trained';

  if (status === 'ready' || status === 'Ready') {
    pillVariant = 'success';
    statusText = 'Ready';
  } else if (status === 'loading' || status === 'Loading') {
    pillVariant = 'info';
    statusText = 'Loading';
  } else if (status === 'failed' || status === 'Failed') {
    pillVariant = 'error';
    statusText = 'Failed';
  } else {
    pillVariant = 'pending';
    statusText = 'Not trained';
  }

  const isReady = statusText === 'Ready' && weightsInstalled;

  return (
    <article
      className="rounded-[12px] p-[24px] bg-white transition-all"
      style={{
        border: '1px solid var(--ka-line)',
        boxShadow: 'var(--ka-soft-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <StatusPill variant={pillVariant}>{statusText}</StatusPill>
        {metrics && (
          <span className="text-[11px] font-mono" style={{ color: 'var(--ka-muted)' }}>
            {metrics}
          </span>
        )}
      </div>

      <h3
        className="text-[16px] font-semibold tracking-tight mb-1"
        style={{ color: 'var(--ka-ink-strong)' }}
      >
        {name}
      </h3>
      <p className="text-[12px] mb-4" style={{ color: 'var(--ka-muted)' }}>
        Planned architecture: {architecture}
      </p>

      <div
        className="grid grid-cols-2 gap-3 text-[12px] py-4 my-2 border-t"
        style={{ borderColor: 'var(--ka-line)' }}
      >
        <div>
          <span className="block text-[11px] mb-1" style={{ color: 'var(--ka-muted)' }}>
            Input
          </span>
          <b className="font-medium" style={{ color: 'var(--ka-ink)' }}>
            {input}
          </b>
        </div>
        <div>
          <span className="block text-[11px] mb-1" style={{ color: 'var(--ka-muted)' }}>
            Output
          </span>
          <b className="font-medium" style={{ color: 'var(--ka-ink)' }}>
            {output}
          </b>
        </div>
        <div>
          <span className="block text-[11px] mb-1" style={{ color: 'var(--ka-muted)' }}>
            Weights
          </span>
          <b
            className="font-medium"
            style={{ color: weightsInstalled ? 'var(--ka-brand)' : 'var(--ka-muted)' }}
          >
            {weightsInstalled ? 'Installed' : 'Not available'}
          </b>
        </div>
        <div>
          <span className="block text-[11px] mb-1" style={{ color: 'var(--ka-muted)' }}>
            Inference
          </span>
          <b
            className="font-medium"
            style={{ color: isReady ? 'var(--ka-brand)' : 'var(--ka-muted)' }}
          >
            {isReady ? 'Active' : 'Unavailable'}
          </b>
        </div>
      </div>

      <div className="mt-4 pt-2">
        <button
          onClick={isReady && onRun ? onRun : undefined}
          disabled={!isReady}
          className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-[9px] text-[13px] font-semibold transition-all"
          style={{
            border: isReady ? '1px solid var(--ka-brand)' : '1px solid #cbdbe1',
            background: isReady ? 'var(--ka-brand)' : '#f9fafb',
            color: isReady ? '#ffffff' : 'var(--ka-muted)',
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: isReady ? 1 : 0.65,
          }}
          title={
            isReady
              ? 'Run inference'
              : 'Model is not trained or weights are not installed. Real inference requires verified weights.'
          }
        >
          {isReady ? 'Run analysis' : 'Analysis unavailable (model not trained)'}
        </button>
      </div>
    </article>
  );
}
