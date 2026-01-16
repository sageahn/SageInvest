// KIS Configuration API Routes
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { tokenRepository } from '@/lib/kis/token-repository';

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

    if (appKey.length !== 36) {
      return NextResponse.json({ error: 'AppKey must be 36 characters' }, { status: 400 });
    }

    if (appSecret.length !== 180) {
      return NextResponse.json({ error: 'AppSecret must be 180 characters' }, { status: 400 });
    }

    await configRepository.saveConfig(appKey, appSecret, environment);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const config = await configRepository.getConfig();

    if (!config) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await configRepository.deleteConfig();
    await tokenRepository.deleteToken('production');
    await tokenRepository.deleteToken('mock');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 });
  }
}
