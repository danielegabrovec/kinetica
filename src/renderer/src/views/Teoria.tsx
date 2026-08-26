import { useState } from 'react'
import Markdown from 'react-markdown'
import { DISCLAIMER, THEORY_PAGES } from '@shared/catalog/theory'

export function Teoria() {
  const [id, setId] = useState(THEORY_PAGES[0].id)
  const page = THEORY_PAGES.find((p) => p.id === id) ?? THEORY_PAGES[0]
  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
      <nav>
        {THEORY_PAGES.map((p) => (
          <button
            key={p.id}
            className={`line-card ${p.id === id ? 'sel' : ''}`}
            onClick={() => setId(p.id)}
          >
            {p.title}
          </button>
        ))}
      </nav>
      <article>
        <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600, fontSize: 32 }}>{page.title}</h1>
        <div className="prose">
          <Markdown>{page.body}</Markdown>
        </div>
        <div className="prose" style={{ marginTop: 32, opacity: 0.85 }}>
          <Markdown>{DISCLAIMER}</Markdown>
        </div>
      </article>
    </section>
  )
}
