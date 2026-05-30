import type { ItineraryEvent } from './db';

// --- RFC 5545 Text Escaping ---

/**
 * Escape special characters per RFC 5545 §3.3.11 (TEXT type).
 * Backslashes, semicolons, commas are escaped; newlines become literal \n.
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// --- RFC 5545 Line Folding ---

/**
 * Fold a content line so no line exceeds 75 octets (bytes).
 * Continuation lines begin with a single space (LWSP).
 * Uses \r\n as the line break per RFC 5545.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= 75) {
    return line;
  }

  const parts: string[] = [];
  let offset = 0;

  // First line: up to 75 octets
  // Continuation lines: leading SPACE counts toward the 75-octet limit
  let maxOctets = 75;

  while (offset < bytes.length) {
    // We need to split on a valid UTF-8 boundary.
    let end = Math.min(offset + maxOctets, bytes.length);

    // Walk back if we'd split a multi-byte character
    if (end < bytes.length) {
      while (end > offset && (bytes[end] & 0xc0) === 0x80) {
        end--;
      }
    }

    const chunk = new TextDecoder().decode(bytes.slice(offset, end));
    parts.push(chunk);
    offset = end;

    // Subsequent lines have a leading space that eats 1 octet
    maxOctets = 74; // 75 minus 1 for the leading space
  }

  return parts.join('\r\n ');
}

/**
 * Fold each line in an array independently, then join with \r\n.
 */
function foldLines(lines: string[]): string {
  return lines.map(foldLine).join('\r\n');
}

// --- Date Formatting ---

/**
 * Convert an ISO 8601 timestamp string to iCalendar UTC format: YYYYMMDDTHHmmssZ
 */
function toICalDateUTC(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

// --- VTIMEZONE Generation ---

/**
 * Generate a minimal VTIMEZONE component as individual lines.
 * For UTC or when no timezone is specified, we still include a block
 * so consuming clients have a reference.
 */
function generateVTimezoneLines(timezone: string): string[] {
  const lines: string[] = [];
  lines.push('BEGIN:VTIMEZONE');
  lines.push(`TZID:${timezone}`);

  if (timezone === 'UTC') {
    lines.push('BEGIN:STANDARD');
    lines.push('DTSTART:19700101T000000');
    lines.push('TZOFFSETFROM:+0000');
    lines.push('TZOFFSETTO:+0000');
    lines.push('TZNAME:UTC');
    lines.push('END:STANDARD');
  } else {
    // Generic STANDARD block — clients that understand TZID by name
    // (most modern clients use the Olson database) will resolve the rules.
    // We provide a safe fallback with zero offset.
    lines.push('BEGIN:STANDARD');
    lines.push('DTSTART:19700101T000000');
    lines.push('TZOFFSETFROM:+0000');
    lines.push('TZOFFSETTO:+0000');
    lines.push(`TZNAME:${timezone}`);
    lines.push('END:STANDARD');
  }

  lines.push('END:VTIMEZONE');
  return lines;
}

// --- VEVENT Generation ---

function generateVEventLines(event: ItineraryEvent): string[] {
  const now = new Date().toISOString();
  const dtstamp = toICalDateUTC(event.updated_at || now);
  const created = toICalDateUTC(event.created_at || now);
  const uid = `${event.id ?? Date.now()}@vacation-hub`;

  const lines: string[] = [];
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${uid}`);
  lines.push(`DTSTAMP:${dtstamp}`);
  lines.push(`DTSTART:${toICalDateUTC(event.start_time)}`);
  lines.push(`DTEND:${toICalDateUTC(event.end_time)}`);
  lines.push(`CREATED:${created}`);
  lines.push(`LAST-MODIFIED:${dtstamp}`);
  lines.push(`SUMMARY:${escapeText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push(`CATEGORIES:${event.category.toUpperCase()}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');
  lines.push('END:VEVENT');

  return lines;
}

// --- Public API ---

/**
 * Generate a full iCalendar document containing all provided events.
 */
export function generateICalendar(
  events: ItineraryEvent[],
  calendarName: string,
  timezone: string = 'UTC',
): string {
  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//VacationHub//Itinerary//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeText(calendarName)} Itinerary`);

  // VTIMEZONE
  lines.push(...generateVTimezoneLines(timezone));

  // VEVENTs
  for (const event of events) {
    lines.push(...generateVEventLines(event));
  }

  lines.push('END:VCALENDAR');

  return foldLines(lines) + '\r\n';
}

/**
 * Generate an iCalendar document for a single event.
 */
export function generateSingleEventIcs(
  event: ItineraryEvent,
  calendarName: string,
  timezone: string = 'UTC',
): string {
  return generateICalendar([event], calendarName, timezone);
}
