const express = require('express');
const Ddos = require('ddos');
const crypto = require('crypto');
const Bottleneck = require('bottleneck');
const bodyParser = require('body-parser');
const limiter = new Bottleneck({
 maxConcurrent: 20,			// A max of 20 requests running at a time.
 minTime: 100				// Wait at least 100ms between each request.
});
const port = 3000;

var isProduction = process.env.NODE_ENV === 'production';

const app = express();
require(‘dotenv’).config();


/*--------------------------------------------------------------------------*/
app.use( bodyParser.json() );
app.use(express.static(__dirname + 'public'));
app.use(require('./routes'));

var ddos = new Ddos({limit: 4, burst:4});
app.use(ddos.express);

if (!isProduction) {
  app.use(errorhandler());
}

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
  app.use(function(err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({'errors': {
      message: err.message,
      error: err
    }});
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({'errors': {
    message: err.message,
    error: {}
  }});
});


// Initialize the db and then start the app
initDb(function (err) {
	app.listen( process.env.PORT || 3000, function(err){
		if(err){
			throw err;
		}
  		console.log('Listening on port ' + server.address().port);
	});
);