const express = require('express');
const cors = require('cors');
const request = require('request');

const app = express();

let que = [];
let lastQueTime = 0;

let generating = 0;
let MAX_GENERATING = 10;

let disabled = false;
let delay = 0;

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

app.get('/disabled', function (req, res) {
	res.send({ disabled: disabled, delay: delay });
});

setInterval(function () {
	if (que.length == 0) {
		return;
	}

	if (new Date().getTime() - lastQueTime < 2000) {
		return;
	}

	if (disabled) {
		for (let i = 0; i < que.length; i++) {
			que[i].res.send("Server stopped generating images due to high load. Please try again later.");
		}
		que = [];

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
			if (response.statusCode == 429 && response.body != "Concurrent generation is locked") {
				if (delay == 0) {
					delay = 5;
					disabled = true;
				}
				else {
					delay *= 2;
					disabled = true;
				}

				setTimeout(function () {
					disabled = false;
				}, delay * 1000);

				for (let i = 0; i < que.length; i++) {
					que[i].res.send("Server stopped generating images due to high load. Please try again later.");
				}
				que = [];
			}
			
			if (response.statusCode == 200) {
				delay = 0;
			}
		},
	).pipe(data.res);
}, 100);

app.listen(7860, function () {
	console.log('Server running on port 7860');
});
