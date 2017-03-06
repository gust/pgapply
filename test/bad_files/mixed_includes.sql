\i test/db/functions.sql

SELECT relname, relnamespace
FROM pg_catalog.pg_class
WHERE relname = 'pg_class';
