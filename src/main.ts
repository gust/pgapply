const pgp = require('pg-promise')();
const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    application_name: 'deploy'
});

function main() {
    switch (process.argv[2]) {
        case 'install':
            console.log('installing');
            return db.query('CREATE SCHEMA deploy;').then(function() {
                console.log('complete');
            }).catch(function(err: Error) {
                console.log(err);
            });
        default:
            console.log('did not recognize:', process.argv[0]);
            console.log('valid actions are:\n' +
            'install: install into a running postgres instance');
            return Promise.resolve();
    }
}

function shutdown() {
    pgp.end();
}

main().catch(function(err: Error) {
    console.error(err);
}).then(function() {
    shutdown();
})
