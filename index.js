const express = require('express');
const cors = require('cors');
const request = require('request');
const fs = require('fs');
const os = require('os');
const { randomBytes } = require('crypto');
const { RateLimiterMemory } = require("rate-limiter-flexible");

const https = require('https');
const { resolve } = require('path');

const path = require("path");

var privateKey;
var certificate;
var ca;
var credentials;

var key = [];

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

async function getRandomPrompt(including, excluding) {
	if (including.length == 0) {
		return null;
	}

	for (var i = 0; i < including.length; i++) {
		let index = key.findIndex(function (element) {
			return element[0] == including[i];
		}, including[i]);

		if (index == -1) {
			return null;
		}
	}

	let pos;

	for (i = 0; i < including.length; i++) {
		if (i == 0) {
			pos = new Set(await getPositions(including[i]));
		}
		else {
			temp = new Set(await getPositions(including[i]));
			pos = new Set([...pos].filter(x => temp.has(x)));
		}
	}

	for (i = 0; i < excluding.length; i++) {
		temp = new Set(await getPositions(excluding[i]));
		pos = new Set([...pos].filter(x => !temp.has(x)));
	}

	pos = Array.from(pos);
	pos = pos[Math.floor(Math.random() * pos.length)];

	return await getPromptFromPos(pos);
}

async function getPromptFromPos(pos) {
	let start = pos;
	let end = pos;

	for (end = pos; end < tagDataLength; end++) {
		if (await read("tags.csv", end, end + 1) == 0x0A) {
			break;
		}
	}

	let data = await read("tags.csv", start, end);
	let str = new TextDecoder("utf-8").decode(data);

	return str;
}

async function getPositions(tag) {
	let index = key.findIndex(function (element) {
		return element[0] == tag;
	}, tag);

	if (index == -1) {
		return [];
	}

	let start = key[index][1];
	let end = 0;

	if(index == key.length - 1) {
		end = tagDataLength;
	}
	else {
		end = key[index + 1][1];
	}

	let pos = [];

	let data = await read("pos.csv", start * 4, end * 4);
	var view = new DataView(data.buffer, 0);

	for (let i = 0; i < data.length / 4; i++) {
		pos.push(view.getUint32(i * 4));
	}

	data = null;

	return pos;
}

async function readHex(fileName, start, end) {
	let data = await read(fileName, start, end);

	var view = new DataView(data.buffer, 0);
	return view.getUint32(0);
}

function init() {
	tagDataLength = fs.statSync(path.join(__dirname, '..', 'tags.csv')).size;
	console.log("Tag data length: " + tagDataLength);

	// Load tagPosPos
	key = fs.readFileSync(path.join(__dirname, '..', 'key.csv'), 'utf8');
	key = key.split("\n");
	for (let i = 0; i < key.length; i++) {
		key[i] = key[i].split("|");
		key[i][1] = parseInt(key[i][1]);
	}
}

async function read(fileName, start, end) {
	const stream = fs.createReadStream(path.join(__dirname, '..', fileName), {start: start, end: end, highWaterMark:end - start});
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

	return await getRandomPrompt(including, excluding);
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
	https.createServer(credentials, app).listen(443, function() {
		console.log('Listening on port 443!');
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