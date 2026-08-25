(function () {
	function check_and_redirect() {
		if (window.location.pathname === "/app/mgmt-dashboard") {
			window.location.replace("/app/management-dashboard");
		}
	}

	$(document).on("page-change", check_and_redirect);
	$(document).on("page-load", check_and_redirect);
})();
