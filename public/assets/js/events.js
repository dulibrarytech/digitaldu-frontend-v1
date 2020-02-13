$( document ).ready(function() {
    
	// Select an option in the results per page dropdown.  Reset page selection to 1 (no parameter), remove existing page count parameter
	$('#results-per-page').change(function(event) {
		var searchUrl = decodeURIComponent(window.location.href).replace(/&resultsPerPage=[0-9]+/g, "");
		searchUrl = searchUrl.replace(/&*page=[0-9]+/g, "");
		searchUrl += "&resultsPerPage=" + $('#results-per-page').val();
		window.location.replace(encodeURI(searchUrl));
	});

	$('#results-view-select').change(function(event) {
		var searchUrl = decodeURIComponent(window.location.href).replace(/&view=[a-zA-Z0-9]+/g, "");
		searchUrl += "&view=" + $('#results-view-select').val();
		window.location.replace(encodeURI(searchUrl));
	});

	$("#home-search button").click(function(event) {
		event.preventDefault();
		$("#search-box input").val(DOMPurify.sanitize($("#search-box input").val()));
		$("#home-search").submit();
	});

	$(".banner-search button").click(function(event) {
		event.preventDefault()
		$(".banner-search form input[type='text']").val(DOMPurify.sanitize($(".banner-search form input[type='text']").val()));
		$(".banner-search form").submit();
	});

	$(".sidebar-search button").click(function(event) {
		event.preventDefault();
		$(".sidebar-search input[type='text']").val(DOMPurify.sanitize($(".sidebar-search input[type='text']").val()));
		$(".sidebar-search form").submit();
	});
});


