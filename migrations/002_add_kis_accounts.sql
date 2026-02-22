-- KIS Account Settings Table
-- SPEC-KIS-002: 계좌번호 설정 관리
CREATE TABLE IF NOT EXISTS kis_account_settings (
  id SERIAL PRIMARY KEY,
  cano_encrypted TEXT NOT NULL,           -- 암호화된 종합계좌번호 (8자리)
  acnt_prdt_cd_encrypted TEXT NOT NULL,   -- 암호화된 계좌상품코드 (2자리)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_kis_account_settings_created_at ON kis_account_settings(created_at DESC);

-- Updated at trigger function (already exists in 001_create_kis_tables.sql)
-- Reuse existing update_updated_at_column function

-- Trigger for updated_at
CREATE TRIGGER update_kis_account_settings_updated_at BEFORE UPDATE ON kis_account_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraint: Only one account setting should exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_kis_account_settings_single ON kis_account_settings((1));
