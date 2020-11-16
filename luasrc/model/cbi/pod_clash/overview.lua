local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config")

m = SimpleForm("_pod_clash")
m:append(Template("pod_clash/cbi/view_config"))
local clash_info = {}
clash_info['00image_create_time'] = {_key=translate("Image Create Time"),_value='-'}
clash_info['01container_age'] = {_key=translate("Container Age"),_value='-'}
clash_info['10clash_version'] = {_key=translate("Clash Version"),_value='-'}
clash_info['11clash_running_mode'] = {_key=translate("Running Mode"),_value='-'}
clash_info['12clash_allow_lan'] = {_key=translate("Allow Lan"),_value='-'}
clash_info['13clash_ports'] = {_key=translate("Clash Ports"),_value='-'}
clash_info['20clash_dashboard'] = {_key=translate("Clash Dashboard"),_value='-'}

s = m:section(Table, clash_info, translate("Pod Clash"))
s.template = "cbi/tblsection"
s:option(DummyValue, "_key", translate("Info"))
o = s:option(DummyValue, "_value")

local config_info = {}

local configs = luci.model.uci:get(global_config, "global", "configs")
for _, x in ipairs(configs) do
	config_info[x] = {name = x}
end

s = m:section(Table, config_info, translate("Clash Config"))
s.template = "pod_clash/cbi/config_tblsection"

o = s:option(DummyValue, "name", translate("Config Name"))
local o = s:option(Button, "switch")
o.template = "pod_clash/cbi/disabled_button"
o.render = function(self, section, scope)
	if config_file == section then
		self.inputtitle = translate("Using")
		self.inputstyle = "remove"
		self.view_disabled = true
	else
		self.inputtitle = translate("Use")
		self.inputstyle = "add"
		self.view_disabled = false
	end
	Button.render(self, section, scope)
end
o.forcewrite = true
o.write = function(self, section, value)
	if value ~= translate("Use") then
		return
	end
	local pod_clash = require "luci.model.pod_clash"
	pod_clash.switch_config(section)
	luci.http.redirect(luci.dispatcher.build_url("admin/services/pod_clash/overview"))
end

-- o = s:option(Button, "view")
-- o.inputtitle = translate("View")
-- o.inputstyle = "apply"
-- o.write = function(self, section, value)
-- 	local pod_clash = require "luci.model.pod_clash"
-- 	pod_clash.gen_config(section)
-- 	luci.http.redirect(luci.dispatcher.build_url("admin/services/pod_clash/overview"))
-- end

o = s:option(Button, "view")
o.template = "pod_clash/cbi/view_button"
o.inputtitle = translate("View")
o.inputstyle = "apply"


o = s:option(Button, "remove")
o.template = "pod_clash/cbi/disabled_button"
o.inputtitle = translate("Remove")
o.inputstyle = "remove"
o.render = function(self, section, scope)
	if config_file == section or section == "default" then
		self.view_disabled = true
	else
		self.view_disabled = false
	end
	Button.render(self, section, scope)
end
o.forcewrite = true
o.write = function(self, section, value)
	local pod_clash = require "luci.model.pod_clash"
	pod_clash.remove_config(section)
	luci.http.redirect(luci.dispatcher.build_url("admin/services/pod_clash/overview"))
end

return m