const express = require('express');
const cors = require('cors');
const request = require('request');
const fs = require('fs');

var app = express();
let tagData = null;

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

async function loadCSV() {
	console.log("Loading CSV");
	let data = fs.readFileSync("../tags.csv");
	tagData = new Uint8Array(data);
	console.log("Loaded CSV");
}

app.post('/tags', function (req, res, next) {
	if (tagData == null) {
		console.log("tagData is null");
		res.send("tagData is null");
		return;
	}

	let including = req.body.including;
	let prompt = findPrompt(including);
	res.send(prompt);
});

function findPrompt(including) {
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
		let prompt = getRandomPrompt();
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

function getRandomPrompt() {
	let prompt = "";

	let randomIndex = Math.floor(Math.random() * tagData.length);
	let value = tagData[randomIndex];
	let startPoint = randomIndex;
	let endPoint = randomIndex;

	// Unlucky indexing
	if(value == 13 || value == 10) {
		return getRandomPrompt();
	}

	// Find start point
	while (tagData[startPoint] != 13 && tagData[startPoint] != 10) {
		startPoint--;
	}
	startPoint += 2;

	// Find end point
	while (tagData[endPoint] != 13 && tagData[endPoint] != 10) {
		endPoint++;
	}
	endPoint--;

	// Get prompt
	prompt = new TextDecoder("utf-8").decode(tagData.slice(startPoint, endPoint));

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

app.listen(80, function() {
	console.log('Listening on port 80!');
	loadCSV();
});