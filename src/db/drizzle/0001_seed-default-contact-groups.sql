
INSERT OR IGNORE INTO app_setting (
  key,
  value,
  created_at,
  updated_at
)
SELECT
  'seed.default_contact_groups.v2',
  '{"shouldSeed":true,"version":2}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE NOT EXISTS (
  SELECT 1 FROM contact_group
  WHERE user_id = 'local'
  AND deleted_at IS NULL
)
OR EXISTS (
  SELECT 1 FROM contact_group
  WHERE id IN (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  )
);
--> statement-breakpoint


-- =========================================================
-- Friends group
-- =========================================================

INSERT OR IGNORE INTO contact_group (
  id,
  user_id,
  name,
  normalized_name,
  color,
  icon,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'local',
  'Friends',
  'friends',
  '#EE6A5E',
  'people-outline',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL
WHERE EXISTS (
  SELECT 1 FROM app_setting
  WHERE key = 'seed.default_contact_groups.v2'
);
--> statement-breakpoint


-- =========================================================
-- Family group
-- =========================================================

INSERT OR IGNORE INTO contact_group (
  id,
  user_id,
  name,
  normalized_name,
  color,
  icon,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  '22222222-2222-4222-8222-222222222222',
  'local',
  'Family',
  'family',
  '#7DA56D',
  'home-outline',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL
WHERE EXISTS (
  SELECT 1 FROM app_setting
  WHERE key = 'seed.default_contact_groups.v2'
);
--> statement-breakpoint


-- =========================================================
-- Dating group
-- =========================================================

INSERT OR IGNORE INTO contact_group (
  id,
  user_id,
  name,
  normalized_name,
  color,
  icon,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  '33333333-3333-4333-8333-333333333333',
  'local',
  'Dating',
  'dating',
  '#D96BA8',
  'heart-outline',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL
WHERE EXISTS (
  SELECT 1 FROM app_setting
  WHERE key = 'seed.default_contact_groups.v2'
);
--> statement-breakpoint


-- =========================================================
-- Work group
-- =========================================================

INSERT OR IGNORE INTO contact_group (
  id,
  user_id,
  name,
  normalized_name,
  color,
  icon,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  '44444444-4444-4444-8444-444444444444',
  'local',
  'Work',
  'work',
  '#4D82D8',
  'briefcase-outline',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL
WHERE EXISTS (
  SELECT 1 FROM app_setting
  WHERE key = 'seed.default_contact_groups.v2'
);
--> statement-breakpoint


-- =========================================================
-- Clients group
-- =========================================================

INSERT OR IGNORE INTO contact_group (
  id,
  user_id,
  name,
  normalized_name,
  color,
  icon,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  '55555555-5555-4555-8555-555555555555',
  'local',
  'Clients',
  'clients',
  '#8A6BD8',
  'person-circle-outline',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL
WHERE EXISTS (
  SELECT 1 FROM app_setting
  WHERE key = 'seed.default_contact_groups.v2'
);
--> statement-breakpoint


-- =========================================================
-- Friends profile layout
-- =========================================================

INSERT OR IGNORE INTO app_setting (
  key,
  value,
  created_at,
  updated_at
)
SELECT
  'contact_profile_layout.group.11111111-1111-4111-8111-111111111111',
  '{"version":1,"scope":"group","scopeId":"11111111-1111-4111-8111-111111111111","items":[{"key":"ask_next_time","visible":true,"order":0,"variant":"default"},{"key":"memory_hub","visible":true,"order":1,"variant":"default"},{"key":"photo_albums","visible":true,"order":2,"variant":"default"},{"key":"relationship_health","visible":true,"order":3,"variant":"default"},{"key":"about","visible":true,"order":4,"variant":"default"},{"key":"events","visible":true,"order":5,"variant":"default"},{"key":"recent_history","visible":true,"order":6,"variant":"default"},{"key":"life_circle","visible":false,"order":7,"variant":"default"},{"key":"custom_info","visible":false,"order":8,"variant":"default"},{"key":"primary_actions","visible":true,"order":9,"variant":"default"}],"updatedAt":"seed-v2"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE EXISTS (
  SELECT 1 FROM contact_group
  WHERE id = '11111111-1111-4111-8111-111111111111'
);
--> statement-breakpoint


-- =========================================================
-- Family profile layout
-- =========================================================

INSERT OR IGNORE INTO app_setting (
  key,
  value,
  created_at,
  updated_at
)
SELECT
  'contact_profile_layout.group.22222222-2222-4222-8222-222222222222',
  '{"version":1,"scope":"group","scopeId":"22222222-2222-4222-8222-222222222222","items":[{"key":"events","visible":true,"order":0,"variant":"default"},{"key":"photo_albums","visible":true,"order":1,"variant":"default"},{"key":"life_circle","visible":true,"order":2,"variant":"default"},{"key":"relationship_health","visible":true,"order":3,"variant":"default"},{"key":"memory_hub","visible":true,"order":4,"variant":"default"},{"key":"ask_next_time","visible":true,"order":5,"variant":"default"},{"key":"about","visible":true,"order":6,"variant":"default"},{"key":"recent_history","visible":false,"order":7,"variant":"default"},{"key":"custom_info","visible":false,"order":8,"variant":"default"},{"key":"primary_actions","visible":true,"order":9,"variant":"default"}],"updatedAt":"seed-v2"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE EXISTS (
  SELECT 1 FROM contact_group
  WHERE id = '22222222-2222-4222-8222-222222222222'
);
--> statement-breakpoint


-- =========================================================
-- Dating profile layout
-- =========================================================

INSERT OR IGNORE INTO app_setting (
  key,
  value,
  created_at,
  updated_at
)
SELECT
  'contact_profile_layout.group.33333333-3333-4333-8333-333333333333',
  '{"version":1,"scope":"group","scopeId":"33333333-3333-4333-8333-333333333333","items":[{"key":"ask_next_time","visible":true,"order":0,"variant":"default"},{"key":"memory_hub","visible":true,"order":1,"variant":"default"},{"key":"recent_history","visible":true,"order":2,"variant":"default"},{"key":"relationship_health","visible":true,"order":3,"variant":"default"},{"key":"about","visible":true,"order":4,"variant":"default"},{"key":"events","visible":true,"order":5,"variant":"default"},{"key":"photo_albums","visible":true,"order":6,"variant":"default"},{"key":"custom_info","visible":false,"order":7,"variant":"default"},{"key":"life_circle","visible":false,"order":8,"variant":"default"},{"key":"primary_actions","visible":true,"order":9,"variant":"default"}],"updatedAt":"seed-v2"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE EXISTS (
  SELECT 1 FROM contact_group
  WHERE id = '33333333-3333-4333-8333-333333333333'
);
--> statement-breakpoint


-- =========================================================
-- Work profile layout
-- =========================================================

INSERT OR IGNORE INTO app_setting (
  key,
  value,
  created_at,
  updated_at
)
SELECT
  'contact_profile_layout.group.44444444-4444-4444-8444-444444444444',
  '{"version":1,"scope":"group","scopeId":"44444444-4444-4444-8444-444444444444","items":[{"key":"about","visible":true,"order":0,"variant":"default"},{"key":"recent_history","visible":true,"order":1,"variant":"default"},{"key":"custom_info","visible":true,"order":2,"variant":"default"},{"key":"events","visible":true,"order":3,"variant":"default"},{"key":"ask_next_time","visible":true,"order":4,"variant":"default"},{"key":"memory_hub","visible":true,"order":5,"variant":"default"},{"key":"relationship_health","visible":false,"order":6,"variant":"default"},{"key":"photo_albums","visible":false,"order":7,"variant":"default"},{"key":"life_circle","visible":false,"order":8,"variant":"default"},{"key":"primary_actions","visible":true,"order":9,"variant":"default"}],"updatedAt":"seed-v2"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE EXISTS (
  SELECT 1 FROM contact_group
  WHERE id = '44444444-4444-4444-8444-444444444444'
);
--> statement-breakpoint


-- =========================================================
-- Clients profile layout
-- =========================================================

INSERT OR IGNORE INTO app_setting (
  key,
  value,
  created_at,
  updated_at
)
SELECT
  'contact_profile_layout.group.55555555-5555-4555-8555-555555555555',
  '{"version":1,"scope":"group","scopeId":"55555555-5555-4555-8555-555555555555","items":[{"key":"about","visible":true,"order":0,"variant":"default"},{"key":"recent_history","visible":true,"order":1,"variant":"default"},{"key":"events","visible":true,"order":2,"variant":"default"},{"key":"custom_info","visible":true,"order":3,"variant":"default"},{"key":"ask_next_time","visible":true,"order":4,"variant":"default"},{"key":"memory_hub","visible":true,"order":5,"variant":"default"},{"key":"relationship_health","visible":false,"order":6,"variant":"default"},{"key":"photo_albums","visible":false,"order":7,"variant":"default"},{"key":"life_circle","visible":false,"order":8,"variant":"default"},{"key":"primary_actions","visible":true,"order":9,"variant":"default"}],"updatedAt":"seed-v2"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE EXISTS (
  SELECT 1 FROM contact_group
  WHERE id = '55555555-5555-4555-8555-555555555555'
);
