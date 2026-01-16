// KIS Token Refresh API Route
import { NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { KISApiClient } from '@/lib/kis/api-client';
import { tokenRepository } from '@/lib/kis/token-repository';

export async function POST() {
  try {
    const config = await configRepository.getConfig();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Issue new token
    const apiClient = new KISApiClient(config.environment);
    const token = await apiClient.issueToken(config.app_key, config.app_secret);

    // Save token
    await tokenRepository.saveToken(token, config.environment);

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Token refresh failed:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
