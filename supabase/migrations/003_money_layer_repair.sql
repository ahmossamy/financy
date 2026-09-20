-- Financy Money Layer repair
-- Adds missing business constraints and atomic transfer RPCs.
-- Apply this migration after the already-applied core migrations. Do not rerun 002.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivables_received_leq_due_repair_check'
  ) THEN
    ALTER TABLE public.receivables
      ADD CONSTRAINT receivables_received_leq_due_repair_check
      CHECK (amount_received <= amount_due);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'liabilities_outstanding_leq_principal_repair_check'
  ) THEN
    ALTER TABLE public.liabilities
      ADD CONSTRAINT liabilities_outstanding_leq_principal_repair_check
      CHECK (outstanding_amount <= principal_amount);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loans_outstanding_leq_principal_repair_check'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_outstanding_leq_principal_repair_check
      CHECK (outstanding_amount <= principal_amount);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installments_paid_leq_amount_repair_check'
  ) THEN
    ALTER TABLE public.installments
      ADD CONSTRAINT installments_paid_leq_amount_repair_check
      CHECK (paid_amount <= amount);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_current_leq_target_repair_check'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_current_leq_target_repair_check
      CHECK (current_amount <= target_amount);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.financy_set_transaction_tag_from_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tag_name text;
  v_tag_id uuid;
BEGIN
  DELETE FROM public.transaction_tags
  WHERE transaction_id = NEW.id;

  v_tag_name := trim((regexp_match(coalesce(NEW.notes, ''), '\[Tag: ([^]]+)\]'))[1]);

  IF v_tag_name IS NULL OR v_tag_name = '' THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_tag_id
  FROM public.tags
  WHERE user_id = NEW.user_id
    AND lower(name) = lower(v_tag_name)
  LIMIT 1;

  IF v_tag_id IS NULL THEN
    INSERT INTO public.tags (user_id, name)
    VALUES (NEW.user_id, v_tag_name)
    RETURNING id INTO v_tag_id;
  END IF;

  INSERT INTO public.transaction_tags (transaction_id, tag_id)
  VALUES (NEW.id, v_tag_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_sync_tag_from_notes ON public.transactions;

CREATE TRIGGER transactions_sync_tag_from_notes
AFTER INSERT OR UPDATE OF notes ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.financy_set_transaction_tag_from_notes();

REVOKE EXECUTE ON FUNCTION public.financy_set_transaction_tag_from_notes() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.financy_create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_received_amount numeric,
  p_exchange_rate numeric,
  p_fee numeric DEFAULT 0,
  p_transfer_date date DEFAULT current_date,
  p_notes text DEFAULT NULL,
  p_tag text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_transfer_id uuid;
  v_fee_transaction_id uuid;
  v_from_currency text;
  v_to_currency text;
  v_tag_id uuid;
  v_tag_name text := nullif(trim(p_tag), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount to send must be greater than zero';
  END IF;

  IF p_received_amount IS NULL OR p_received_amount <= 0 THEN
    RAISE EXCEPTION 'Amount to receive must be greater than zero';
  END IF;

  IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be greater than zero';
  END IF;

  IF p_fee IS NULL OR p_fee < 0 THEN
    RAISE EXCEPTION 'Transfer fee cannot be negative';
  END IF;

  SELECT currency_code
  INTO v_from_currency
  FROM public.accounts
  WHERE id = p_from_account_id
    AND user_id = v_user_id
    AND status <> 'closed';

  SELECT currency_code
  INTO v_to_currency
  FROM public.accounts
  WHERE id = p_to_account_id
    AND user_id = v_user_id
    AND status <> 'closed';

  IF v_from_currency IS NULL OR v_to_currency IS NULL THEN
    RAISE EXCEPTION 'Invalid source or destination account';
  END IF;

  INSERT INTO public.transfers (
    user_id,
    from_account_id,
    to_account_id,
    amount,
    currency_code,
    exchange_rate,
    received_amount,
    fee,
    transfer_date,
    notes,
    status
  )
  VALUES (
    v_user_id,
    p_from_account_id,
    p_to_account_id,
    p_amount,
    v_from_currency,
    p_exchange_rate,
    p_received_amount,
    p_fee,
    p_transfer_date,
    p_notes,
    'completed'
  )
  RETURNING id INTO v_transfer_id;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount, currency_code, transaction_date,
    description, notes, status, transfer_id
  )
  VALUES (
    v_user_id, p_from_account_id, 'transfer', p_amount, v_from_currency,
    p_transfer_date, 'Transfer', p_notes, 'completed', v_transfer_id
  );

  INSERT INTO public.transactions (
    user_id, account_id, type, amount, currency_code, transaction_date,
    description, notes, status, transfer_id
  )
  VALUES (
    v_user_id, p_to_account_id, 'transfer', p_received_amount, v_to_currency,
    p_transfer_date, 'Transfer', p_notes, 'completed', v_transfer_id
  );

  IF p_fee > 0 THEN
    INSERT INTO public.transactions (
      user_id, account_id, type, amount, currency_code, transaction_date,
      description, notes, status, transfer_id
    )
    VALUES (
      v_user_id, p_from_account_id, 'expense', p_fee, v_from_currency,
      p_transfer_date, 'Transfer Fee', p_notes, 'completed', v_transfer_id
    )
    RETURNING id INTO v_fee_transaction_id;

    UPDATE public.transfers
    SET fee_transaction_id = v_fee_transaction_id
    WHERE id = v_transfer_id;
  END IF;

  IF v_tag_name IS NOT NULL THEN
    SELECT id INTO v_tag_id
    FROM public.tags
    WHERE user_id = v_user_id
      AND lower(name) = lower(v_tag_name)
    LIMIT 1;

    IF v_tag_id IS NULL THEN
      INSERT INTO public.tags (user_id, name)
      VALUES (v_user_id, v_tag_name)
      RETURNING id INTO v_tag_id;
    END IF;

    INSERT INTO public.transaction_tags (transaction_id, tag_id)
    SELECT id, v_tag_id
    FROM public.transactions
    WHERE transfer_id = v_transfer_id
      AND user_id = v_user_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.financy_update_transfer(
  p_transfer_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_received_amount numeric,
  p_exchange_rate numeric,
  p_fee numeric DEFAULT 0,
  p_transfer_date date DEFAULT current_date,
  p_notes text DEFAULT NULL,
  p_tag text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_currency text;
  v_to_currency text;
  v_fee_transaction_id uuid;
  v_tag_id uuid;
  v_tag_name text := nullif(trim(p_tag), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transfers
    WHERE id = p_transfer_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  SELECT currency_code INTO v_from_currency
  FROM public.accounts
  WHERE id = p_from_account_id AND user_id = v_user_id AND status <> 'closed';

  SELECT currency_code INTO v_to_currency
  FROM public.accounts
  WHERE id = p_to_account_id AND user_id = v_user_id AND status <> 'closed';

  IF v_from_currency IS NULL OR v_to_currency IS NULL THEN
    RAISE EXCEPTION 'Invalid source or destination account';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_received_amount IS NULL OR p_received_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amounts must be greater than zero';
  END IF;

  IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be greater than zero';
  END IF;

  IF p_fee IS NULL OR p_fee < 0 THEN
    RAISE EXCEPTION 'Transfer fee cannot be negative';
  END IF;

  DELETE FROM public.transactions
  WHERE transfer_id = p_transfer_id
    AND user_id = v_user_id;

  UPDATE public.transfers
  SET
    from_account_id = p_from_account_id,
    to_account_id = p_to_account_id,
    amount = p_amount,
    currency_code = v_from_currency,
    exchange_rate = p_exchange_rate,
    received_amount = p_received_amount,
    fee = p_fee,
    fee_transaction_id = NULL,
    transfer_date = p_transfer_date,
    notes = p_notes,
    status = 'completed',
    updated_at = now()
  WHERE id = p_transfer_id
    AND user_id = v_user_id;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount, currency_code, transaction_date,
    description, notes, status, transfer_id
  )
  VALUES (
    v_user_id, p_from_account_id, 'transfer', p_amount, v_from_currency,
    p_transfer_date, 'Transfer', p_notes, 'completed', p_transfer_id
  );

  INSERT INTO public.transactions (
    user_id, account_id, type, amount, currency_code, transaction_date,
    description, notes, status, transfer_id
  )
  VALUES (
    v_user_id, p_to_account_id, 'transfer', p_received_amount, v_to_currency,
    p_transfer_date, 'Transfer', p_notes, 'completed', p_transfer_id
  );

  IF p_fee > 0 THEN
    INSERT INTO public.transactions (
      user_id, account_id, type, amount, currency_code, transaction_date,
      description, notes, status, transfer_id
    )
    VALUES (
      v_user_id, p_from_account_id, 'expense', p_fee, v_from_currency,
      p_transfer_date, 'Transfer Fee', p_notes, 'completed', p_transfer_id
    )
    RETURNING id INTO v_fee_transaction_id;

    UPDATE public.transfers
    SET fee_transaction_id = v_fee_transaction_id
    WHERE id = p_transfer_id;
  END IF;

  IF v_tag_name IS NOT NULL THEN
    SELECT id INTO v_tag_id
    FROM public.tags
    WHERE user_id = v_user_id AND lower(name) = lower(v_tag_name)
    LIMIT 1;

    IF v_tag_id IS NULL THEN
      INSERT INTO public.tags (user_id, name)
      VALUES (v_user_id, v_tag_name)
      RETURNING id INTO v_tag_id;
    END IF;

    INSERT INTO public.transaction_tags (transaction_id, tag_id)
    SELECT id, v_tag_id
    FROM public.transactions
    WHERE transfer_id = p_transfer_id
      AND user_id = v_user_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN p_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.financy_delete_transfer(p_transfer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transfers
    WHERE id = p_transfer_id AND user_id = v_user_id
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.transactions
  WHERE transfer_id = p_transfer_id
    AND user_id = v_user_id;

  DELETE FROM public.transfers
  WHERE id = p_transfer_id
    AND user_id = v_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.financy_create_transfer(uuid, uuid, numeric, numeric, numeric, numeric, date, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.financy_update_transfer(uuid, uuid, uuid, numeric, numeric, numeric, numeric, date, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.financy_delete_transfer(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.financy_create_transfer(uuid, uuid, numeric, numeric, numeric, numeric, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.financy_update_transfer(uuid, uuid, uuid, numeric, numeric, numeric, numeric, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.financy_delete_transfer(uuid) TO authenticated;
