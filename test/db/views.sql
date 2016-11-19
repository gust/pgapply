CREATE OR REPLACE VIEW self_reference AS
    SELECT relname, relnamespace
    FROM pg_catalog.pg_class
    WHERE relname = 'pg_class';

CREATE OR REPLACE VIEW enabled_features AS
    SELECT feature_id, sub_feature_id, feature_name, sub_feature_name
    FROM information_schema.sql_features
    WHERE is_supported = 'YES';
