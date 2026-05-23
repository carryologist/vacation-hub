'use client'
import { useState, useEffect } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface CountdownProps {
  targetDate: string
  label: string
  sublabel: string
}

export default function Countdown({ targetDate, label, sublabel }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [isEventHere, setIsEventHere] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const target = new Date(targetDate)
    
    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = target.getTime() - now
      
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        
        setTimeLeft({ days, hours, minutes, seconds })
        setIsEventHere(false)
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        setIsEventHere(true)
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [targetDate])

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-8">
        <div
          className="rounded-xl h-24 w-80"
          style={{ backgroundColor: 'var(--bg-card)', opacity: 0.5 }}
        ></div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center py-8">
      <div
        className="backdrop-blur-md rounded-xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="text-center mb-4">
          <h3
            className="font-display font-semibold text-sm uppercase mb-1"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
          >
            {label}
          </h3>
          <p
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {sublabel}
          </p>
        </div>
        
        {isEventHere ? (
          <div className="text-center py-4">
            <div className="font-display text-2xl sm:text-3xl font-bold" style={{ color: 'var(--brand)' }}>
              The Event Is Here! 🎉
            </div>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hrs', value: timeLeft.hours },
              { label: 'Min', value: timeLeft.minutes },
              { label: 'Sec', value: timeLeft.seconds }
            ].map((unit) => (
              <div key={unit.label} className="text-center">
                <div
                  className="rounded-lg p-3 min-w-[48px]"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  <div className="font-display text-white font-bold text-xl tabular-nums">
                    {unit.value.toString().padStart(2, '0')}
                  </div>
                </div>
                <div
                  className="text-xs mt-2 font-medium uppercase"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                >
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
