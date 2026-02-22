import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="si-main" style={{ minHeight: '100vh', maxWidth: 1200, margin: '0 auto' }}>
      <header className="si-header">
        <h1 className="si-title">SageInvest</h1>
        <p className="si-subtitle">개인 투자 자산 관리 대시보드</p>
      </header>

      <section className="si-grid-4">
        <Link href="/dashboard" className="si-card">
          <h2 className="si-card-title">대시보드</h2>
          <p>포트폴리오 현황과 자산 분석을 확인하세요</p>
        </Link>
        <Link href="/kis/settings" className="si-card">
          <h2 className="si-card-title">KIS 설정</h2>
          <p>한국투자증권 OpenAPI 인증 정보를 설정하세요</p>
        </Link>
        <Link href="/kis/auth" className="si-card">
          <h2 className="si-card-title">KIS 인증</h2>
          <p>KIS API 연결 상태를 확인하고 관리하세요</p>
        </Link>
        <Link href="/kis/portfolio" className="si-card">
          <h2 className="si-card-title">포트폴리오</h2>
          <p>보유 종목과 수익률을 상세히 확인하세요</p>
        </Link>
      </section>

      <section className="si-card" style={{ marginTop: 20 }}>
        <p style={{ margin: 0 }}>
          KIS OpenAPI를 활용한 포트폴리오 추적과 자산 분석 기능을 제공합니다.
        </p>
      </section>
    </main>
  );
}
