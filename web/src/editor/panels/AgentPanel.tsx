type AgentPanelProps = {
  isOpen: boolean
  onToggle: () => void
}

export function AgentPanel({ isOpen, onToggle }: AgentPanelProps) {
  return (
    <div
      style={{
        width: isOpen ? 280 : 32,
        borderLeft: '1px solid #2f2f2f',
        background: '#161616',
        color: '#ddd',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <button
        onClick={onToggle}
        style={{
          height: 32,
          border: 0,
          background: '#1f1f1f',
          color: '#ddd',
          cursor: 'pointer'
        }}
      >
        {isOpen ? '▶' : '◀'}
      </button>
      {isOpen ? (
        <div style={{ padding: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Agent</div>
          <div>Agent support coming soon.</div>
        </div>
      ) : null}
    </div>
  )
}

