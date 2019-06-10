const assert = require("assert");
const { Pool, Client } = require('pg')
const pool = new Pool({
	host:'localhost',
	port:'5432',
	database:'urlshortner'
})

const client = new Client({
	// connectionString: process.env.DATABASE_URL,
	host:'localhost',
	port:'5432',
	database:'urlshortner'
})

client.connect()

let _db;

function initDb(callback) {
    if (_db) {
        console.warn("Trying to initialize DB again!");
        return callback(null, _db);
    }
	client.connect((err) => {
		if(err){
			throw err
		}else{
			console.log("Connected with the DB!")
			connected()
		}
	});

function connected(err, db) {
        if (err) {
            return callback(err);
        }
        console.log("DB initialized!");
        _db = db;
        return callback(null, _db);
    }
}

function getDb() {
    assert.ok(_db, "DB has not been initialized. Please called initDB first.");
    return _db;
}

module.exports = {
    getDb,
    initDb
};

