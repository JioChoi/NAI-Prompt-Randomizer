let api = '/api';

let key = null;

// Initialize
async function init() {
	// Auto login.
	let accessToken = localStorage.getItem("key");
	if (accessToken == null) {
		// Not logged in.
	}
	else {
		key = accessToken;
		try {
			await testAccessToken(accessToken);
			// Successfully auto logged in.
			console.log("Logged in");
		} catch (err) {
			// Failed to auto login.
			console.log("Failed to login");
		}
	}
}

// Login function
async function login(id, pw) {
	key = await connect(id, pw);
	localStorage.setItem("key", key);

	if (key == null) {
		// Failed to login.
		console.log("Failed to login");
	}
	else {
		// Successfully logged in.
		console.log("Logged in");
	}
}

async function connect(id, pw) {
	try {
		let accessToken = await getAccessToken(id, pw);
		let result = await testAccessToken(accessToken);
		return accessToken;
	} catch (err) {
		return null;
	}
}

async function testAccessToken(accessToken) {
	let url = api + "/user/information";
	let result = await get(url, accessToken);
	return result;
}

function reformatAccessToken(accessToken) {
	return "Bearer " + accessToken;
}

async function getAccessToken(id, pw) {
	let key = await getAccessKey(id, pw);
	let url = api + "/user/login";
	var accessToken = await post(url, {"key": key}).then((data) => { return data.accessToken; });
	return reformatAccessToken(accessToken);
}

async function getAccessKey(id, pw) {
	let key = await argon_hash(id, pw, 64, "novelai_data_access_key");
	return key.substring(0, 64);
}

async function argon_hash(email, password, size, domain) {
    var pre_salt = password.slice(0, 6) + email + domain;
    var salt = blake2b.blake2b(pre_salt, null, 16);

    var raw = await argon2.hash({
        pass: password,
        salt: salt,
        time: 2,
        mem: Math.floor(2000000 / 1024),
        hashLen: size,
        type: 2
    });

	var b64 = Buffer.Buffer.from(raw.hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

	return b64;
}

async function post(url, data, authorization = null) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'POST',
			dataType: 'json',
			data: data,
			beforeSend: function(request) {
				request.setRequestHeader("Authorization", authorization);
			},
			success: function(data) {
				resolve(data);
			},
			error: function(err) {
				reject(err);
			}
		});
	});
}

async function get(url, authorization = null) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'GET',
			beforeSend: function(request) {
				request.setRequestHeader("Authorization", authorization);
			},
			success: function(data) {
				resolve(data);
			},
			error: function(err) {
				reject(err);
			}
		});
	});
}