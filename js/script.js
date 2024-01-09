let api = 'https://api.novelai.net';

function apiCall() {
	// ajax call
	$.ajax({
		url: api,
		type: 'GET',
		dataType: 'text',
		withCredentials: true,
		success: function(data) {
			console.log(data);
		},
		error: function(xhr, status, error) {
			console.log(xhr);
		}
	});
}