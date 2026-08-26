import { ABOUT, APP_NAME, APP_VERSION } from '@shared/catalog/about'
import { DISCLAIMER } from '@shared/catalog/theory'

export function Informazioni() {
  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', overflow: 'auto' }}>
      <div style={{ maxWidth: 720, paddingBottom: 48 }}>
        <div className="hair">{APP_NAME} · v{APP_VERSION}</div>
        <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600, fontSize: 36, margin: '6px 0 8px' }}>
          {ABOUT.name}
        </h1>
        <p style={{ color: '#c5cedb', fontSize: 17, marginBottom: 28 }}>{ABOUT.tagline}</p>

        <h2 style={{ fontFamily: 'Source Serif 4', fontSize: 22, fontWeight: 600 }}>Autore</h2>
        <p className="prose" style={{ marginTop: 8 }}>
          <strong>{ABOUT.author.name}</strong>
          <br />
          {ABOUT.author.role}
          <br />
          {ABOUT.author.order}
          <br />
          <a href={ABOUT.author.github} target="_blank" rel="noreferrer" style={{ color: '#2dd4bf' }}>
            {ABOUT.author.github}
          </a>
        </p>

        <h2 style={{ fontFamily: 'Source Serif 4', fontSize: 22, fontWeight: 600, marginTop: 28 }}>Cosa fa</h2>
        <p className="prose" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
          {ABOUT.what}
        </p>

        <h2 style={{ fontFamily: 'Source Serif 4', fontSize: 22, fontWeight: 600, marginTop: 28 }}>Cosa non è</h2>
        <ul className="prose" style={{ marginTop: 8, paddingLeft: 20 }}>
          {ABOUT.not.map((x) => (
            <li key={x} style={{ marginBottom: 6 }}>
              {x}
            </li>
          ))}
        </ul>

        <h2 style={{ fontFamily: 'Source Serif 4', fontSize: 22, fontWeight: 600, marginTop: 28 }}>Diritti</h2>
        <p className="prose" style={{ marginTop: 8 }}>
          {ABOUT.copyright}
        </p>
        <ul className="prose" style={{ paddingLeft: 20 }}>
          {ABOUT.rights.map((x) => (
            <li key={x} style={{ marginBottom: 6 }}>
              {x}
            </li>
          ))}
        </ul>

        <h2 style={{ fontFamily: 'Source Serif 4', fontSize: 22, fontWeight: 600, marginTop: 28 }}>Avvertenza</h2>
        <p className="prose" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
          {DISCLAIMER.replace(/\*\*/g, '')}
        </p>
      </div>
    </section>
  )
}
