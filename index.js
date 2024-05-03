/* Server */
const express = require('express');
const cors = require('cors');
const request = require('request');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const shell = require('shelljs');
const mysql = require('mysql2');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();

let logs = [];
let errorLogs = [];

let app = express();
let tagDataLength = 0;

let status = [];

let blacklist = [];
let generating = 0;

const SERVER_LIST = [
	"https://jio7-imagen-a.hf.space",
	"https://jio7-imagen-b.hf.space",
	"https://jio7-imagen-c.hf.space",
	"https://jio7-imagen-d.hf.space",
];

/* Database Detection */
let database = true;

/* Production Detection */
let production = false;
if (fs.existsSync('/etc/letsencrypt/live/prombot.net/privkey.pem')) {
	production = true;
}
if (process.argv[2] == 'dev') {
	production = false;
}
if(process.argv[2] == 'local') {
	database = false;
}

// Database for status
let db_info;
let connection;
if(database) {
	db_info = {
		host: 'prombot-prombot.a.aivencloud.com',
		port: '14180',
		user: 'avnadmin',
		password: process.env.DB_PASSWORD,
		database: 'defaultdb',
		connectionLimit: 3,
	}

	pool = mysql.createPool(db_info);

	pool.getConnection(function(err, connection) {
		if (err) 
			throw err;
		else {
			connection.query('SET time_zone = "Asia/Seoul"');
			console.log('Database connected as id ' + connection.threadId);
	
			connection.release();
		}
	});
}

// Image Server          
cloudinary.config({ 
	cloud_name: 'dy0bjirxc', 
	api_key: process.env.CLOUDINARY_API_KEY, 
	api_secret: process.env.CLOUDINARY_API_SECRET 
});

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

/* Payload Too Large */
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({
    limit:"100mb",
    extended: false
}));

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
	if (database) {
		addServerStatus();
		removeOldStatus();
	}
}, 10 * 60 * 1000);

function removeOldStatus() {
	// Remove after third day
	let query = `DELETE FROM ServerStatus WHERE at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)`;
	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return
		}

		connection.query(query, function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}
			connection.release();
		});
	});
}

function createTestData() {
	let query = `INSERT INTO ServerStatus (at, total, totalSuccess, avgTime, failed) VALUES (UTC_TIMESTAMP(), 1, 0, 0, 0)`;
	connection.query(query, function (err, results, fields) {
		if (err) {
			console.log('Error: ' + err);
			return;
		}
	});
}

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

app.get('/error', function (req, res, next) {
	let str = '';
	for (let i = 0; i < errorLogs.length; i++) {
		str += '<p>' + errorLogs[i] + '</p>';
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
	let settings = req.body.settings;
	status.push({at: new Date().getTime(), time: time, settings: settings, status: 'success'});

	res.send('OK');
});

app.get('/stat', function (req, res, next) {
	let total = status.length;
	let totalSuccess = 0;
	let totalTime = 0;
	let totalTimeTotal = 0;
	let failed = 0;

	for (let i = 0; i < status.length; i++) {
		if (status[i].status == 'success') {
			totalSuccess++;

			if (status[i].settings != undefined) {
				let steps = status[i].settings.steps;
				let width = status[i].settings.width;
				let height = status[i].settings.height;

				if (steps == 28 && ((width == 832 && height == 1216) || (width == 1216 && height == 832) || (width == 1024 && height == 1024))) {
					totalTime += status[i].time;
					totalTimeTotal++;
				}	
			}
		} else {
			failed++;
		}
	}

	res.send({ failed: failed, total: total, avgTime: totalTime / totalTimeTotal });
});

function checkBlacklist(req, res) {
	const ip = req.header["x-forwarded-for"] || req.socket.remoteAddress;

	if (blacklist.includes(ip)) {
		res.send('You are an idiot');
		return true;
	}
}

app.get('/statusList', function (req, res, next) {
	if(database) {
		// Select recent two days including today
		let query = `SELECT * FROM ServerStatus ORDER BY at DESC`;
		
		pool.getConnection(function (err, connection) {
			if (err) {
				console.log('Error: ' + err);
				return
			}
	
			connection.query(query, function (err, results, fields) {
				if (err) {
					console.log('Error: ' + err);
					return;
				}

				res.send(results);
				connection.release();
			});
		});
	}
	else {
		res.send([]);
	}
});

app.post('/getPresets', function (req, res, next) {
	let uid = req.body.uid;
	if (uid.length != 64) {
		res.send('Invalid data');
		return;
	}

	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			res.send('Error');
			return
		}

		connection.query('SELECT * FROM Presets WHERE uid = ?', [uid], function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				res.send('Error');
				return;
			}
			res.send(results);
			connection.release();
		});
	});
});

app.post('/deletePreset', function (req, res, next) {
	let id = req.body.id;
	let uid = req.body.uid;

	if (id == undefined || uid == undefined || id.length != 64 || uid.length != 64) {
		res.send('Invalid data');
		return;
	}

	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return;
		}

		connection.query('DELETE FROM Presets WHERE id = ? AND uid = ?', [id, uid], function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}
			connection.release();
		});
	});

	res.send('OK');
});

app.post('/addPreset', function (req, res, next) {
	let name = req.body.name;
	if (name == undefined || name.length == 0 || name == "default") {
		res.send('Invalid data');
		return;
	}
	name = name.trim();

	let data = req.body.data;
	let uid = req.body.uid;
	let id = crypto.createHash('sha256').update(uid + name).digest('hex');

	if (name.length == 0 || data.length == 0 || uid.length != 64 || name.length > 100) {
		res.send('Invalid data');
		return;
	}

	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return
		}

		connection.query('REPLACE INTO Presets (id, name, data, uid) VALUES (?, ?, ?, ?)', [id, name, data, uid], function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}
			connection.release();
		});
	});

	res.send({ id: id });
});

function addServerStatus() {
	let total = status.length;
	let totalSuccess = 0;
	let totalTime = 0;
	let totalTimeTotal = 0;
	let failed = 0;

	for (let i = 0; i < status.length; i++) {
		if (status[i].status == 'success') {
			totalSuccess++;

			if (status[i].settings != undefined) {
				let steps = status[i].settings.steps;
				let width = status[i].settings.width;
				let height = status[i].settings.height;

				if (steps == 28 && ((width == 832 && height == 1216) || (width == 1216 && height == 832) || (width == 1024 && height == 1024))) {
					totalTime += status[i].time;
					totalTimeTotal++;
				}	
			}
		} else {
			failed++;
		}
	}

	let avgTime = totalTime / totalSuccess;
	if (isNaN(avgTime)) {
		avgTime = 0;
	}

	let query = `INSERT INTO ServerStatus (at, total, totalSuccess, avgTime, failed) VALUES (UTC_TIMESTAMP(), ?, ?, ?, ?)`;

	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return
		}

		connection.query(query, [total, totalSuccess, avgTime, failed], function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}
			connection.release();
		});
	});
}

async function checkDisabled(server) {
	try {
		let response = await fetch(server + '/disabled');
		let json = await response.json();
	
		return !(json.disabled == false);
	} catch (e) {
		return true;
	}
}

app.post('/generate-image', async function (req, res, next) {
	let now = new Date().getTime();

	// Remove old status
	for (let i = 0; i < status.length; i++) {
		if (now - status[i].at > 10 * 60 * 1000) {
			status.splice(i, 1);
			i--;
		}
	}

	generating++;
	if (generating >= SERVER_LIST.length) {
		generating = 0;
	}

	let currentServer = generating;
	let server = SERVER_LIST[currentServer];

	let disabled = await checkDisabled(server);
	if (disabled) {
		for (let i = 0; i < SERVER_LIST.length; i++) {
			disabled = await checkDisabled(SERVER_LIST[i]);
			if (!disabled &&  i != currentServer) {
				errorLog('Server ' + currentServer + ' is disabled. Switching to server ' + i);
				currentServer = i;
				server = SERVER_LIST[i];
				break;
			}
		}

		if (disabled) {
			errorLog('All servers are disabled.');
			res.send("Server stopped generating images due to high load. Please try again later.");
			return;
		}
	}

	request({
		url: server + '/generate-image',
		method: 'POST',
		json: req.body,
		headers: {
			Authorization: req.headers.authorization,
			'Content-Type': 'application/json',
		},
	}, function (error, response, body) {
		if (response && response.statusCode != 200) {
			log('(' + String(response.statusCode) + ') Generate image error: ' + body.message);
			errorLog('(' + String(response.statusCode) + ') Generate image error: ' + body.message);
		} else {
			log('Generate image: ' + req.body.input);
		}
	}).pipe(res);
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

app.get('/update', function (req, res, next) {
	res.send('Update Started');

	shell.exec('sudo bash update.sh');
});

/* Community */
app.post('/community/post', async function (req, res, next) {
	// Data validation
	let uid = req.body.uid;
	let data = req.body.data;
	let img = req.body.img;
	let rating = req.body.rating;
	let title = req.body.title;
	let prompt = req.body.prompt;

	if (uid == undefined || data == undefined || img == undefined || rating == undefined || title == undefined || prompt == undefined) {
		res.send('Invalid data');
		return;
	}

	let id = crypto.createHash('sha256').update(img).digest('hex');

	if (uid.length != 64 || data.length == 0 || img.length == 0 || title.length == 0 || rating.length != 1 || prompt.length == 0) {
		res.send('Invalid data');
		return;
	}

	if (img.length * 3 / 4 > 1024 * 1024 * 2) {
		res.send('Image too large');
		return;
	}

	if (img.substring(0, 22) !== 'data:image/webp;base64' && img.substring(0, 21) !== 'data:image/png;base64') {
		return res.status(400).send('Invalid image format');
	}

	// upload image to server
	const result = await cloudinary.uploader.upload(img, { folder: "community", public_id: id });

	if (result.existing) {
		return res.status(400).send('Image already exists');
	}

	// Save to database
	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return
		}

		connection.query('INSERT INTO Community (id, uid, data, img, rating, title, date, prompt) VALUES (?, ?, ?, ?, ?, ?, now(), ?)', [id, uid, data, result.secure_url, rating, title, prompt], function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}
			connection.release();

			res.send('OK');
		});
	});
});

app.post('/community/get', function (req, res, next) {
	let start = req.body.start;
	let count = req.body.count;
	let sort = req.body.sort;

	// Create search query
	let searchMode = true;
	let searchKeywords = req.body.search;
	if (searchKeywords == '' || searchKeywords == undefined) {
		searchMode = false;
	}

	if (start == undefined || count == undefined || start < 0 || count < 0 || count > 100 || sort == undefined) {
		res.send('Invalid data');
		return;
	}

	let query;
	let sortQuery = '';
	switch (sort) {
		case 'new':
			sortQuery = 'ORDER BY UNIX_TIMESTAMP(date) DESC';
			break;
		case 'rating':
			sortQuery = 'ORDER BY upvote DESC';
			break;
		case 'download':
			sortQuery = 'ORDER BY download DESC';
			break;
		default:
			res.send('Invalid data');
			return;
	}

	query = `SELECT * FROM Community ${sortQuery} LIMIT ?, ?`;
	let search = '';

	// Search
	if (searchMode) {
		searchKeywords = searchKeywords.split(',');

		for (let i = 0; i < searchKeywords.length; i++) {
			search += '+"' + searchKeywords[i] + '" ';
		}

		query = `SELECT * FROM Community WHERE MATCH (title, prompt) AGAINST (? IN BOOLEAN MODE) ${sortQuery} LIMIT ?, ?`;
	}


	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return
		}

		if (searchMode) {
			connection.query(query, [search, start, count], function (err, results, fields) {

				if (err) {
					console.log('Error: ' + err);
					return;
				}
				connection.release();
	
				res.send(results);
			});
		}
		else {
			connection.query(query, [start, count], function (err, results, fields) {
				if (err) {
					console.log('Error: ' + err);
					return;
				}
				connection.release();
	
				res.send(results);
			});
		}		
	});
});

app.get('/community/length', function (req, res, next) {
	pool.getConnection(function (err, connection) {
		if (err) {
			console.log('Error: ' + err);
			return
		}

		connection.query('SELECT COUNT(*) as cnt FROM Community', function (err, results, fields) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}
			connection.release();

			res.send(results);
		});
	});
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

function errorLog(str) {
	let date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });

	str = '(' + date + ') ' + str;
	errorLogs.unshift(str);

	if (errorLogs.length > 200) {
		errorLogs.pop();
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
			removeOldStatus();
		});
	} else {
		app.listen(80, function () {
			console.log("Listening on port 80! (dev)")
			init();
		});
	}
}
