local m, s, o
local sid = arg[1]
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local proxies_config = "pod_clash_proxies_" .. config_file
local general_config = "pod_clash_" .. config_file

local proxy_types = {
	vmess = "Vmess",
	ss = "Shadowsocks",
	ssr = "ShadowsocksR",
	socks5 = "Socks5",
	http = "Http",
	snell = "Snell",
	trojan = "Trojan"
	}

local ss_ciphers = {
	"aes-128-gcm", "aes-192-gcm", "aes-256-gcm", "aes-128-cfb", 
	"aes-192-cfb", "aes-256-cfb", "aes-128-ctr", "aes-192-ctr", 
	"aes-256-ctr", "rc4-md5", "chacha20-ietf", "xchacha20", 
	"chacha20-ietf-poly1305", "xchacha20-ietf-poly1305"
}

local ss_plugins = {
	"none", "obfs", "v2ray-plugin"
}

local ssr_ciphers = {
	"aes-128-cfb", "aes-192-cfb", "aes-256-cfb", 
	"aes-128-ctr", "aes-192-ctr", "aes-256-ctr", 
	"rc4-md5", "chacha20-ietf", "xchacha20"
}

local ss_obfses = {
	"plain", "http_simple", "http_post", "random_head", 
	"tls1.2_ticket_auth", "tls1.2_ticket_fastauth"
}

local ss_protocols = {
	"origin", "auth_sha1_v4", "auth_aes128_md5", 
	"auth_aes128_sha1", "auth_chain_a", "auth_chain_b"
}

m = Map(proxies_config)
m.redirect = luci.dispatcher.build_url("admin/services/pod_clash/proxies")
if m.uci:get(proxies_config, sid) ~= "proxy" then
	luci.http.redirect(m.redirect) 
	return
end
s = m:section(NamedSection, sid, "proxy")

-- common: name, type, server, port 
	o = s:option(Value, "name", translate("Name"))
	o.rmempty = false
	o.validate = function(self, value, sid)
		local _section
		local e = 0
		m.uci:foreach(proxies_config, "proxy",
			function(_section)
				if _section[".name"]  ~= sid then
					local n = m.uci:get(proxies_config, _section[".name"], "name")
					if n == value then
						e = 1
					end
				end
			end)
	
		if e == 1 then 
			return nil, translate("Invalid PROXY NAME! Duplicate with an existing proxy!")
		end
		m.uci:foreach(proxies_config, "proxy_group",
			function(_section)
					local n = m.uci:get(proxies_config, _section[".name"], "name")
					if n == value then
						e = 2
					end
			end)
		if e == 2 then 
			return false, translate("Invalid PROXY NAME! Duplicate with an existing proxy group!")
		end
		return value
	end

	local o_type = s:option(ListValue, "type", translate("Type"))
	for type in pairs(proxy_types) do
		o_type:value(type, proxy_types[type])
	end
	o_type:value("proxy_provider", "Proxy Provider")

	o = s:option(Value, "server", translate("Server"))
	o.placeholder = "your.proxy.server"
	o.rmempty = true
	for type in pairs(proxy_types) do
		o:depends("type", type)
	end

	o = s:option(Value, "port", translate("Port"))
	o.placeholder = 443
	o.rmempty = false
	for type in pairs(proxy_types) do
		o:depends("type", type)
	end

	o = s:option(Flag, "udp", translate("UDP"))
	o.rmempty = false
	o.disabled = "false"
	o.enabled = "true"
	o:depends("type", "vmess")
	o:depends("type", "socks5")
	o:depends("type", "ssr")
	o:depends("type", "ss")
	
-- proxy provider
	local o_provider_type = s:option(ListValue, "provider_type", translate("Provider type"))
	o_provider_type:depends("type", "proxy_provider")
	o_provider_type.default = "http"
	o_provider_type:value("http", "HTTP")
	o_provider_type:value("file", "file")

	local o_provider_path = s:option(Value, "provider_path", translate("Path"))
	o_provider_path.rmempty = false
	o_provider_path:depends("type", "proxy_provider")

	local o_provider_url = s:option(Value, "provider_url", translate("URL"))
	o_provider_url.rmempty = false
	o_provider_url:depends("provider_type", "http")

	o = s:option(Value, "provider_interval", translate("Interval"))
	o.rmempty = false
	o:depends("provider_type", "http")
	o.default = 3600
	o.placeholder = 3600

	o = s:option(Flag, "provider_health_check", translate("Health check"))
	o:depends("type", "proxy_provider")
	o.default = "true"
	o.disabled = "false"
	o.enabled = "true"
	o.rmempty = false

	o = s:option(Value, "provider_health_check_url", translate("Health check URL"))
	o.rmempty = false
	o:depends("provider_health_check", "true")
	o.default = "http://www.gstatic.com/generate_204"
	o.placeholder = "http://www.gstatic.com/generate_204"

	o = s:option(Value, "provider_health_check_interval", translate("Health check interval"))
	o.rmempty = false
	o:depends("provider_health_check", "true")
	o.default = 300

	local o_provider_include = s:option(Value, "provider_include", translate("Include"), translate("Keep only the matches, support regular expression"))
	o_provider_include.placeholder = "(香港|HK|JP|KR|GIA|IPLC)"
	o_provider_include:depends("provider_type", "http")

	local o_provider_exclude = s:option(Value, "provider_exclude", translate("Exclude"), translate("Exclude the matches, support regular expression"))
	o_provider_exclude.default = "(流量|时间|官网|产品)"
	o_provider_exclude.placeholder = "(流量|时间|官网|产品)"
	o_provider_exclude:depends("provider_type", "http")

-- vmess
	o = s:option(Value, "vmess_uuid", translate("UUID"))
	o.rmempty = false
	o:depends("type", "vmess")
	o.validate = function(self, value, section)
		if not value:match("%x-%-%x-%-%x-%-%x-%-%x+") then
			return nil, "Invailid UUID"
		end
		return value
	end

	o = s:option(Value, "vmess_alter_id", translate("Alter ID"))
	o.rmempty = false
	o.placeholder = 0
	o:depends("type", "vmess")

	o = s:option(ListValue, "vmess_cipher", translate("Cipher"))
	o:depends("type", "vmess")
	o.rmempty = false
	o:value("auto", "auto")
	o:value("aes-128-gcm", "aes-128-gcm")
	o:value("chacha20-poly1305 ", "chacha20-poly1305 ")
	o:value("none", "none")

	o = s:option(ListValue, "vmess_network", translate("network"))
	o:value("none", "none")
	o:value("ws", "ws")
	o:value("http", "HTTP")
	o:depends("type", "vmess")

	o = s:option(Value, "vmess_path", translate("Path"))
	o.placeholder = "/path"
	o:depends("vmess_network", "ws")
	o:depends("vmess_network", "http")

	o = s:option(Value, "vmess_host", translate("Host"))
	o.placeholder = "v2ray.com"
	o:depends("vmess_network", "ws")
	-- o:depends("vmess_network", "http")

	o = s:option(Flag, "vmess_keep_alive", translate("Keep alive"))
	o:depends("vmess_network", "http")
	o.disabled = "false"
	o.enabled = "true"
	o.rmempty = false

-- ss
	o = s:option(ListValue, "ss_cipher", translate("Cipher"))
	o:depends("type", "ss")
	o.rmempty = false
	for _, v in ipairs(ss_ciphers) do
		o:value(v, v)
	end

	o = s:option(Value, "ss_password", translate("Password"))
	o:depends("type", "ss")
	o.password = true

	o = s:option(ListValue, "ss_plugin", translate("Plugin"))
	o:depends("type", "ss")
	for _, v in ipairs(ss_plugins) do
		o:value(v, v)
	end

	o = s:option(ListValue, "ss_mode", translate("Mode"))
	o:depends("ss_plugin", "obfs")
	o:depends("ss_plugin", "v2ray-plugin")
	o:value("tls", "tls")
	o:value("http", "http")
	o:value("websocket", "websocket")

	o = s:option(Value, "ss_host", translate("Host"))
	o.placeholder = "www.v2ray.com"
	o:depends("ss_plugin", "obfs")
	o:depends("ss_plugin", "v2ray-plugin")

	o = s:option(Value, "ss_path", translate("Path"))
	o.placeholder = "/path"
	o:depends("ss_mode", "websocket")

	o = s:option(Value, "ss_header", translate("Header"))
	o:depends("ss_mode", "websocket")

-- ssr

	o = s:option(ListValue, "ssr_cipher", translate("Cipher"))
	o:depends("type", "ssr")
	o.rmempty = false
	for _, v in ipairs(ssr_ciphers) do
		o:value(v, v)
	end

	o = s:option(Value, "ssr_password", translate("Password"))
	o.password = true
	o:depends("type", "ssr")

	o = s:option(ListValue, "ssr_obfs", translate("Obfs"))
	o:depends("type", "ssr")
	for _, v in ipairs(ss_obfses) do
		o:value(v, v)
	end

	o = s:option(Value, "ssr_obfs_param", translate("Obfs param"))
	o:depends("type", "ssr")

	o = s:option(ListValue, "ssr_protocol", translate("Protocol"))
	o:depends("type", "ssr")
	for _, v in ipairs(ss_protocols) do
		o:value(v, v)
	end

	o = s:option(Value, "ssr_protocol_param", translate("Protocol param"))
	o:depends("type", "ssr")

-- snell
	o = s:option(Value, "snell_psk", translate("PSK"))
	o.password = true
	o:depends("type", "snell")

	o = s:option(ListValue, "snell_mode", translate("Mode"))
	o:depends("type", "snell")
	o:value("http", "http")
	o:value("tls", "tls")

	o = s:option(Value, "snell_host", translate("Host"))
	o:depends("type", "snell")

-- trojan
	o = s:option(Value, "trojan_password", translate("Password"))
	o.password = true
	o:depends("type", "trojan")

	o = s:option(ListValue, "trojan_sni", translate("Server name"))
	o:depends("type", "trojan")
	o.placeholder = "example.com"

	o = s:option(DynamicList, "trojan_alpn", translate("ALPN"))
	o:depends("type", "trojan")
	o:value("h2", "h2")
	o:value("http/1.1", "http/1.1")

-- http/socks5
	o = s:option(Value, "username", translate("Username"))
	o:depends("type", "http")
	o:depends("type", "socks5")

	o = s:option(Value, "password", translate("Password"))
	o.password = true
	o:depends("type", "http")
	o:depends("type", "socks5")

-- common: tls, skip_cert_verify
	o = s:option(Flag, "tls", translate("TLS"))
	o:depends("type", "vmess")
	o:depends("type", "trojan")
	o:depends("type", "http")
	o:depends("type", "socks5")
	o:depends("ss_mode", "websocket")
	o.disabled = "false"
	o.enabled = "true"
	o.rmempty = false

	o = s:option(Flag, "skip_cert_verify", translate("Skip cert verify"))
	o.disabled = "false"
	o.enabled = "true"
	o:depends("tls", "true")
	o.rmempty = false

m.on_before_save = function(self)
	-- handle proxy provider URL
	local subconverter_base_url = m.uci:get(global_config, golbal, "subconverter_base_url") or "http://127.0.0.1:25500/sub?"
	local p_url = o_provider_url:formvalue(sid)
	if o_type:formvalue(sid) =="proxy_provider" then
		local provider_type = o_provider_type:formvalue(sid)
		if p_url and provider_type == "http" then
			
			local n_url_table = {
				target = "clash", 
				list = "true",
				include = o_provider_include:formvalue(sid) or nil,
				exclude = o_provider_exclude:formvalue(sid) or nil
			}
			local url_table = luci.http.urldecode_params(p_url)

			local n_p_url
			if url_table.target == "clash" and url_table.list == "true" then
				n_p_url = subconverter_base_url .. luci.http.urlencode_params(n_url_table) .. "&url=".. luci.http.urlencode(url_table.url)
			else
				n_p_url = subconverter_base_url .. luci.http.urlencode_params(n_url_table) .. "&url=".. luci.http.urlencode(p_url)
			end
			m.uci:set(proxies_config, sid, "server", n_p_url)
			m.uci:set(proxies_config, sid, "provider_url", n_p_url)
		elseif provider_type == "file" then
			m.uci:set(proxies_config, sid, "server", o_provider_path:formvalue(sid))
		end
	end
	m.uci:set(proxies_config, sid, "enable", "true")
end

return m