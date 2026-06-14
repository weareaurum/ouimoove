-- =====================================================================
-- OuiMoove — Database migration
-- Run this in your Supabase SQL editor (supabase.com → project → SQL editor)
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS)
-- =====================================================================

-- 1. Add image_url column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Add paydunya_token to orders (for PayDunya payment flow)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paydunya_token text;

-- 3. Add resale columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_resale boolean DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS resold    boolean DEFAULT false;

-- 4. Create organizer_applications table
CREATE TABLE IF NOT EXISTS organizer_applications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       text        NOT NULL DEFAULT '',
  status       text        NOT NULL DEFAULT 'pending',
  reviewed_by  uuid        REFERENCES auth.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_application"    ON organizer_applications;
DROP POLICY IF EXISTS "users_view_own_application"      ON organizer_applications;
DROP POLICY IF EXISTS "admins_view_all_applications"    ON organizer_applications;
DROP POLICY IF EXISTS "admins_update_applications"      ON organizer_applications;

CREATE POLICY "users_insert_own_application"
  ON organizer_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_view_own_application"
  ON organizer_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins_view_all_applications"
  ON organizer_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admins_update_applications"
  ON organizer_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Ticket resale listings table
CREATE TABLE IF NOT EXISTS ticket_listings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id        uuid        REFERENCES orders(id),
  order_item_id   uuid        NOT NULL,
  event_id        uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id  uuid,
  event_title     text        NOT NULL DEFAULT '',
  event_date      timestamptz,
  event_city      text        DEFAULT '',
  event_emoji     text        DEFAULT '🎟️',
  event_image_url text,
  ticket_name     text        NOT NULL DEFAULT '',
  quantity        int         NOT NULL DEFAULT 1,
  original_price  int         NOT NULL DEFAULT 0,
  ask_price_cfa   int         NOT NULL,
  status          text        NOT NULL DEFAULT 'active',
  buyer_id        uuid        REFERENCES auth.users(id),
  buyer_order_id  uuid        REFERENCES orders(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sold_at         timestamptz
);

ALTER TABLE ticket_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_select" ON ticket_listings;
DROP POLICY IF EXISTS "listings_insert" ON ticket_listings;
DROP POLICY IF EXISTS "listings_update" ON ticket_listings;

CREATE POLICY "listings_select"
  ON ticket_listings FOR SELECT USING (true);

CREATE POLICY "listings_insert"
  ON ticket_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "listings_update"
  ON ticket_listings FOR UPDATE
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR status = 'active');

-- 6. Recreate organizer_attendees view with resale columns
DROP VIEW IF EXISTS organizer_attendees;
CREATE VIEW organizer_attendees AS
SELECT
  o.id                 AS order_id,
  o.user_id            AS attendee_id,
  p.full_name          AS attendee_name,
  p.email              AS attendee_email,
  NULL::text           AS attendee_phone,
  o.payment_method,
  o.payment_status,
  o.created_at         AS purchased_at,
  oi.id                AS item_id,
  oi.event_id,
  e.title              AS event_title,
  tt.name              AS ticket_type_name,
  oi.unit_price_cfa,
  oi.quantity,
  oi.checked_in,
  oi.checked_in_at,
  oi.is_resale,
  oi.resold
FROM orders o
JOIN profiles     p   ON p.id         = o.user_id
JOIN order_items  oi  ON oi.order_id  = o.id
JOIN events       e   ON e.id         = oi.event_id
JOIN ticket_types tt  ON tt.id        = oi.ticket_type_id;
