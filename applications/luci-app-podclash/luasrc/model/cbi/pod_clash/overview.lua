local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config")

local pod_clash = require "luci.model.pod_clash"
local pod_info = {}
local clash_info = {}

m = SimpleForm("_pod_clash")
m:append(Template("pod_clash/cbi/view_config"))
m.submit = false
m.reset = false
clash_info['00pod_name'] = {_key=translate("POD Name"),_value='-'}
clash_info['01pod_ip'] = {_key=translate("POD IP"),_value='-'}
clash_info['11clash_running_mode'] = {_key=translate("Running Mode"),_value='-'}
clash_info['12clash_allow_lan'] = {_key=translate("Allow Lan"),_value='-'}
clash_info['13clash_ports'] = {_key=translate("Clash Ports"),_value='-'}
-- clash_info['22clash_dashboard'] = {_key=translate("Clash Dashboard"),_value='-'}
clash_info['21external_controller'] = {_key=translate("External Controller"),_value='-'}

local pod_ip = pod_clash.get_pod_ip()
local pod_name = luci.model.uci:get(global_config, "pod", "pod_name")
local image_name = luci.model.uci:get(global_config, "pod", "image_name")
if pod_ip then
	local httpclient = require "luci.httpclient"
	-- local secret = luci.model.uci:get("pod_clash_general_"..config_file, "general", "secret")
	-- local port = luci.model.uci:get("pod_clash_general_"..config_file, "general", "external_controller"):match(".-:(.+)")
	local clash_secret = "podclash"
	local clash_port = "9090"

	local code, header, json = httpclient.request_raw("http://"..pod_ip..":"..clash_port.."/configs", {headers = {Authorization = "Bearer "..clash_secret}})
	local res = luci.jsonc.parse(json)
		clash_info['00pod_name']["_value"] = "<a href='"..luci.dispatcher.build_url("admin/docker/container/"..pod_name).."' >"..pod_name .. "</a>"
		clash_info['01pod_ip']["_value"] = pod_ip
	if type(res) == "table" then
		clash_info['11clash_running_mode']["_value"] = res["mode"] and res.mode:upper()
		clash_info['12clash_allow_lan']["_value"] = res["allow-lan"] and "TRUE" or "FALSE"
		clash_info['13clash_ports']["_value"] = clash_info['12clash_allow_lan']["_value"] == "TRUE" and ("HTTP: " .. ( res["port"] or "" ) .. " | SOCKS5: " .. (res["socks-port"] or "").." | MIXED: "..(res["mixed-port"] or "")) or "-"
		-- clash_info['22clash_dashboard']["_value"] = "<a href='http://"..pod_ip.."'>http://"..pod_ip.."</a>"
		clash_info['21external_controller']["_value"] = "http://" .. pod_ip .. ":" .. clash_port ..  "<br>secret: "..clash_secret
	end
else
	cmd = "DOCKERCLI -d --privileged -e TZ=Asia/Shanghai --restart unless-stopped --name " .. pod_name .. " ".. image_name
	clash_info['00pod_name']["_value"] = "<a href=\""..luci.dispatcher.build_url("admin/docker/newcontainer/".. luci.util.urlencode(cmd)).."\" >"..
	translate("There is no Pod(container) named 「".. pod_name.. "」, please create it first!").."</a>"
	m.message = translate("There are no Pod(container) named ".. pod_name.. ", please create it first!")
end

-- pod clash info
s = m:section(Table, clash_info, translate("POD Clash"))
s.template = "cbi/tblsection"
s:option(DummyValue, "_key", translate("Info"))
o = s:option(DummyValue, "_value")
o.rawhtml = true

-- config info
local config_info = {}

local configs = luci.model.uci:get(global_config, "global", "configs")
for _, conf in ipairs(configs) do
	local genreal_conf = "pod_clash_general_" .. conf
	local allow_lan = luci.model.uci:get(genreal_conf, "general", "allow_lan")
	config_info[conf] = {
		name = conf,
		mode = luci.model.uci:get(genreal_conf, "general", "mode"),
		port = allow_lan == "true" and ("HTTP: ".. (luci.model.uci:get(genreal_conf, "general", "port") or "") 
		.. " | SOCK5: " .. (luci.model.uci:get(genreal_conf, "general", "socks_port") or "") 
		.. " | MIXED: " .. (luci.model.uci:get(genreal_conf, "general", "mixed_port") or "")) or "-",
		dns_mode = luci.model.uci:get(genreal_conf, "dns", "enhanced_mode")
	}
end

s = m:section(Table, config_info, translate("Clash Config"))
s.template = "pod_clash/cbi/config_tblsection"

o = s:option(DummyValue, "name", translate("Config Name"))
o = s:option(DummyValue, "mode", translate("Mode"))
o = s:option(DummyValue, "port", translate("Ports"))
o = s:option(DummyValue, "dns_mode", translate("DNS Mode"))

o = s:option(Button, "view")
o.template = "pod_clash/cbi/view_button"
o.inputtitle = translate("View")
o.inputstyle = "apply"

o = s:option(Button, "switch")
o.template = "pod_clash/cbi/disabled_button"
o.render = function(self, section, scope)
	if config_file == section then
		self.inputtitle = translate("Reload (Using)")
		self.inputstyle = "remove"
		self.view_disabled = false
	else
		self.inputtitle = translate("Use")
		self.inputstyle = "add"
		self.view_disabled = false
	end
	Button.render(self, section, scope)
end
o.forcewrite = true
o.write = function(self, section, value)
	-- if value ~= translate("Use") then
	-- 	return
	-- end
	pod_clash.switch_config(section)
	luci.http.redirect(luci.dispatcher.build_url("admin/services/pod_clash/overview"))
end

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
	pod_clash.remove_config(section)
	luci.http.redirect(luci.dispatcher.build_url("admin/services/pod_clash/overview"))
end

return m