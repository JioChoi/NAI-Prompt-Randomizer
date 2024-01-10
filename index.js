var express = require('express');
var cors = require('cors');
var request = require('request');
var bodyParser = require('body-parser');

var app = express();
var jsonParser = bodyParser.json()

app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
	credentials: true,
	optionsSuccessStatus: 200
}));

app.post('/api/*', jsonParser, function(req, res, next) {
	request.post('https://api.novelai.net' + req.url.substring(4), {
		json: req.body
	}).pipe(res);
});

app.get('/api/*', function(req, res, next) {
	console.log(req.url.substring(4));
	request('https://api.novelai.net' + req.url.substring(4)).pipe(res);
});

app.use('/js', express.static(__dirname + '/js'));
app.use('/node_modules/argon2-browser/dist', express.static(__dirname + '/node_modules/argon2-browser/dist'));

app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

app.listen(3000, function() {
	console.log('Example app listening on port 3000!');
});


// app.use('/api', createProxyMiddleware({
// 	target: 'https://api.novelai.net',
// 	changeOrigin: true,
// 	pathRewrite: {
// 		'^/api': ''
// 	},
// 	//followRedirects: false,
// 	secure: true,
// }));
// //module.exports = app;