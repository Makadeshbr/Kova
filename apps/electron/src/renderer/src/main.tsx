import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--bg-1)', height: '100vh' }}>
        <b>Erro ao renderizar:</b>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
