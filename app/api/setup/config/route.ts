import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig, deleteConfig, initConfigTable } from '@/lib/config';
import { encrypt, hasSecret } from '@/lib/crypto';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    await initConfigTable();
    const config = await getConfig();
    if (!config) {
      return NextResponse.json({ setupComplete: false });
    }

    // Check if caller is authenticated
    const authCookie = request.cookies.get('vacation-hub-auth');
    const secret = process.env.VACATION_HUB_SECRET;
    let isAuthenticated = false;

    if (authCookie && secret) {
      // Quick HMAC check — import the Node.js verifier
      const { verifyAuthTokenNode } = await import('@/lib/auth');
      isAuthenticated = verifyAuthTokenNode(authCookie.value, secret);
    }

    // Strip sensitive fields always
    const { passwordHash, llmApiKeyEncrypted, ...safe } = config;

    if (isAuthenticated) {
      // Authenticated: return full safe config
      return NextResponse.json({
        ...safe,
        hasPassword: !!passwordHash,
        hasLlmKey: !!llmApiKeyEncrypted,
      });
    } else {
      // Unauthenticated: return only what's needed for setup/password flow
      return NextResponse.json({
        setupComplete: config.setupComplete ?? false,
        hasPassword: !!passwordHash,
        tripName: config.tripName, // needed for password page title
      });
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth required — but allow first-time setup (no config exists yet)
    await initConfigTable();
    const existingConfig = await getConfig();

    if (existingConfig && existingConfig.setupComplete) {
      // Site is already set up — require auth to modify
      const authError = requireAuth(request);
      if (authError) return authError;
    }

    const data = await request.json();
    
    // Hash password if provided as plaintext
    if (data.password && !data.passwordHash) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }
    
    // Encrypt API key if provided
    if (data.llmApiKey) {
      if (hasSecret()) {
        data.llmApiKeyEncrypted = encrypt(data.llmApiKey);
      }
      delete data.llmApiKey;
    }
    
    await saveConfig(data);
    
    const response = NextResponse.json({ success: true });
    
    // Set setup-done cookie if setup is complete
    if (data.setupComplete) {
      response.cookies.set('vacation-hub-setup-done', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
        path: '/',
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth always required for nuclear reset
    const authError = requireAuth(request);
    if (authError) return authError;

    // Delete all data - nuclear reset
    await deleteConfig();
    await sql`DELETE FROM itinerary_events`;
    await sql`DELETE FROM activity_suggestions`;
    await sql`DELETE FROM travel_notes`;
    await sql`DELETE FROM photos`;
    
    const response = NextResponse.json({ success: true });
    // Clear cookies
    response.cookies.set('vacation-hub-setup-done', '', { maxAge: 0, path: '/' });
    response.cookies.set('vacation-hub-auth', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('Error resetting:', error);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
