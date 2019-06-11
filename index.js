const express = require('express');
const app = express();
const port = 3000;
const crypto = require('crypto');
const bodyParser = require('body-parser');
const Ddos = require('ddos');
const path = require("path");
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
	windowMs: 1000,
	max: 20 // A max of 20 requests per second
  });

const { Pool, Client } = require('pg');

// Create a client pool for Node-postgres connection.
// A max of 20 clients could concurrently query the DB.
// See more at https://node-postgres.com/features/pooling
const pool = new Pool({max: 20});


app.listen(port, () => console.log(`Listening on port ${port}!`));

/*--------------------------------------------------------------------------*/
app.use( bodyParser.json() );
app.use(express.static('public'));
app.use(limiter);

// It will start denying requests from a given IP if there are more than
// 4 requests per second. If there aren't any more, it will reset the counter (of 
// requests made) to 0. If the client exceeds, the time to reset counter doubles. 
// See more at: 
// https://www.npmjs.com/package/ddos#how-does-this-ddos-prevention-module-work
var ddos = new Ddos({limit: 20, burst:4});
app.use(ddos.express);

// Homepage
app.get('/', (req, res, next) => {
	res.sendFile(path.join(__dirname + 'public/index.html'));
});

// Retrieves all the records from the database
app.get('/list', (req, response)=>{
	var query = 'SELECT * from url';
	
	// pool.connect returns a client from the pool
	// and then we query using that client.
	// Once done, the client is freed so that we can use it
	// for some another query.
	pool.connect()
		.then(client => {
			return client.query(query)
			.then(res => {
				response.json(res.rows);
				client.release();
			})
			.catch(e => {
				client.release();
				console.error(e.stack);
			})
		})
		.catch(error => console.log(error));
});

// Generates the shortened URL by calculating the MD5 hash of the longURL
// and taking the first 6 characters of the hash.
app.post('/generate-short-url', (req, res, next) => {
	var url = req.body.url;

	var hash = crypto.createHash('md5').update(url).digest('hex');
	hash = hash.substring(0, 6);

	var qry = 'INSERT INTO url VALUES ($1, $2, 0) ON CONFLICT (shorturl) DO NOTHING;';
	var values = [hash, url];

	pool.connect()
		.then(client => {
			return client.query(qry, values)
			.then((response) => {
				res.json({'short-url': hash});
				client.release();
			})
			.catch(e => {
				client.release();
				console.error(e.stack)
			});	
		})
		.catch(error => console.log(error));
});

// Gets the the longURL for a particular hash, if exists and redirects.
// If no hash is present, returns 404 with error page.
app.get('/:shorturl', (req,res, next) => {
	var shorturl = req.params['shorturl'];
	var query = 'SELECT longurl FROM url where shorturl=$1;';
	var values = [shorturl];

	pool.connect()
	.then(client => {
		client.query(query, values)
			.then(response => {
				if(response.rowCount == 1){
					var longurl = response.rows[0]['longurl'];

					// Add http:// protocol prefix is there isn't one
					// This is so as not to let the browser think it is
					// one of the suburls.
					if(longurl.substring(0, 4) != "http")
						longurl = "http://" + longurl;
					res.redirect(longurl);

					// Update the hitrate for the link if it has been found.
					var counterQuery = 'UPDATE url SET hitrate=hitrate+1 '
									+ 'where shorturl = $1;';
					var values = [shorturl];

					pool.connect()
						.then(client => {
							return client.query(counterQuery, values, (err, res) => {
								if (err) {
									console.log(err.stack);
								} else {
									console.log("Updated the hitrate");
								}

								client.release();
							});
						})
				}else{
					// Error handler.
					next("There's nothing here!");
				}
			})
			.catch(e => {
				console.error(e.stack)
			});
	})
});

// Delete a given shortURL, if exists.
app.delete('/:shorturl', (req, res, next) => {
	var shorturl = req.params['shorturl'];
	var values = [shorturl];

	var query = 'DELETE FROM url WHERE shorturl=$1;';
	var values = [shorturl];

	pool.connect()
		.then(client => {
			return client.query(query, values)
			.then(response => {
				if(response.rowCount == 0){
					res.sendStatus(404);
				}else{
					res.send('Deleted!');
				}
				client.release();
			})
			.catch(e => {
				client.release();
				console.error(e.stack)
			});
		})
});

// Default error handler.
app.use(function(err, req, res, next){
	res.status(404);

	// respond with html page
	if (req.accepts('html')) {
		res.sendFile(path.join(__dirname + '/error.html'));
	  	return;
	}

	// respond with json
	if (req.accepts('json')) {
	  res.send({ error: err });
	  return;
	}

	// default to plain-text. send()
	res.type('txt').send(err);
  });