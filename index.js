var express = require('express');
var { createProxyMiddleware } = require('http-proxy-middleware');
var app = express();

app.use('/js', express.static(__dirname + '/js'));

app.use('/api', createProxyMiddleware({
	target: 'http://api.novelai.net/',
	changeOrigin: true,
	pathRewrite: { '/api': '' },
	selfHandleResponse: true,
	on: {
		proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
			res.removeHeader('content-security-policy');

			return responseBuffer;
		}),
	  },
}));

app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

module.exports = app;