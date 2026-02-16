const { runMigrations, runSeeds } = require('../config/database');

console.log('Initializing database...');
runMigrations();
runSeeds();
console.log('Database initialized successfully.');
