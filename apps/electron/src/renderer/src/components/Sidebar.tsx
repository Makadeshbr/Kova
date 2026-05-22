import React, { useEffect, useMemo, useState } from 'react'
import type { ExecutionState } from '../types'
import type { SessionUsage } from '../App'
import type { PersistedSession } from '../app-state'
import { ProjectFiles } from './ProjectFiles'

interface Props {
  executionState: ExecutionState | null
  projectRoot: string | null
  sessionUsage: SessionUsage
  changedPaths: Set<string>
  refreshKey: number
  currentSessionId: string | null
  onOpenFile: (path: string) => void
  onLoadSession: (session: PersistedSession) => void
  onNewChat: () => void
  onOpenFolder: () => void
}

type Section = 'chats' | 'project'

function projectName(root: string | null): string {
  return root?.replace(/\\/g, '/').split('/').at(-1) || 'No project attached'
}

function sessionTitle(session: PersistedSession): string {
  return String(session.title || session.messages?.find(message => message.role === 'user')?.content || 'New chat')
}

export function Sidebar({
  executionState,
  projectRoot,
  sessionUsage,
  changedPaths,
  refreshKey,
  currentSessionId,
  onOpenFile,
  onLoadSession,
  onNewChat,
  onOpenFolder,
}: Props): React.ReactElement {
  const [section, setSection] = useState<Section>('chats')
  const [sessions, setSessions] = useState<PersistedSession[]>([])

  const history = executionState?.iterationHistory ?? []
  const contextSummary = useMemo(() => {
    if (sessionUsage.contextFiles.length === 0 && sessionUsage.contextTokens === 0) return null
    const tokens = sessionUsage.contextTokens >= 1000
      ? `${(sessionUsage.contextTokens / 1000).toFixed(1)}k`
      : String(sessionUsage.contextTokens)
    return `${sessionUsage.contextFiles.length} files / ${tokens} ctx`
  }, [sessionUsage.contextFiles.length, sessionUsage.contextTokens])

  useEffect(() => {
    window.kova.listSessions(projectRoot).then(setSessions).catch(() => setSessions([]))
  }, [currentSessionId, projectRoot, refreshKey])

  return (
    <aside className="kova-sidebar">
      <div className="kova-sidebar-top">
        <button className="kova-new-chat" onClick={onNewChat}>
          <span className="material-symbols-outlined">edit_square</span>
          New chat
        </button>

        <button className="kova-workspace-button" onClick={onOpenFolder} title={projectRoot ?? 'Attach project'}>
          <span className="material-symbols-outlined">folder_open</span>
          <span>
            <strong>{projectName(projectRoot)}</strong>
            <small>{projectRoot ? 'Workspace attached' : 'Chat works without a folder'}</small>
          </span>
        </button>
      </div>

      <div className="kova-sidebar-tabs" role="tablist" aria-label="Sidebar sections">
        <button className={section === 'chats' ? 'active' : ''} onClick={() => setSection('chats')}>
          <span className="material-symbols-outlined">forum</span>
          Chats
        </button>
        <button className={section === 'project' ? 'active' : ''} onClick={() => setSection('project')}>
          <span className="material-symbols-outlined">terminal</span>
          Project
        </button>
      </div>

      {section === 'chats' && (
        <div className="kova-sidebar-scroll">
          {sessions.length === 0 && (
            <div className="kova-sidebar-empty">
              <span className="material-symbols-outlined">chat</span>
              <p>No saved chats yet.</p>
            </div>
          )}
          {sessions.map(session => {
            const active = session.id === currentSessionId
            return (
              <div key={session.id} className={`kova-chat-row ${active ? 'active' : ''}`}>
                <button onClick={() => onLoadSession(session)} title={sessionTitle(session)}>
                  <span className="material-symbols-outlined">chat_bubble</span>
                  <span>
                    <strong>{sessionTitle(session)}</strong>
                    <small>
                      {session.recoveredFromSnapshot ? 'Recovered' : session.projectRoot ? projectName(session.projectRoot) : 'Global chat'} / {session.messages?.length || 0} msgs
                    </small>
                    {session.recoveryNote && <small className="kova-recovery-note">{session.recoveryNote}</small>}
                  </span>
                </button>
                <button
                  className="kova-chat-delete"
                  title="Delete chat"
                  onClick={async () => {
                    await window.kova.deleteSession(projectRoot, session.id)
                    setSessions(prev => prev.filter(item => item.id !== session.id))
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {section === 'project' && (
        <div className="kova-sidebar-scroll">
          <div className="kova-project-summary">
            <span className={`kova-status-dot ${projectRoot ? 'online' : ''}`} />
            <div>
              <strong>{projectName(projectRoot)}</strong>
              <small>{contextSummary ?? (projectRoot ? 'Ready for code mode' : 'Attach a folder to edit files')}</small>
            </div>
          </div>

          {projectRoot ? (
            <>
              <div className="kova-sidebar-section-title">
                <span>Files</span>
                {history.length > 0 && <small>{history.length} runs</small>}
              </div>
              <ProjectFiles projectRoot={projectRoot} changedPaths={changedPaths} onOpenFile={onOpenFile} refreshKey={refreshKey} />
            </>
          ) : (
            <button className="kova-attach-empty" onClick={onOpenFolder}>
              <span className="material-symbols-outlined">create_new_folder</span>
              Attach project folder
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
