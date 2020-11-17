module("luci.controller.pod_clash", package.seeall)

function index()
	-- if not nixio.fs.access("/etc/config/luci_plugin_clash") then
	-- 	return
	-- end
	entry({"admin", "services", "pod_clash"}, firstchild(), "Clash", 40)
	entry({"admin", "services", "pod_clash", "overview"}, form("pod_clash/overview"), _("Overview"), 1).leaf = true
	entry({"admin", "services", "pod_clash", "general"}, cbi("pod_clash/general"), _("General Settings"), 2).leaf = true
	entry({"admin", "services", "pod_clash", "dns"}, cbi("pod_clash/dns"), _("DNS"), 3).leaf = true
	entry({"admin", "services", "pod_clash", "proxies"}, cbi("pod_clash/proxies"), _("Proxies"), 4).leaf = true
	entry({"admin", "services", "pod_clash", "rules"}, cbi("pod_clash/rules"), _("Rules"), 5).leaf = true
	entry({"admin", "services", "pod_clash", "logs"}, form("pod_clash/logs"), _("Logs"), 6).leaf = true

	entry({"admin", "services", "pod_clash", "newproxy"}, cbi("pod_clash/newproxy", {hideapplybtn = true})).leaf = true

	entry({"admin", "services", "pod_clash", "import_rule_provider"}, call("import_rule_provider")).leaf = true
	entry({"admin", "services", "pod_clash", "import_proxy_provider"}, call("import_proxy_provider")).leaf = true
	entry({"admin", "services", "pod_clash", "resolve_config"}, call("resolve_config")).leaf = true
	entry({"admin", "services", "pod_clash", "get_config"}, call("get_config")).leaf = true
	entry({"admin", "services", "pod_clash", "get_logs"}, call("get_logs"))
end

local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local rules_config   = "pod_clash_rules_" .. config_file
local proxies_config = "pod_clash_proxies_" .. config_file
local general_config = "pod_clash_general_" .. config_file

function get_logs()
	local pod_clash = require "luci.model.pod_clash"

	luci.http.status(200, "OK")
	luci.http.write(pod_clash.get_logs())

end

function get_config(config_file)
	local pod_clash = require "luci.model.pod_clash"

	luci.http.status(200, "OK")
	luci.http.write_json({config = pod_clash.gen_config(config_file)})
end

function resolve_config()
	local part = luci.http.formvalue("part")
	local config_json = luci.http.formvalue("config_json")

	if not config_json then 
		luci.http.status(400, "fail")
		return
	end
	local config = luci.jsonc.parse(config_json)
	local stat = true

	if type(config) == "table" then
		local pod_clash = require "luci.model.pod_clash"

		if part == "rule" then
			stat = pod_clash.parse_rules(rules_config, config)
		elseif part == "proxy" then
			stat = pod_clash.parse_proxies(proxies_config, config)
		elseif part == "rule_provider" then
			stat = pod_clash.parse_rule_providers(rules_config, config)
		elseif part == "proxy_group" then
			stat = pod_clash.parse_proxy_groups(proxies_config, config)
		elseif part == "all" then
			local config_name = luci.http.formvalue("config_name")
			if config_name then
				stat = pod_clash.new_config(config_name, config)
			else
				stat = false
			end
		else
			stat = false
		end
	else
		stat = false
	end
	if stat then
		luci.http.status(200, "OK")
		return 
	else
		luci.http.status(400, "fail")
	end
end

function import_rule_provider()
	local filename = luci.http.formvalue("upload-filename")
	local fp
	local filepath = "/tmp/" .. filename

	luci.http.setfilehandler(
		function(meta, chunk, eof)
			if not fp and meta and meta.name == "upload-archive" then
				fp = io.open(filepath, "w")
			end
			if fp and chunk then
				fp:write(chunk)
			end
			if fp and eof then
				fp:close()
			end
		end
	)

	local s_name = luci.model.uci:section(rules_config, "rule_provider", nil, {
		enable = "true",
		name = filename:match("(.-).%w+$"),
		type = "file",
		behavior = "classic",
		path = "/tmp/".. filename
	})
	if s_name and luci.model.uci:save(rules_config) then
		luci.http.status(200, "OK")
			return 
	else
		luci.http.status(400, "fail")
	end
end

function import_proxy_provider()
	local filename = luci.http.formvalue("upload-filename")
	local fp
	local filepath = "/tmp/" .. filename

	luci.http.setfilehandler(
		function(meta, chunk, eof)
			if not fp and meta and meta.name == "upload-archive" then
				fp = io.open(filepath, "w")
			end
			if fp and chunk then
				fp:write(chunk)
			end
			if fp and eof then
				fp:close()
			end
		end
	)

	local s_name = luci.model.uci:section("pod_clash_proxies", "proxy", nil, {
		enable = "true",
		type = "proxy_provider",
		name = filename:match("(.-).%w+$"),
		provider_type = "file",
		provider_path = "/tmp/".. filename,
		server = "/tmp/".. filename,
		provider_health_check = "true",
		provider_health_check_url = "http://www.gstatic.com/generate_204",
		provider_health_check_interval = "300"
	})
	if s_name and luci.model.uci:save("pod_clash_proxies") then
		luci.http.status(200, "OK")
			return 
	else
		luci.http.status(400, "fail")
	end
end