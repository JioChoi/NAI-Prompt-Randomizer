const express = require('express');
const cors = require('cors');
const request = require('request');

const app = express();

let que = [];
let lastQueTime = 0;

let generating = 0;
let MAX_GENERATING = 15;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({
    limit:"100mb",
    extended: false
}));

app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
		credentials: true,
		optionsSuccessStatus: 200,
	}),
);

app.post('/generate-image', function (req, res, next) {
	que.push({ json: req.body, authorization: req.headers.authorization, res: res, prompt: req.body.input });
});

app.get('/', function(req, res) {
	res.send('Imagine Server running on port 7860');
});

setInterval(function () {
	if (que.length == 0) {
		return;
	}

	if (new Date().getTime() - lastQueTime < 1000) {
		return;
	}

	if(generating >= MAX_GENERATING) {
		return;
	}

	lastQueTime = new Date().getTime();

	let data = que.shift();
	generating++;

	request(
		'https://image.novelai.net/ai/generate-image',
		{
			method: 'POST',
			json: data.json,
			headers: {
				Authorization: data.authorization,
				'Content-Type': 'application/json',
			},
		},
		function (error, response, body) {
			generating--;
		},
	).pipe(data.res);
}, 100);

app.listen(7860, function () {
	console.log('Server running on port 7860');
});