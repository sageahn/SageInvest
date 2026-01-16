-- KIS Token Storage Table
CREATE TABLE IF NOT EXISTS kis_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_type TEXT NOT NULL,
  expires_in INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production', 'mock')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KIS Configuration Table
CREATE TABLE IF NOT EXISTS kis_configs (
  id SERIAL PRIMARY KEY,
  app_key TEXT NOT NULL UNIQUE,
  app_secret_encrypted TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production', 'mock')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KIS API Logs Table
CREATE TABLE IF NOT EXISTS kis_api_logs (
  id SERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kis_tokens_expires_at ON kis_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_kis_tokens_environment ON kis_tokens(environment);
CREATE INDEX IF NOT EXISTS idx_kis_configs_environment ON kis_configs(environment);
CREATE INDEX IF NOT EXISTS idx_kis_api_logs_request_id ON kis_api_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_kis_api_logs_created_at ON kis_api_logs(created_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_kis_tokens_updated_at BEFORE UPDATE ON kis_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kis_configs_updated_at BEFORE UPDATE ON kis_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
