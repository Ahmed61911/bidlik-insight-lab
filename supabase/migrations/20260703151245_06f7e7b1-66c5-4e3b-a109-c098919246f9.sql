CREATE OR REPLACE FUNCTION public.buyer_cancel_caution(p_id uuid)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.payments;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v FROM public.payments WHERE id = p_id FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF v.user_id <> auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF v.type <> 'caution' THEN RAISE EXCEPTION 'Ce paiement n''est pas une caution'; END IF;
  IF v.status <> 'en_attente' THEN RAISE EXCEPTION 'Seules les cautions en attente peuvent être annulées'; END IF;
  DELETE FROM public.payments WHERE id = p_id;
  RETURN v;
END $$;

GRANT EXECUTE ON FUNCTION public.buyer_cancel_caution(uuid) TO authenticated;