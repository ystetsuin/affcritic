export function Footer() {
  return (
    <footer className="site-footer d-footer">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="footer-logo">Aff<span>Critic</span></div>
          <p className="footer-desc">
            Агрегатор новин affiliate та iGaming індустрії з Telegram-каналів.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="#" className="footer-btn">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v6M5 8h6" />
            </svg>
            Додати канал
          </a>
          <a href="/about" className="footer-btn">Про нас</a>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <span className="footer-copy">&copy; 2026 AffCritic</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="#" className="footer-social" title="Telegram" rel="nofollow noopener noreferrer" target="_blank">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.95 2.68L11.82 13.1c-.16.7-.57.87-1.16.54l-3.2-2.36-1.54 1.49c-.17.17-.32.31-.65.31l.23-3.26 5.94-5.37c.26-.23-.06-.36-.4-.13L4.3 9.54l-3.11-.97c-.68-.21-.69-.68.14-.99l12.16-4.69c.56-.21 1.05.14.87 1z" />
            </svg>
          </a>
          <a href="#" className="footer-social" title="LinkedIn" rel="nofollow noopener noreferrer" target="_blank">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.27 14H1.6V5.4h2.67V14zM2.93 4.27a1.55 1.55 0 110-3.1 1.55 1.55 0 010 3.1zM14.4 14h-2.67V9.8c0-1-.02-2.28-1.39-2.28-1.39 0-1.6 1.09-1.6 2.21V14H6.07V5.4h2.56v1.17h.04c.36-.68 1.23-1.39 2.53-1.39 2.7 0 3.2 1.78 3.2 4.1V14z" />
            </svg>
          </a>
          <a href="mailto:hello@affcritic.com" className="footer-social" title="Email">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
              <path d="M2 4.5l6 4.5 6-4.5" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
