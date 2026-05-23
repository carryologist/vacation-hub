'use client'

interface GoogleMapsWidgetProps {
  address: string
  label?: string
  className?: string
  height?: string
}

export default function GoogleMapsWidget({ 
  address,
  label,
  className = '', 
  height = '400px' 
}: GoogleMapsWidgetProps) {
  // Encode the address for the Google Maps embed URL
  const encodedAddress = encodeURIComponent(address)
  
  // Google Maps embed URL — keyless format
  const mapSrc = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  
  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ height }}>
        <iframe
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Property Location Map"
          className="w-full h-full"
        />
        
        {/* Overlay with address info */}
        <div className="absolute top-4 left-4 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-[calc(100%-2rem)]" style={{ background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              {label && (
                <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{label}</h4>
              )}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {address}
              </p>
            </div>
          </div>
        </div>
        
        {/* View in Google Maps link */}
        <div className="absolute bottom-4 right-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}
