import frappe


def patch_login_redirect():
	"""
	Patches the LoginManager to redirect users to a custom path after login.

	Activated per-site by adding "login_redirect" to site_config.json, e.g.:
	    { "login_redirect": "/app/home" }

	Sites without this key are not affected.

	The patch is applied once per worker process (guarded by _login_redirect_patched).
	The redirect value is read fresh from site_config on every login so that config
	changes take effect without requiring a bench restart.
	"""
	if not frappe.conf.get("login_redirect"):
		return

	from frappe.auth import LoginManager

	# Prevent accumulating nested patches across multiple logins in the same worker
	if getattr(LoginManager.set_user_info, "_login_redirect_patched", False):
		return

	original_set_user_info = LoginManager.set_user_info

	def patched_set_user_info(self, resume=False):
		original_set_user_info(self, resume)
		# Read fresh from site_config on every login — never uses a stale closure value
		current_redirect = frappe.conf.get("login_redirect")
		if not resume and current_redirect and self.info.user_type != "Website User":
			frappe.local.response["home_page"] = current_redirect

	patched_set_user_info._login_redirect_patched = True
	LoginManager.set_user_info = patched_set_user_info
