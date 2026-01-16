// KIS Status API Route
import { NextResponse } from 'next/server';
import { tokenRepository } from '@/lib/kis/token-repository';
import { configRepository } from '@/lib/kis/config-repository';

export async function GET() {
  try {
    const config = await configRepository.getConfig();

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    const token = await tokenRepository.getToken(config.environment);

    if (!token) {
      return NextResponse.json({ configured: true, token: null });
    }

    return NextResponse.json({
      configured: true,
      token: {
        ...token,
        environment: config.environment,
      },
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
