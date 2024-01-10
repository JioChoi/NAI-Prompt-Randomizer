let api = '/api';

async function apiCall() {
	// using ajax
	let url = api;
	$.ajax({
		url: url,
		type: 'GET',
		dataType: 'text',
		success: function(data) {
			console.log(data);
		},
		error: function(xhr, status, error) {
			console.log(xhr.responseText);
		}
	});
}