-- WhatsApp Credits and Automation Schema

CREATE TABLE IF NOT EXISTS whatsapp_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  balance_paise INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gym_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'topup' | 'debit'
  amount_paise INTEGER NOT NULL,
  description TEXT, -- e.g. "Reminder sent · Rahul Sharma"
  member_id UUID REFERENCES members(id),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gym Preferences for WhatsApp
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS whatsapp_reminder_mode TEXT 
  DEFAULT 'manual'; -- 'manual' | 'auto'

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_credits_gym 
  ON whatsapp_credits(gym_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_txns_gym 
  ON whatsapp_credit_transactions(gym_id, created_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Gym owners only)
CREATE POLICY "Gym owners can view their credit balance"
  ON whatsapp_credits FOR SELECT
  USING (gym_id IN (SELECT id FROM gyms WHERE id = gym_id));

CREATE POLICY "Gym owners can view their credit transactions"
  ON whatsapp_credit_transactions FOR SELECT
  USING (gym_id IN (SELECT id FROM gyms WHERE id = gym_id));

-- Atomic credit top-up function
CREATE OR REPLACE FUNCTION add_gym_credits(
  p_gym_id UUID,
  p_amount_paise INTEGER,
  p_order_id TEXT,
  p_payment_id TEXT,
  p_description TEXT
) RETURNS VOID AS $$
BEGIN
  -- Upsert credit balance
  INSERT INTO whatsapp_credits (gym_id, balance_paise)
  VALUES (p_gym_id, p_amount_paise)
  ON CONFLICT (gym_id) DO UPDATE
  SET balance_paise = whatsapp_credits.balance_paise + EXCLUDED.balance_paise,
      updated_at = NOW();

  -- Log transaction
  INSERT INTO whatsapp_credit_transactions (
    gym_id, 
    type, 
    amount_paise, 
    description, 
    razorpay_order_id, 
    razorpay_payment_id
  )
  VALUES (
    p_gym_id, 
    'topup', 
    p_amount_paise, 
    p_description, 
    p_order_id, 
    p_payment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit deduction function
CREATE OR REPLACE FUNCTION deduct_gym_credits(
  p_gym_id UUID,
  p_amount_paise INTEGER,
  p_description TEXT,
  p_member_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Check balance
  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_credits 
    WHERE gym_id = p_gym_id AND balance_paise >= p_amount_paise
  ) THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Update balance
  UPDATE whatsapp_credits 
  SET balance_paise = balance_paise - p_amount_paise,
      updated_at = NOW()
  WHERE gym_id = p_gym_id;

  -- Log transaction
  INSERT INTO whatsapp_credit_transactions (
    gym_id, 
    type, 
    amount_paise, 
    description, 
    member_id
  )
  VALUES (
    p_gym_id, 
    'debit', 
    p_amount_paise, 
    p_description, 
    p_member_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
