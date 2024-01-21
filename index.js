const express = require('express');
const cors = require('cors');
const request = require('request');
const fs = require('fs');
const os = require('os');
const { randomBytes } = require('crypto');
const { RateLimiterMemory } = require("rate-limiter-flexible");

const https = require('https');
const { resolve } = require('path');

var privateKey;
var certificate;
var ca;
var credentials;

var production = false;

if (fs.existsSync("/etc/letsencrypt/live/prombot.net/privkey.pem")) {
	production = true;
}

if(production) {
	privateKey = fs.readFileSync("/etc/letsencrypt/live/prombot.net/privkey.pem")
	certificate = fs.readFileSync("/etc/letsencrypt/live/prombot.net/cert.pem")
	ca = fs.readFileSync("/etc/letsencrypt/live/prombot.net/chain.pem")
	credentials = { key: privateKey, cert: certificate, ca: ca }
}

var app = express();
var tagDataLength = 0;

const opts = {
	points: 20, // 6 points
	duration: 1, // Per second
};

const rateLimiter = new RateLimiterMemory(opts);

app.use((req, res, next) => {
	rateLimiter.consume(req.ip)
	.then(() => {
		next();
	})
	.catch(() => {
		res.status(429).send('Too Many Requests');
	});
});


app.use(require('express-status-monitor')());

app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

app.use('/js', express.static(__dirname + '/js'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/dataset', express.static(__dirname + '/dataset'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/node_modules/argon2-browser/dist', express.static(__dirname + '/node_modules/argon2-browser/dist'));
app.use('/node_modules/unzipit/dist', express.static(__dirname + '/node_modules/unzipit/dist'));

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
	credentials: true,
	optionsSuccessStatus: 200
}));

function init() {
	tagDataLength = fs.statSync("../tags.csv").size;
}

async function readTagData(start, end) {
	const stream = fs.createReadStream("../tags.csv", {start: start, end: end});
	return new Promise(function(resolve, reject) {
		stream.on('data', function(chunk) {
			resolve(new Uint8Array(chunk.buffer));
		});
	});
}

app.post('/tags', async function (req, res, next) {
	let including = req.body.including;
	let prompt = await findPrompt(including);
	res.send(prompt);
});

async function findPrompt(including) {
	let excluding = [];
	for (var i = 0; i < including.length; i++) {
		if (including[i].startsWith("~")) {
			excluding.push(including[i].substring(1));
			including.splice(i, 1);
			i--;
		}
	}

	including = removeEmptyElements(including);
	excluding = removeEmptyElements(excluding);

	let minScore = -1;

	for (item of including) {
		if (item.substring(0, 6) === 'score>') {
			let score = parseInt(item.substring(6));
			including.splice(including.indexOf(item), 1);
			minScore = score;
		}
	}

	for(var i = 0; i < 10000; i++) {
		let prompt = await getRandomPrompt(including);
		if(prompt == null) {
			return null;
		}

		const data = prompt.split("|");
		const score = data[0];
		const rating = data[1];
		const prom = data[2];

		if (score <= minScore) {
			continue;
		}

		if (including.length == 0 || allInList(including, strToList(prom))) {
			if (excluding.length != 0 && listInList(excluding, strToList(prom))) {
				continue;
			}

			console.log("found " + i);
			return prom;
		}
	}

	console.log("not found");

	return null;
}

function removeEmptyElements(list) {
	for (var i = 0; i < list.length; i++) {
		if (list[i].trim() == "") {
			list.splice(i, 1);
			i--;
		}
	}

	return list;
}

function listInList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i])) {
			return true;
		}
	}

	return false;
}

function allInList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		if (!list2.includes(list1[i])) {
			return false;
		}
	}

	return true;
}

function strToList(str) {
	str = str.trim();
	if(str == "") return [];

	let list = str.split(",");
	for (let i = 0; i < list.length; i++) {
		list[i] = list[i].trim();
	}

	return list;
}

async function getRandomPrompt() {
	let prompt = "";

	let randomIndex = Math.floor(Math.random() * tagDataLength);
	let value = await readTagData(randomIndex, randomIndex);
	value = value[0];

	let startPoint = randomIndex;
	let endPoint = randomIndex;

	// Unlucky indexing
	if(value == 13 || value == 10) {
		return getRandomPrompt();
	}

	// Find start point
	let startValue;
	do {
		startValue = await readTagData(startPoint, startPoint);
		startPoint--;
	} while(startValue != 13 && startValue != 10);
	startPoint += 2;

	let endValue;
	do {
		endValue = await readTagData(endPoint, endPoint);
		endPoint++;
	} while(endValue != 13 && endValue != 10);
	endPoint--;

	// Get prompt
	prompt = new TextDecoder("utf-8").decode(await readTagData(startPoint, endPoint));

	return prompt;
}

app.post('/api*', function(req, res, next) {
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

if(production) {
	https.createServer(credentials, app).listen(80, function() {
		console.log('Listening on port 80!');
		init();
		//loadCSV();
	});
}
else {
	app.listen(80, function() {
		console.log('Listening on port 80! (dev)');
		init();
	});
}