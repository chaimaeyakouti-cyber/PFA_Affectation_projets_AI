import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useEffect, useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
  /** Back button path. If provided, shows a back button */
  backPath?: string
  backLabel?: string
}

export default function Layout({ children, backPath, backLabel }: LayoutProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme, isDark } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<{ nom?: string; role?: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))

    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/')
  }

  const roleLabel: Record<string, string> = {
    etudiant: 'Espace Étudiant',
    encadrant: 'Espace Encadrant',
    coordinateur: 'Espace Coordinateur',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', transition: 'background var(--transition-slow)' }}>
      {/* ── Navbar ── */}
      <nav
        className="nav"
        style={{
          boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
          transition: 'box-shadow 0.3s ease, background 0.4s ease',
        }}
      >
        <div className="nav-inner">
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {backPath ? (
              <button
                onClick={() => navigate(backPath)}
                className="btn btn-ghost btn-sm"
                style={{ gap: 6, marginRight: 4 }}
              >
                ← {backLabel ?? 'Retour'}
              </button>
            ) : (
              <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <div className="nav-logo">🎓</div>
                <div>
                  <div className="nav-title">PFA Affectation</div>
                  <div className="nav-subtitle">INPT · {user?.role ? roleLabel[user.role] : 'Plateforme IA'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="nav-actions">
            {/* Theme Toggle */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Passer en mode ${isDark ? 'clair' : 'sombre'}`}
              title={`Mode ${isDark ? 'clair' : 'sombre'}`}
            >
              <span className="theme-toggle-icons">
                <span>☀️</span>
                <span>🌙</span>
              </span>
            </button>

            {/* User chip */}
            {user && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px 6px 6px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onClick={handleLogout}
                title="Se déconnecter"
              >
                <div className="avatar avatar-sm">
                  {(user.nom?.[0] ?? '?').toUpperCase()}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {user.nom?.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      {children}
    </div>
  )
}