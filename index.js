/* Server */
const express = require('express');
const cors = require('cors');
const request = require('request');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

let logs = [];

let app = express();
let tagDataLength = 0;
let posDataLength = 0;

let status = [];
let statusList = [];

let blacklist = [];
let requestList = {};

let previousMinute = 0;
let previousDay = 0;

/* Production Detection */
let production = false;
if (fs.existsSync('/etc/letsencrypt/live/prombot.net/privkey.pem')) {
	production = true;
}
if (process.argv[2] == 'dev') {
	production = false;
}

/* HTTPS */
let privateKey;
let certificate;
let ca;
let credentials;

if (production) {
	privateKey = fs.readFileSync('/etc/letsencrypt/live/prombot.net/privkey.pem');
	certificate = fs.readFileSync('/etc/letsencrypt/live/prombot.net/cert.pem');
	ca = fs.readFileSync('/etc/letsencrypt/live/prombot.net/chain.pem');
	credentials = { key: privateKey, cert: certificate, ca: ca };
}

/* Status Monitor */
app.use(require('express-status-monitor')());

/* Body Parser */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* CORS */
app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
		credentials: true,
		optionsSuccessStatus: 200,
	}),
);

/* Static Files */
app.use('/test', express.static(__dirname + '/test'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/', express.static(__dirname + '/favicon'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/dataset', express.static(__dirname + '/dataset'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/node_modules/argon2-browser/dist', express.static(__dirname + '/node_modules/argon2-browser/dist'));
app.use('/node_modules/unzipit/dist', express.static(__dirname + '/node_modules/unzipit/dist'));

setInterval(function () {
	let date = new Date();
	let minute = date.getMinutes();
	let day = date.getDate();

	let total = status.length;
	let totalSuccess = 0;
	let totalTime = 0;
	let failed = 0;

	for (let i = 0; i < status.length; i++) {
		if (status[i].status == 'success') {
			totalSuccess++;
			totalTime += status[i].time;
		} else {
			failed++;
		}
	}

	statusList.push({ at: date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }), total: total, totalSuccess: totalSuccess, avgTime: totalTime / totalSuccess, failed: failed });
	
	for (let i = 0; i < statusList.length; i++) {
		let temp = new Date(statusList[i].at).getTime();
		if (date.getTime() - temp > 48 * 60 * 60 * 1000) {
			statusList.splice(i, 1);
			i--;
		}
	}
}, 10 * 60 * 1000);

// sitemap.xml
app.get('/sitemap.xml', function (req, res) {
	res.sendFile(__dirname + '/sitemap.xml');
});

/* Routes */
app.post('/readTags', async function (req, res, next) {
	if (checkBlacklist(req, res)) {
		return;
	}

	let pos = req.body.pos;

	if (pos == undefined || typeof pos != 'number' || pos < 0 || pos > tagDataLength) {
		res.send([]);
		return;
	}

	let prompt = await getPromptFromPos(pos);
	res.send(prompt);
});

app.get('/logs', function (req, res, next) {
	let str = '';
	for (let i = 0; i < logs.length; i++) {
		str += '<p>' + logs[i] + '</p>';
	}

	res.send(str);
});

app.post('/api*', function (req, res, next) {
	if (checkBlacklist(req, res)) {
		return;
	}

	request(
		'https://api.novelai.net' + req.url.substring(4),
		{
			method: 'POST',
			json: req.body,
			headers: {
				Authorization: req.headers.authorization,
				'Content-Type': 'application/json',
			},
		},
		function (error, response, body) {
			if (response && response.statusCode != 200) {
				log(String(response.statusCode) + ') ' + req.url.substring(4) + ' error: ' + body.message);
			}
		},
	).pipe(res);
});

app.post('/test', function (req, res, next) {
	console.log('REQUEST');
	res.send('OK');
});

app.get('/naistat', function (req, res, next) {
	res.sendFile(__dirname + '/status.html');
});

app.post('/time', function (req, res, next) {
	let time = req.body.time;
	status.push({at: new Date().getTime(), time: time, status: 'success'});

	res.send('OK');
});

app.get('/stat', function (req, res, next) {
	let total = status.length;
	let totalSuccess = 0;
	let totalTime = 0;
	let failed = 0;

	for (let i = 0; i < status.length; i++) {
		if (status[i].status == 'success') {
			totalSuccess++;
			totalTime += status[i].time;
		} else {
			failed++;
		}
	}

	res.send({ failed: failed, total: total, avgTime: totalTime / totalSuccess});
});

function checkBlacklist(req, res) {
	const ip = req.header["x-forwarded-for"] || req.socket.remoteAddress;

	if (blacklist.includes(ip)) {
		res.send('You are an idiot');
		return true;
	}
}

app.get('/statusList', function (req, res, next) {
	res.send(statusList);
});

app.post('/generate-image', function (req, res, next) {
	if (checkBlacklist(req, res)) {
		return;
	}

	let now = new Date().getTime();

	const ip = req.header["x-forwarded-for"] || req.socket.remoteAddress;

	if (requestList[ip] != undefined) {
		const time = now - requestList[ip].last;
		if (time < 500) {
			requestList[ip].count++;
		}
		else {
			requestList[ip].count = 0;
		}

		if (requestList[ip].count > 20) {
			log('Blacklisted IP: ' + ip);
			blacklist.push(ip);
		}
	}

	if (requestList[ip] == undefined) {
		requestList[ip] = {last: now, count: 0};
	}
	else {
		requestList[ip].last = now;
	}

	// Remove old status

	for (let i = 0; i < status.length; i++) {
		if (now - status[i].at > 10 * 60 * 1000) {
			status.splice(i, 1);
			i--;
		}
	}

	request(
		'https://image.novelai.net/ai/generate-image',
		{
			method: 'POST',
			json: req.body,
			headers: {
				Authorization: req.headers.authorization,
				'Content-Type': 'application/json',
			},
		},
		function (error, response, body) {
			if (response && response.statusCode != 200) {
				if (body.message == undefined) {
					// include ip address
					log('(' + String(response.statusCode) + ') (' + req.socket.remoteAddress + ') Generate image error: ' + body);
				}
				else {
					log('(' + String(response.statusCode) + ') Generate image error: ' + body.message);
				}
				status.push({ at: new Date().getTime(), time: 0, status: 'failed' });
			} else {
				log('Generate image: ' + req.body.input);
			}
		},
	).pipe(res);
});

app.get('/api*', function (req, res, next) {
	if (checkBlacklist(req, res)) {
		return;
	}
	
	request(
		{
			url: 'https://api.novelai.net' + req.url.substring(4),
			headers: {
				Authorization: req.headers.authorization,
			},
		},
		function (error, response, body) {
			if (response && response.statusCode != 200) {
				log(String(response.statusCode) + ') ' + req.url.substring(4) + ' error: ' + body.message);
			}
		},
	).pipe(res);
});

app.get('/', function (req, res, next) {
	if (checkBlacklist(req, res)) {
		return;
	}

	if (process.argv[2] == 'dev') {
		res.sendFile(__dirname + '/static.html');
	}
	else {
		res.sendFile(__dirname + '/index.html');
	}
});

/* Functions */
async function getPromptFromPos(pos) {
	let start = pos;
	let end = pos;

	for (end = pos; end < tagDataLength; end++) {
		if ((await read('tags.csv', end, end + 1)) == 0x0a) {
			break;
		}
	}

	let data = await read('tags.csv', start, end);
	let str = new TextDecoder('utf-8').decode(data);

	return str;
}

async function read(fileName, start, end) {
	const stream = fs.createReadStream(path.join(__dirname, '..', fileName), { start: start, end: end, highWaterMark: end - start });
	return new Promise(function (resolve, reject) {
		stream.on('data', function (chunk) {
			resolve(new Uint8Array(chunk.buffer));
		});
	});
}

function init() {
	tagDataLength = fs.statSync(path.join(__dirname, '..', 'tags.csv')).size;
	console.log('Tag data length: ' + tagDataLength);

	posDataLength = fs.statSync(path.join(__dirname, '..', 'pos.csv')).size;

	// Load key.csv
	key = fs.readFileSync(path.join(__dirname, '..', 'key.csv'), 'utf8');
	key = key.split('\n');
	for (let i = 0; i < key.length; i++) {
		key[i] = key[i].split('|');
		key[i][1] = parseInt(key[i][1]);
	}

	log('Server started');
}

function log(str) {
	let date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });

	str = '(' + date + ') ' + str;
	logs.unshift(str);

	if (logs.length > 30) {
		logs.pop();
	}
}

/* Start Server */
if (production) {
	https.createServer(credentials, app).listen(443, function () {
		console.log('Listening on port 443!');
		init();
		//loadCSV();
	});
	http.createServer(function (req, res) {
		res.writeHead(301, { Location: 'https://' + req.headers['host'] + req.url });
		res.end();
	}).listen(80);
} else {
	if (process.argv[2] == 'dev') {
		app.listen(7860, function () {
			console.log('Listening on port 7860! (dev)');
			init();
		});
	} else {
		app.listen(80, function () {
			console.log("Listening on port 80! (dev)")
			init();
		});
	}
}
