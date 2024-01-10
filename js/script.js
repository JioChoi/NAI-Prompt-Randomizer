let api = '/api';
let key = '';

async function argon_hash(email, password, size, domain) {
    var pre_salt = password.slice(0, 6) + email + domain;
    var salt = blake2b.blake2bHex(pre_salt);
    
    var raw = await argon2.hash({
        pass: password,
        salt: salt,
        time: 2,
        mem: Math.floor(2000000 / 1024),
        hashLen: size,
        type: argon2.argon2id
    });

	var b64 = Buffer.Buffer.from(raw.hash).toString('base64');

	return b64;
}

async function connect(id, pw) {
	let key = await getAccessKey(id, pw);
	let url = api + "/user/login";

	console.log(key);

	$.ajax({
		url: url,
		type: 'POST',
		dataType: 'json',
		data: {
			"key": key
		},
		success: function(data) {
			console.log(data);
		},
		error: function(data) {
			console.log(data);
		}
	});
}

async function getAccessKey(id, pw) {
	let key = await argon_hash(id, pw, 64, "novelai_data_access_key");
	return key.substring(0, 64);
}