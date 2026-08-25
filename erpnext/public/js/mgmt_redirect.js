frappe.router.on("change", function () {
	if (frappe.get_route()[0] === "mgmt-dashboard") {
		frappe.set_route("management-dashboard");
	}
});
