var express = require('express');
var cors = require('cors');
var request = require('request');
var bodyParser = require('body-parser');

var app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

app.use('/js', express.static(__dirname + '/js'));
app.use('/node_modules/argon2-browser/dist', express.static(__dirname + '/node_modules/argon2-browser/dist'));
app.use('/node_modules/unzipit/dist', express.static(__dirname + '/node_modules/unzipit/dist'));

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
	credentials: true,
	optionsSuccessStatus: 200
}));

app.post('/api*', function(req, res, next) {
	console.log(req.url);
	console.log(req.headers);
	console.log(req.body);

	request('https://api.novelai.net' + req.url.substring(4), {
		method: 'POST',
		json: req.body,
		headers: {
			'Authorization': req.headers.authorization,
			'Content-Type': 'application/json',
		}

	})
	.on('error', function(err) {
		console.log(err);
	})
	.pipe(res);
});

app.get('/api*', function(req, res, next) {
	console.log(req.url);
	request({
		url: 'https://api.novelai.net' + req.url.substring(4),
		headers: {
			'Authorization': req.headers.authorization
		}
	}).pipe(res);
});

app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

app.listen(3000, function() {
	console.log('Example app listening on port 3000!');
});