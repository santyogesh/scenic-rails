-- Idempotent: safe to run on every deploy via `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS landmarks (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  kind        text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  text        text NOT NULL DEFAULT '',
  img         text,
  url         text,
  source      text NOT NULL,
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landmarks_lat_lng_idx ON landmarks (lat, lng);

CREATE TABLE IF NOT EXISTS routes (
  key         text PRIMARY KEY,
  sources     text NOT NULL,
  total_km    double precision NOT NULL,
  item_count  integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routes_updated_at_idx ON routes (updated_at DESC);

CREATE TABLE IF NOT EXISTS route_landmarks (
  route_key    text NOT NULL REFERENCES routes (key) ON DELETE CASCADE,
  landmark_id  text NOT NULL REFERENCES landmarks (id) ON DELETE CASCADE,
  km           double precision NOT NULL,
  side         text NOT NULL,
  offset_km    double precision NOT NULL,
  crossing     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (route_key, landmark_id)
);

CREATE INDEX IF NOT EXISTS route_landmarks_landmark_idx ON route_landmarks (landmark_id);

CREATE TABLE IF NOT EXISTS nearby_cells (
  cell          text PRIMARY KEY,
  landmark_ids  text[] NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
