type OutputPanelProps = {
  isOpen: boolean
  onToggle: () => void
  timeline: string[]
  logs: string[]
  status: string
}

export function OutputPanel({ isOpen, onToggle, timeline, logs, status }: OutputPanelProps) {
  return (
    <div
      style={{
        height: isOpen ? 220 : 32,
        borderTop: '1px solid #2f2f2f',
        background: '#131313',
        color: '#ddd',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <button
        onClick={onToggle}
        style={{
          height: 32,
          textAlign: 'left',
          border: 0,
          background: '#1a1a1a',
          color: '#ddd',
          cursor: 'pointer',
          padding: '0 10px'
        }}
      >
        {isOpen ? '▼' : '▲'} Output
      </button>
      {isOpen ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            padding: 8,
            minHeight: 0,
            flex: 1
          }}
        >
          <div style={{ overflow: 'auto', background: '#0f0f0f', borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Timeline</div>
            {timeline.length === 0 ? <div>No events yet.</div> : timeline.map((entry, i) => <div key={`${entry}-${i}`}>{entry}</div>)}
          </div>
          <div style={{ overflow: 'auto', background: '#0f0f0f', borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Logs</div>
            {logs.length === 0 ? <div>No logs yet.</div> : logs.map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}
            <div style={{ marginTop: 8, color: '#9ea3ad' }}>Status: {status}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

