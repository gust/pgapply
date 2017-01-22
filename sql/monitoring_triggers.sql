create schema deploy;

create table deploy.monitoring (
    file    varchar NOT NULL,
    type    varchar NOT NULL,
    schema  varchar,
    name    varchar NOT NULL,
    op      varchar NOT NULL
);

-- see https://www.postgresql.org/docs/9.3/static/event-trigger-definition.html

CREATE OR REPLACE FUNCTION deploy.monitor_start() RETURNS EVENT_TRIGGER LANGUAGE PLPGSQL AS $$
DECLARE
BEGIN
    -- TG_EVENT = 'ddl_command_start'
    CASE split_part(TG_TAG, ' ', 2)
        WHEN 'FUNCTION' THEN
            DROP TABLE IF EXISTS funcs;
            CREATE TEMP TABLE funcs AS
                SELECT * FROM pg_catalog.pg_proc;
        WHEN 'VIEW' THEN
            DROP TABLE IF EXISTS views;
            CREATE TEMP TABLE views AS
                SELECT * FROM pg_catalog.pg_views;
        ELSE
    END CASE;
END $$;
CREATE EVENT TRIGGER ddl_monitor_start
    ON ddl_command_start
    EXECUTE PROCEDURE deploy.monitor_start();

CREATE OR REPLACE FUNCTION deploy.monitor_end() RETURNS EVENT_TRIGGER LANGUAGE PLPGSQL AS $$
DECLARE
    filename varchar;
    type varchar;
    name varchar;
    schema varchar;
BEGIN
    -- TG_EVENT = 'ddl_command_end'
    CASE split_part(TG_TAG, ' ', 2)
        WHEN 'FUNCTION' THEN
            type = 'function';
            SELECT a.proname, pgn.nspname INTO name, schema
                FROM (TABLE pg_catalog.pg_proc EXCEPT TABLE funcs) a
                LEFT JOIN pg_catalog.pg_namespace pgn ON (a.pronamespace = pgn.oid)
                LIMIT 1;
            DROP TABLE funcs;
        WHEN 'VIEW' THEN
            type = 'view';
            SELECT a.viewname, a.schemaname INTO name, schema
                FROM (TABLE pg_catalog.pg_views EXCEPT TABLE views) a
                LIMIT 1;
            DROP TABLE views;
        ELSE
            type = 'not sure';
            name  = 'not sure';
            schema = 'not sure';
    END CASE;
    SELECT setting INTO filename FROM pg_catalog.pg_settings pgs WHERE pgs.name = 'application_name';
    INSERT into deploy.monitoring (file, type, schema, name, op) VALUES
        (filename, type, schema, name, TG_TAG);
END $$;
CREATE EVENT TRIGGER ddl_monitor_end
    ON ddl_command_end
    EXECUTE PROCEDURE deploy.monitor_end();
