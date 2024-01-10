var express = require('express');
var cors = require('cors');
var { createProxyMiddleware } = require('http-proxy-middleware');

var app = express();

app.use(cors());

app.use('/api', createProxyMiddleware({
	target: 'https://api.novelai.net',
	changeOrigin: true,
	pathRewrite: {
		'^/api': ''
	},
	followRedirects: false,
}));

app.use('/js', express.static(__dirname + '/js'));
app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

app.listen(3000, function() {
	console.log('Example app listening on port 3000!');
});
//module.exports = app;