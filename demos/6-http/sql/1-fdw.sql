

        CREATE EXTENSION file_fdw;
        CREATE SERVER csv_server FOREIGN DATA WRAPPER file_fdw;

        CREATE FOREIGN TABLE talks (
            id int,
            title text,
            speaker text,
            room text,
            time text
        ) SERVER csv_server
        OPTIONS (filename '/data/talks.csv', format 'csv', header 'true');

        -- Query it like any other table
        SELECT * FROM talks;

        -- Join with local tables
        SELECT t.title, t.speaker, t.room FROM talks t WHERE t.time = '10:00';
