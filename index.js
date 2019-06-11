const express = require('express')
const app = express()
const port = 3000
const Bottleneck = require('bottleneck')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const Ddos = require('ddos')
// A max of 20 requests running at a time.
// Wait at least 1000ms between each request.
const limiter = new Bottleneck({
 maxConcurrent: 20,
 minTime: 1000
});

const { Pool, Client } = require('pg')

const pool = new Pool({
	user:'sahil',
	host:'localhost',
	port:'5432',
	database:'urlshortner',
	password:'sahil'
})

const client = new Client({
	user:'sahil',
	host:'localhost',
	port:'5432',
	database:'urlshortner',
	password:'sahil'
})

app.listen(port, () => console.log(`Listening on port ${port}!`))
client.connect()

/*--------------------------------------------------------------------------*/
app.use( bodyParser.json() );
app.use(express.static('public'))

var ddos = new Ddos({limit: 4, burst:4});
app.use(ddos.express)

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + 'public/index.html'))
})


app.get('/list', (req, response)=>{
	var query = 'SELECT * from url'
	client.query(query)
  		.then(res => {
  			response.json(res.rows)
  		})
  		.catch(e => console.error(e.stack))
})

app.post('/generate-short-url', (req, res) => {
	var url = req.body.url

	var hash = crypto.createHash('md5').update(url).digest('hex');
	hash = hash.substring(0, 6)

	var qry = 'INSERT INTO url VALUES ($1, $2, 0) ON CONFLICT (shorturl) DO NOTHING;'
	var values = [hash, url]

	client.query(qry, values)
		.then((response) => {
			res.json({'short-url': hash})
		})
		.catch(e => console.error(e.stack))
})

app.get('/:shorturl', (req,res) => {
	var shorturl = req.params['shorturl']
	
	// var ip = req.connection.remoteAddress
	// console.log(ip)

	var query = 'SELECT longurl FROM url where shorturl=$1;'
	var values = [shorturl]

	client.query(query, values)
		.then(response => {
			if(response.rowCount == 1){
				var longurl = response.rows[0]['longurl']

				if(longurl.substring(0, 4) != "http")
					longurl = "http://" + longurl
				res.redirect(longurl)

				var counterQuery = 'UPDATE url SET hitrate=hitrate+1 '
								 + 'where shorturl = $1;'
				var values = [shorturl]
				client.query(counterQuery, values, (err, res) => {
				  	if (err) {
				    	console.log(err.stack)
				  	} else {
				  		console.log("Updated the hitrate")
				  	}
				})
			}else{
				res.sendStatus(404)
			}
		})
		.catch(e => console.error(e.stack))
})

app.delete('/:shorturl', (req, res) => {
	var shorturl = req.params['shorturl']
	var values = [shorturl]

	var query = 'DELETE FROM url WHERE shorturl=$1;'
	var values = [shorturl]

	client.query(query, values)
		.then(response => {
			if(response.rowCount == 0){
				res.sendStatus(404)
			}else{
				res.send('Deleted!')
			}
		})
		.catch(e => console.error(e.stack))
})