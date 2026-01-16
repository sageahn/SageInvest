// KIS Authentication API Route
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { tokenRepository } from '@/lib/kis/token-repository';
import { KISApiClient } from '@/lib/kis/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      appKey: string;
      appSecret: string;
      environment: 'production' | 'mock';
    };
    const { appKey, appSecret, environment } = body;

    if (!appKey || !appSecret || !environment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save configuration
    await configRepository.saveConfig(appKey, appSecret, environment);

    // Issue token
    const apiClient = new KISApiClient(environment);
    const token = await apiClient.issueToken(appKey, appSecret);

    // Save token
    await tokenRepository.saveToken(token, environment);

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    console.error('Authentication failed:', error);

    if (error.response?.status === 401) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
