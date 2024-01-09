api = "https://api.novelai.net/";

function apiCall() {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', api, true);
	
	xhr.onload = function() {
		if (this.status == 200) {
			console.log(this.responseText);
		}
	}

	const data = {
		"prompt": "The quick brown fox jumps over the lazy dog.",
		"length": 50,
		"num_samples": 1,
		"temperature": 0.7,
		"top_p": 1,
		"frequency_penalty": 0,
		"presence_penalty": 0,
		"stop_token": "EOS"
	};
	
	xhr.send(data);
}