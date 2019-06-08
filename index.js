const express = require('express')
const app = express()
const port = 3000
const Bottleneck = require('bottleneck')
const crypto = require('crypto')
const bodyParser = require('body-parser')

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

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + 'public/index.html'))
})


app.get('/list', (req, response)=>{
	var query = 'SELECT * from url'
	client.query(query)
  		.then(res => {
  			response.josn(res.rows)
  		})
  		.catch(e => console.error(e.stack))
})

app.post('/generate-short-url', (req, res) => {
	var url = req.body.url
	var hash = crypto.createHash('md5').update(url).digest('hex');
	hash = hash.substring(0, 6)

	var qry = 'SELECT longurl FROM url where shorturl=$1;'
	var val = [hash]
	client.query(qry, val)
		.then(response => {
			if(response.rowCount == 0){
				var query = 'INSERT INTO url VALUES ($1, $2, 1);'
				var values = [hash, url]
				client.query(query, values)
					.then(() => {
						res.json({'short-url': hash})
					})
					.catch(e => console.error(e.stack))
			}else{
				res.json({'short-url': hash})
			}
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
				res.redirect(longurl)

				var counterQuery = 'UPDATE url SET hitrate=hitrate+1 '
								 + 'where shorturl = $1;'
				var values = [shorturl]
				client.query(counterQuery, values, (err, res) => {
				  	if (err) {
				    	console.log(err.stack)
				  	} else {
				    	console.log(res.rows[0])
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

	var query = 'DELETE FROM url where shorturl=$1;'
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