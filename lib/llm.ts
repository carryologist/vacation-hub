import { decrypt } from './crypto';
import { getConfig } from './config';

interface Activity {
  title: string;
  description: string;
  category: string;
  location: string;
  website: string | null;
}

interface GenerateOptions {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  destination: string;
  startDate: string;
  endDate: string;
}

const SYSTEM_PROMPT = `You are a travel expert. Generate activity suggestions for group vacations. Always return valid JSON.`;

function buildPrompt(destination: string, startDate: string, endDate: string): string {
  return `Generate 20 activity suggestions for a group vacation to ${destination} from ${startDate} to ${endDate}.

Return ONLY a JSON array (no markdown, no code fences). Each item must have:
{
  "title": "string",
  "description": "string (2-3 sentences)",
  "category": "one of: Restaurants, Attractions, Entertainment, Day Trips, Outdoors, Shopping",
  "location": "string (address or area)",
  "website": "string URL or null"
}

Include a good mix of categories. Prioritize well-known, highly-rated options. Include addresses where possible.`;
}

async function callOpenAI(apiKey: string, prompt: string): Promise<Activity[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);
  // Handle both {activities: [...]} and [...] formats
  return Array.isArray(parsed) ? parsed : parsed.activities || parsed.suggestions || Object.values(parsed)[0];
}

async function callAnthropic(apiKey: string, prompt: string): Promise<Activity[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt + '\n\nReturn ONLY the JSON array, nothing else.' }]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  const content = data.content[0].text;
  // Strip any markdown code fences if present
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function callGemini(apiKey: string, prompt: string): Promise<Activity[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt + '\n\nReturn ONLY the JSON array, nothing else.' }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  const content = data.candidates[0].content.parts[0].text;
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function generateActivities(opts: GenerateOptions): Promise<Activity[]> {
  const prompt = buildPrompt(opts.destination, opts.startDate, opts.endDate);
  
  switch (opts.provider) {
    case 'openai': return callOpenAI(opts.apiKey, prompt);
    case 'anthropic': return callAnthropic(opts.apiKey, prompt);
    case 'gemini': return callGemini(opts.apiKey, prompt);
    default: throw new Error(`Unknown provider: ${opts.provider}`);
  }
}

// Get the API key - check env vars first, then encrypted DB value
export async function getApiKey(provider: string): Promise<string | null> {
  // Check env vars first
  const envMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY'
  };
  const envKey = process.env[envMap[provider]];
  if (envKey) return envKey;

  // Check encrypted DB value
  try {
    const config = await getConfig();
    if (config?.llmApiKeyEncrypted && config.llmProvider === provider) {
      return decrypt(config.llmApiKeyEncrypted);
    }
  } catch {
    // Decryption failed or no config
  }
  return null;
}
