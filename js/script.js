let api = '/api';
let key = null;

window.onload = async function() {
	await init();
	css();
}

function css() {


}

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

async function generate() {
	let prompt = "1girl, {{kirisame_marisa, touhou_project}}, kahlua, clothing, {{{volumetric lighting, depth of field, shiny skin, humid skin,oiled,skindentation,best quality,amazing quality,very aesthetic,highres,incredibly absurdres}}}";
	let negativePrompt = "NSFW, bad quality, low quality, worst quality, lowres, displeasing, very displeasing, bad anatomy, bad perspective, bad proportions, bad aspect ratio, bad face, long face, bad teeth, bad neck, long neck, bad arm, bad hands, bad ass, bad leg, bad feet, bad reflection, bad shadow, bad link, bad source, wrong hand, wrong feet, missing limb, missing eye, missing tooth, missing ear, missing finger, extra faces, extra eyes, extra eyebrows, extra mouth, extra tongue, extra teeth, extra ears, extra breasts, extra arms, extra hands, extra legs, extra digits, fewer digits, cropped head, cropped torso, cropped shoulders, cropped arms, cropped legs, mutation, deformed, disfigured, unfinished, chromatic aberration";

	let width = 832;
	let height = 1216;
	
	let promptGuidance = 5;
	let promptGuidanceRescale = 0;

	let sampler = "k_dpmpp_2s_ancestral";

	let SMEA = true;
	let DYN = false;

	let seed = Math.floor(Math.random() * 9999999999);
	let noiseSeed = Math.floor(Math.random() * 9999999999);

	let params = {
		"legacy": false,
		"legacy_v3_extend": false,
		"quality_toggle": false,
		"width": width,
		"height": height,
		"n_samples": 1,
		"seed": seed,
		"extra_noise_seed": noiseSeed,
		"sampler": sampler,
		"steps": 28,
		"scale": promptGuidance,
		"uncond_scale": 1.0,
		"negative_prompt": negativePrompt,
		"sm" : SMEA,
		"sm_dyn" : DYN,
		"dynamic_thresholding": false,
		"controlnet_strength": 1.0,
		"add_original_image": false,
		"cfg_rescale": promptGuidanceRescale,
		"noise_schedule": "native",
	};

	let result = await generateImage(key, prompt, "nai-diffusion-3", "generate", params);
	return result;
}

async function generateImage(accessToken, prompt, model, action, parameters) {
	let url = api + "/ai/generate-image";

	let data = {
		"input": prompt,
		"model": model,
		"action": action,
		"parameters": parameters,
	}

	let result = await post(url, data, accessToken, 'blob');

	const { entries } = await unzipit.unzip(result);

	let blob = null;
	const imgName = Object.keys(entries)[0];
	await entries[imgName].blob('image/png').then((data) => { blob = data });

	const img = document.createElement('img');
	img.src = window.URL.createObjectURL(blob);

	document.body.appendChild(img);

	return window.URL.createObjectURL(blob);
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

async function post(url, data, authorization = null, resultType = 'json') {
	return new Promise((resolve, reject) => {
		fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': authorization,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data)
		})
		.then((response) => {
			if(resultType == 'json') {
				resolve(response.json());
			}
			else {
				resolve(response.blob());
			}
		})
		.catch((err) => {
			reject(err);
		});
	});

	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'POST',
			dataType: dataType,
			data: JSON.stringify(data),
			beforeSend: function(request) {
				request.setRequestHeader("Authorization", authorization);
				request.setRequestHeader("Content-Type", "application/json");
			},
			success: function(data) {
				console.log("Success");
				resolve(data);
			},
			error: function(err) {
				console.log("Error");
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