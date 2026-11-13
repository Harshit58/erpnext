import frappe


def _get_redirect_for_user(user):
	"""Return the post-login redirect path for the given user based on their roles."""
	user_roles = set(frappe.get_roles(user))
	if "System Manager" in user_roles:
		return "/app/management-dashboard"
	return "/app/projects"


def patch_login_redirect():
	"""
	Patches the LoginManager to redirect users to a role-based path after login.

	System Manager → /app/management-dashboard
	Everyone else   → /app/projects

	Only active on sites where site_config has enable_management_dashboard = true.
	The patch is applied once per worker process (guarded by _login_redirect_patched),
	but the site config check runs on every login so multi-tenant workers are safe.
	"""
	from frappe.auth import LoginManager

	# Prevent accumulating nested patches across multiple logins in the same worker
	if getattr(LoginManager.set_user_info, "_login_redirect_patched", False):
		return

	original_set_user_info = LoginManager.set_user_info

	def patched_set_user_info(self, resume=False):
		original_set_user_info(self, resume)
		if not frappe.conf.get("enable_management_dashboard"):
			return
		if resume or self.info.user_type == "Website User":
			return
		redirect = _get_redirect_for_user(self.info.name)
		frappe.local.response["home_page"] = redirect

	patched_set_user_info._login_redirect_patched = True
	LoginManager.set_user_info = patched_set_user_info
