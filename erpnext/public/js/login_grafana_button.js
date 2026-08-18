(function () {
	"use strict";

	// Only show on the tridev site
	if (window.location.hostname !== "tridevhealthcare-erp.nlinkits.com") return;

	var GRAFANA_URL = "http://167.71.235.144:3000/login";

	function addGrafanaButton() {
		// Frappe renders the login form dynamically — wait for it
		var loginSection = document.querySelector(".login-content");
		if (!loginSection) return false;

		// Don't add twice
		if (document.getElementById("nlink-grafana-btn")) return true;

		var divider = document.createElement("div");
		divider.style.cssText =
			"display:flex;align-items:center;margin:16px 0;color:#aaa;font-size:12px;";
		divider.innerHTML =
			'<span style="flex:1;border-top:1px solid #e0e0e0;"></span>' +
			'<span style="padding:0 10px;">or</span>' +
			'<span style="flex:1;border-top:1px solid #e0e0e0;"></span>';

		var btn = document.createElement("a");
		btn.id = "nlink-grafana-btn";
		btn.href = GRAFANA_URL;
		btn.target = "_blank";
		btn.rel = "noopener noreferrer";
		btn.style.cssText =
			"display:block;text-align:center;padding:9px 16px;" +
			"background:#f26522;color:#fff;border-radius:6px;" +
			"text-decoration:none;font-size:13px;font-weight:500;" +
			"transition:background 0.2s;";
		btn.textContent = "View Activity in Grafana";
		btn.onmouseover = function () {
			this.style.background = "#d4541a";
		};
		btn.onmouseout = function () {
			this.style.background = "#f26522";
		};

		loginSection.appendChild(divider);
		loginSection.appendChild(btn);
		return true;
	}

	// Poll until the login form renders (Frappe renders it dynamically)
	var attempts = 0;
	var interval = setInterval(function () {
		attempts++;
		if (addGrafanaButton() || attempts > 50) {
			clearInterval(interval);
		}
	}, 200);
})();
