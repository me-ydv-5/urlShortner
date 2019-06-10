var router = require('express').Router();
var client = require('./db').initDB;
var client = require('./db').getDB;

router.get('/list', (req, response)=>{
	var query = 'SELECT * from url';
	client.query(query)
  		.then(res => {
  			response.json(res.rows)
  		})
  		.catch(e => console.error(e.stack));
});

router.post('/generate-short-url', (req, res) => {
	var url = req.body.url;

	var hash = crypto.createHash('md5').update(url).digest('hex');
	hash = hash.substring(0, 6);

	var qry = 'INSERT INTO url VALUES ($1, $2, 0) ON CONFLICT (shorturl) DO NOTHING;';
	var values = [hash, url];

	client.query(qry, values)
		.then((response) => {
			res.json({'short-url': hash})
		})
		.catch(e => console.error(e.stack));
});

router.get('/:shorturl', (req,res) => {
	var shorturl = req.params['shorturl'];
	var query = 'SELECT longurl FROM url where shorturl=$1;';
	var values = [shorturl];

	client.query(query, values)
		.then(response => {
			if(response.rowCount == 1){
				var longurl = response.rows[0]['longurl'];
				console.log("longurl " + longurl);
				if(longurl.substring(0, 4) != "http")
					longurl = "http://" + longurl;
				res.redirect(longurl);

				var counterQuery = 'UPDATE url SET hitrate=hitrate+1 '
								 + 'where shorturl = $1;';
				var values = [shorturl];
				client.query(counterQuery, values, (err, res) => {
				  	if (err) {
				    	console.log(err.stack);
				  	} else {
				  		console.log("Updated the hitrate");
				  	}
				});
			}else{
				res.sendStatus(404);
			}
		})
		.catch(e => console.error(e.stack));
})

router.delete('/:shorturl', (req, res) => {
	var shorturl = req.params['shorturl'];

	var query = 'DELETE FROM url WHERE shorturl=$1;';
	var values = [shorturl];

	client.query(query, values)
		.then(response => {
			if(response.rowCount == 0){
				res.sendStatus(404);
			}else{
				res.send('Deleted!');
			}
		})
		.catch(e => console.error(e.stack));
})