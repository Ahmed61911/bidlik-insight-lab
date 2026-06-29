# Custom Postgres image: bakes the bootstrap SQL into the image so we do NOT
# need nested bind mounts (which break on Docker Desktop for Windows).
# Application migrations are applied AFTER Auth boots, by the `migrate` service.
FROM supabase/postgres:15.6.1.139

# Only role / schema / extension bootstrap runs via initdb.d.
# App migrations referencing auth.users must wait for GoTrue, so they live
# in /migrations and are applied by the separate `migrate` container.
COPY init/ /docker-entrypoint-initdb.d/
