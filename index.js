var express = require('express');
var cors = require('cors');

var app = express();

app.use(cors());
app.use('/js', express.static('js'));

app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

module.exports = app;