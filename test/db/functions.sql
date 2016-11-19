CREATE OR REPLACE FUNCTION hello_world() returns varchar LANGUAGE plpgsql AS $$
BEGIN
    return 'hello, world!';
END $$;

CREATE OR REPLACE FUNCTION the_answer() returns int LANGUAGE plpgsql AS $$
BEGIN
    return 42;
END $$;
