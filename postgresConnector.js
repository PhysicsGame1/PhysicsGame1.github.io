//Need to have the javascript driver pg installed on the server
//It can be installed with a package manager called npm
//install npm and run "npm install pg --save"
//The connection string is the type of database (postgres), the servername (in this case its localhost)
//and the port number (5432, the default for postgres), then the username for the database
//pg = rquire('pg') is including the javascript postgres driver
//the username still needs filled in here:

var pg = require('pg');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/<username>';
var client = new pg.Client(connectionString);
client.connect();

//QUERYING:
// var query =client.query('<SQL query>') followed by:
// query.on('end', function() {client.end();}); to close to query
