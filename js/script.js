function apiCall() {
	$.ajaxPrefilter('json', function(options, orig, jqXHR) {
		return 'jsonp';
	});
	$.ajax({
			url: "api.novelai.net",
			crossDomain: true,
			dataType: "json",
			method: "GET",
			data: {},
			headers: {},
			success: function(result, textStatus, jqXHR ) {					
			}
	});
}