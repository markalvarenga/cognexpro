
CREATE TABLE public.cs_credit_card_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  card_last4 TEXT,
  cardholder TEXT,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  installment TEXT,
  category TEXT,
  posted_at DATE NOT NULL,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, external_id)
);
ALTER TABLE public.cs_credit_card_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_stmt_all" ON public.cs_credit_card_statements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cs_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  imported INTEGER DEFAULT 0,
  message TEXT,
  ran_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cs_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_log_all" ON public.cs_sync_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tx_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_cs_stmt_user_date ON public.cs_credit_card_statements(user_id, posted_at DESC);
