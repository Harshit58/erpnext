import frappe


def patch_login_redirect():
	"""
	Patches the LoginManager to redirect users to a custom path after login.

	Activated per-site by adding "login_redirect" to site_config.json, e.g.:
	    { "login_redirect": "/app/nlink-shared-board/Board" }

	Sites without this key are not affected.
	"""
	redirect = frappe.conf.get("login_redirect")
	if not redirect:
		return

	original_set_user_info = frappe.auth.LoginManager.set_user_info

	def patched_set_user_info(self, resume=False):
		original_set_user_info(self, resume)
		if not resume and self.info.user_type != "Website User":
			frappe.local.response["home_page"] = redirect

	frappe.auth.LoginManager.set_user_info = patched_set_user_info
