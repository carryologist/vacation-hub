'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

const MobileNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    if (isMenuOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMenuOpen]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/stay', label: 'Stay' },
    { href: '/things-to-do', label: 'Things to Do' },
    { href: '/photos', label: 'Photos' },
    { href: '/itinerary', label: 'Schedule' },
    { href: '/travel-notes', label: 'Travel' },
    { href: '/weather', label: 'Weather' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <div className="md:hidden relative">
      {/* Mobile Menu Button and Theme Toggle */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={toggleMenu}
          className="theme-toggle-btn min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle mobile menu"
          aria-expanded={isMenuOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={closeMenu}
          />

          {/* Dropdown Panel */}
          <div className="absolute top-full right-0 mt-2 w-56 z-20 mobile-nav-panel">
            <div className="p-3">
              <nav className="space-y-1">
                {navLinks.map(({ href, label }) => {
                  const isActive = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMenu}
                      className="mobile-nav-link"
                      style={isActive ? { fontWeight: 'bold', color: 'var(--brand)' } : undefined}
                    >
                      {href === '/settings' && (
                        <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MobileNavigation
