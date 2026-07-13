-- APPLIED 2026-07-13 via Supabase Management API.
-- Server-side length caps — client-side maxLength is UX only and can be
-- bypassed by any direct API call, so the real enforcement has to live here.

alter table public.contact_messages
  add constraint contact_messages_name_len    check (char_length(name) <= 100),
  add constraint contact_messages_subject_len check (subject is null or char_length(subject) <= 150),
  add constraint contact_messages_message_len check (char_length(message) <= 5000);

alter table public.event_posts
  add constraint event_posts_caption_len check (caption is null or char_length(caption) <= 200);

alter table public.events
  add constraint events_title_len       check (char_length(title) <= 150),
  add constraint events_description_len check (description is null or char_length(description) <= 5000),
  add constraint events_venue_len       check (venue is null or char_length(venue) <= 200),
  add constraint events_city_len        check (city is null or char_length(city) <= 100);

alter table public.ticket_types
  add constraint ticket_types_name_len  check (char_length(name) <= 100),
  add constraint ticket_types_price_nonneg check (price_cfa >= 0),
  add constraint ticket_types_qty_nonneg   check (quantity_total >= 0);

alter table public.ticket_listings
  add constraint ticket_listings_ask_price_nonneg check (ask_price_cfa >= 0);
