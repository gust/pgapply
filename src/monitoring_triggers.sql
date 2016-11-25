create schema deploy;

create table deploy.monitoring (
    file    varchar NOT NULL,
    type    varchar NOT NULL,
    schema  varchar,
    name    varchar NOT NULL,
    op      varchar NOT NULL
);

-- see https://www.postgresql.org/docs/9.3/static/event-trigger-definition.html

CREATE OR REPLACE FUNCTION deploy.monitor_proc() RETURNS EVENT_TRIGGER LANGUAGE PLPGSQL AS $$
DECLARE
    filename varchar;
    namespace varchar;
BEGIN
    SELECT setting INTO filename FROM pg_catalog.pg_settings WHERE name = 'application_name';
    INSERT into deploy.monitoring (file, type, schema, name, op) VALUES
        (filename, 'ddl_event', 'not sure', 'not sure', 'not sure');
END $$;
CREATE EVENT TRIGGER monitor_proc
    ON ddl_command_start
    EXECUTE PROCEDURE deploy.monitor_proc();
