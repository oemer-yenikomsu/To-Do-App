import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'reacttodoapp.tasks.v1'
const HISTORY_LIMIT = 100

const STARTER = [
  { id: '1', text: 'Lebenslauf und Projekte vorbereiten', done: false },
  { id: '2', text: 'Todo-App für die Vorstellung prüfen', done: true },
  { id: '3', text: 'Demo-Ablauf einmal durchspielen', done: false },
]

function cloneTasks(tasks) {
  return tasks.map((t) => ({ ...t }))
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return STARTER
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return STARTER
    return parsed
      .filter((t) => t && typeof t.text === 'string')
      .map((t) => ({
        id: String(t.id ?? crypto.randomUUID()),
        text: t.text.trim(),
        done: Boolean(t.done),
      }))
      .filter((t) => t.text.length > 0)
  } catch {
    return STARTER
  }
}

function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState('active')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [historyTick, setHistoryTick] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const inputId = useId()
  const helpTitleId = useId()
  const undoStack = useRef([])
  const redoStack = useRef([])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const canUndo = undoStack.current.length > 0
  const canRedo = redoStack.current.length > 0
  void historyTick

  const visible = useMemo(() => {
    if (filter === 'active') return tasks.filter((t) => !t.done)
    if (filter === 'done') return tasks.filter((t) => t.done)
    return tasks
  }, [tasks, filter])

  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.done).length
    return { total: tasks.length, open, done: tasks.length - open }
  }, [tasks])

  function bumpHistory() {
    setHistoryTick((n) => n + 1)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  function commit(nextTasks) {
    setTasks((prev) => {
      undoStack.current.push(cloneTasks(prev))
      if (undoStack.current.length > HISTORY_LIMIT) {
        undoStack.current.shift()
      }
      redoStack.current = []
      return typeof nextTasks === 'function' ? nextTasks(prev) : nextTasks
    })
    bumpHistory()
  }

  function undo() {
    if (undoStack.current.length === 0) return
    setTasks((prev) => {
      const previous = undoStack.current.pop()
      redoStack.current.push(cloneTasks(prev))
      return previous
    })
    cancelEdit()
    bumpHistory()
  }

  function redo() {
    if (redoStack.current.length === 0) return
    setTasks((prev) => {
      const next = redoStack.current.pop()
      undoStack.current.push(cloneTasks(prev))
      return next
    })
    cancelEdit()
    bumpHistory()
  }

  const undoRef = useRef(undo)
  const redoRef = useRef(redo)
  undoRef.current = undo
  redoRef.current = redo

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && helpOpen) {
        event.preventDefault()
        setHelpOpen(false)
        return
      }

      const key = event.key.toLowerCase()
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undoRef.current()
        return
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        redoRef.current()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [helpOpen])

  function addTask(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    commit((prev) => [
      { id: crypto.randomUUID(), text, done: false },
      ...prev,
    ])
    setDraft('')
  }

  function toggleTask(id) {
    commit((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }

  function removeTask(id) {
    commit((prev) => prev.filter((t) => t.id !== id))
    if (editingId === id) cancelEdit()
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditText(task.text)
  }

  function saveEdit(event) {
    event.preventDefault()
    const text = editText.trim()
    if (!text || !editingId) return
    const current = tasks.find((t) => t.id === editingId)
    if (current && current.text === text) {
      cancelEdit()
      return
    }
    commit((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, text } : t)),
    )
    cancelEdit()
  }

  function clearDone() {
    if (stats.done === 0) return
    commit((prev) => prev.filter((t) => !t.done))
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">React Todo App</p>
          <button
            type="button"
            className="ghost help-btn"
            onClick={() => setHelpOpen(true)}
            aria-haspopup="dialog"
          >
            Hilfe
          </button>
        </div>
        <h1>Aufgaben</h1>
      </header>

      <main className="panel">
        <form className="composer" onSubmit={addTask}>
          <label className="sr-only" htmlFor={inputId}>
            Neue Aufgabe
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Neue Aufgabe…"
            autoComplete="off"
          />
          <button type="submit">Hinzufügen</button>
        </form>

        <div className="toolbar">
          <div className="filters" role="tablist" aria-label="Filter">
            {[
              { id: 'active', label: 'Offen' },
              { id: 'done', label: 'Erledigt' },
              { id: 'all', label: 'Alle' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={filter === f.id ? 'is-active' : undefined}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="history">
            <button
              type="button"
              className="ghost"
              onClick={undo}
              disabled={!canUndo}
              title="Rückgängig (Strg+Z)"
            >
              Rückgängig
            </button>
            <button
              type="button"
              className="ghost"
              onClick={redo}
              disabled={!canRedo}
              title="Wiederholen (Strg+Y)"
            >
              Wiederholen
            </button>
          </div>
        </div>

        <p className="stats">
          {stats.open} offen · {stats.done} erledigt
        </p>

        <ul className="list">
          {visible.length === 0 && (
            <li className="empty">Keine Aufgaben in diesem Filter.</li>
          )}
          {visible.map((task) => (
            <li key={task.id} className={task.done ? 'item is-done' : 'item'}>
              {editingId === task.id ? (
                <form className="edit-row" onSubmit={saveEdit}>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    aria-label="Aufgabe bearbeiten"
                  />
                  <button type="submit">Speichern</button>
                  <button type="button" className="ghost" onClick={cancelEdit}>
                    Abbrechen
                  </button>
                </form>
              ) : (
                <>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span>{task.text}</span>
                  </label>
                  <div className="actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => startEdit(task)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => removeTask(task.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        <footer className="footer">
          <button
            type="button"
            className="ghost"
            onClick={clearDone}
            disabled={stats.done === 0}
          >
            Erledigte löschen
          </button>
        </footer>
      </main>

      {helpOpen && (
        <div
          className="help-backdrop"
          onClick={() => setHelpOpen(false)}
          role="presentation"
        >
          <div
            className="help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={helpTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="help-head">
              <h2 id={helpTitleId}>Hilfe</h2>
              <button
                type="button"
                className="ghost"
                onClick={() => setHelpOpen(false)}
              >
                Schließen
              </button>
            </div>
            <div className="help-body">
              <p>Mit dieser App kannst du Aufgaben verwalten:</p>
              <ul>
                <li>Hinzufügen über das Eingabefeld</li>
                <li>Abhaken, bearbeiten oder einzeln löschen</li>
                <li>Standardansicht: offene Aufgaben; bei Bedarf Erledigt oder Alle</li>
                <li>Alle erledigten auf einmal entfernen</li>
              </ul>
              <p>
                <strong>Rückgängig / Wiederholen</strong>
              </p>
              <ul>
                <li>
                  <kbd>Strg</kbd> + <kbd>Z</kbd> — letzte Aktion rückgängig
                </li>
                <li>
                  <kbd>Strg</kbd> + <kbd>Y</kbd> — wiederholen
                </li>
                <li>
                  Auch nach versehentlichem Löschen, „Erledigte löschen“ oder
                  Bearbeiten
                </li>
              </ul>
              <p>
                Die Liste wird lokal im Browser gespeichert
                (<code>localStorage</code>).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
