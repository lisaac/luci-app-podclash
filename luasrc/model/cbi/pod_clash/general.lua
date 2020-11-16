
local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local general_config = "pod_clash_general_" .. config_file

m = Map(general_config, translate("Clash Config") .. ": " .. config_file )
s = m:section(NamedSection, "general", "clash", translate("General Settings"))

o = s:option(ListValue, "mode", translate("Running Mode"))
o:value("rule", translate("Rule"))
o:value("global", translate("Global"))
o:value("direct", translate("Direct"))
o:value("script", translate("Script"))

local allow_lan = s:option(Flag, "allow_lan", translate("Allow Lan"), translate("Allow HTTP or SOCKS5 proxy"))
allow_lan.rmempty = false
allow_lan.disabled = "false"
allow_lan.enabled = "true"

o = s:option(Value, "socks_port", translate("Port of Socks"))
o.placeholder = "7890"
o:depends("allow_lan", "true")

o = s:option(Value, "port", translate("Port of HTTP"))
o.placeholder = "7891"
o:depends("allow_lan", "true")

o = s:option(Value, "mixed_port", translate("Port of HTTP&SOCKS5"))
o.placeholder = "7893"
o:depends("allow_lan", "true")

o = s:option(DynamicList, "authentication", translate("Authentication"), translate("Authentication of local SOCKS5/HTTP(S) server"))
o.placeholder = "user1:pass1"
o:depends("allow_lan", "true")

o = s:option(Value, "external_controller", translate("External Controller"), translate("Control clash from outside with RESTful API"))
o.placeholder = "0.0.0.0:9090"
o = s:option(Value, "secret", translate("Secret"), translate("Secret for RESTful API"))
o.password = true
o.placeholder = "mypass"

o = s:option(ListValue, "log_level", translate("Log level"))
o:value("silent", "Silent")
o:value("error", "Error")
o:value("warning", "Warning")
o:value("info", "Info")
o:value("debug", "Debug")

return m
