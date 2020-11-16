local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local proxies_config = "pod_clash_proxies_" .. config_file
local general_config = "pod_clash_" .. config_file

local proxy_types = {
	vmess = "[Vmess] ",
	ss = "[Shadowsocks] ",
	ssr = "[ShadowsocksR] ",
	socks5 = "[Socks5] ",
	http = "[Http] ",
	snell = "[Snell] ",
	trojan = "[Trojan] ",
	proxy_provider = "[Provider] "
	}

m = Map(proxies_config, translate("Clash Config") .. ": " .. config_file)

-- proxies
s = m:section(TypedSection, "proxy", translate("Proxies"))
s.anonymous = true
s.addremove = true
s.template = "pod_clash/cbi/tblsection"
s.has_provider = true

s.parse = function(self, ...)
	TypedSection.parse(self, ...)
	local REMOVE_ALL_PREFIX = "cbi.rats."

	local crval = REMOVE_ALL_PREFIX .. self.config .. "." .. self.sectiontype
	if next(self.map:formvaluetable(crval)) then
		self.map.uci:delete_all(proxies_config, "proxy")
	end
end

s.extedit = luci.dispatcher.build_url("admin/services/pod_clash/newproxy/%s")
s.create = function(...)
	local sid = TypedSection.create(...)
	if sid then
		luci.http.redirect(luci.dispatcher.build_url("admin/services/pod_clash/newproxy/"..sid))
		return
	end
end

o = s:option(Flag, "enable", translate("Enable"))
o.rmempty = false
-- o.default = "true"
o.disabled = "false"
o.enabled = "true"

o = s:option(DummyValue, "name", translate("Name"))
o = s:option(DummyValue, "type", translate("Type"))
o = s:option(DummyValue, "server", translate("Server"))
o.template = "pod_clash/cbi/dvalue"
o.rawhtml = true

o = s:option(DummyValue, "port", translate("Port"))
o = s:option(DummyValue, "status", translate("Status"))

-- proxy groups
s = m:section(TypedSection, "proxy_group", translate("Proxy Groups"))
s.anonymous = true
s.addremove = true
s.template = "pod_clash/cbi/tblsection"

s.parse = function(self, ...)
	TypedSection.parse(self, ...)
	local REMOVE_ALL_PREFIX = "cbi.rats."

	local crval = REMOVE_ALL_PREFIX .. self.config .. "." .. self.sectiontype
	if next(self.map:formvaluetable(crval)) then
		self.map.uci:delete_all(proxies_config, "proxy_group")
	end
end

o = s:option(Flag, "enable", translate("Enable"))
o.rmempty = false
-- o.default = "true"
o.disabled = "false"
o.enabled = "true"

o = s:option(Value, "name", translate("Name"))
o.width = 100
-- o.rmempty = false
o.validate = function(self, value, sid)
	local _section
	local e = 0
	m.uci:foreach(proxies_config, "proxy",
		function(_section)
			local n = m.uci:get(proxies_config, _section[".name"], "name")
			if n == value then
				e = 1
			end
		end)

	if e == 1 then 
		return nil, translate("Invalid PROXY GROUP NAME! Duplicate with an existing proxy!")
	end
	m.uci:foreach(proxies_config, "proxy_group",
		function(_section)
			if _section[".name"]  ~= sid then
				local n = m.uci:get(proxies_config, _section[".name"], "name")
				if n == value then
					e = 2
				end
			end
		end)
	if e == 2 then 
		return false, translate("Invalid PROXY GROUP NAME! Duplicate with an existing proxy group!")
	end
	return value
end

local o_type = s:option(ListValue, "type", translate("Type"))
o_type.rmempty = false
o_type:value("select", translate("Select"))
o_type:value("url-test", translate("URL Test"))
o_type:value("fallback", translate("Fallback"))
o_type:value("load-balance", translate("Load Balance"))
o_type:value("relay", translate("Proxy Chains"))
o_type.width = 100

local o_proxies_name = s:option(DynamicList, "proxies_name", translate("Proxies"))
o_proxies_name.width = 200
m.uci:foreach(proxies_config, "proxy",
	function(i)
		local t = m.uci:get(proxies_config, i[".name"], "type")
		if not t then return end
		o_proxies_name:value(i.name, proxy_types[t] .. i.name)
	end)
m.uci:foreach(proxies_config, "proxy_group",
	function(i)
		local t = m.uci:get(proxies_config, i[".name"], "type")
		if not t then return end
		o_proxies_name:value(i.name, i.name)
	end)

-- clear duplicate proxyies_name
o_proxies_name.validate = function(self, value, sid)
	-- if not self.section.changed then
	-- 	return value
	-- end
	local k, v
	local val = {}
	local val2 = {}
	if type(value) ~= "table" then
		return
	end
	for k, v in pairs(value) do
		val[v] = v
	end
	for k, v in pairs(val) do
		table.insert(val2, k)
	end
	if #val2 ~= #value then
		return val2
	end
	return value
end

o = s:option(Value, "url", translate("URL"))
o.placeholder = "http://www.gstatic.com/generate_204"

o = s:option(Value, "interval", translate("Interval (s)"))
o.placeholder = "300"
o.width = 10

o = s:option(Value, "tolerance", translate("Tolerance (ms)"))
o.placeholder = "0"
o.width = 10

-- o_type.validate = function(self, value, sid)
-- 	if value == "select"  then
-- 		return value
-- 	end

-- 	local proxies_name = o_proxies_name:formvalue(sid)
-- 	local proxies_type_info = {}
-- 	-- { proxy1: "ssr", proxy2: "proxy_provider"}
-- 	m.uci:foreach(proxies_config, "proxy",
-- 		function(_section)
-- 			local n = m.uci:get(proxies_config, _section[".name"], "name")
-- 			if not n then return end
-- 			proxies_type_info[n] = m.uci:get(proxies_config, _section[".name"], "type")
-- 		end)

-- 	if proxies_name then
-- 		for _, proxy_name in ipairs(proxies_name) do
-- 			if proxies_type_info[proxy_name] == "proxy_provider" then
-- 				return nil, proxy_name .. ": ".. translate("combine use Providers and Proxies in Proxy Group, only support SELECT type rule!")
-- 			end 
-- 		end
-- 	end
-- 	return value
-- end

m.on_before_save = function(self)
	local _section
	local formvalue_info = luci.http.formvaluetable("cbid."..proxies_config)
	local proxies_info_list = {}
	-- simple valid check proxy
	m.uci:foreach(proxies_config, "proxy",
		function(_section)
			local e = formvalue_info[_section[".name"]..".enable"] or m.uci:get(proxies_config, _section[".name"], "enable")
			if e ~= "true" then return end
			local n = m.uci:get(proxies_config, _section[".name"], "name")
			local t = m.uci:get(proxies_config, _section[".name"], "type")
			local s = m.uci:get(proxies_config, _section[".name"], "server")
			local p = m.uci:get(proxies_config, _section[".name"], "port")
			if not n or not t or not s or (not p and t ~= "proxy_provider") then
				m.uci:set(proxies_config, _section[".name"], "enable", "false")
				m.message = translate("Some Porxy(s) had been DISABLED, due INVALID NAME or TYPE or SERVER or PORT")
				return
			end
			proxies_info_list[n] = {
				enable = e,
				type = t,
				server = s,
				port = p
			}
		end)

	local proxy_group_info_list = {}
	m.uci:foreach(proxies_config, "proxy_group",
		function(_section)
			local e = formvalue_info[_section[".name"]..".enable"] or m.uci:get(proxies_config, _section[".name"], "enable")
			local n = m.uci:get(proxies_config, _section[".name"], "name")
			proxy_group_info_list[n] = {
				enable = e
			}
		end)

	for k, v in pairs(formvalue_info) do
		local proxy_group_sid = k:match("(.-).proxies_name$")
		if proxy_group_sid and formvalue_info[proxy_group_sid..".enable"] == "true" then

			local proxy_group_name = formvalue_info[proxy_group_sid..".name"]
			local proxy_group_type = formvalue_info[proxy_group_sid..".type"]
			local proxies_name = o_proxies_name:formvalue(proxy_group_sid)
			local proxy_name
			local providers_list = {}
			local proxies_list = {}
			if not proxy_group_name or proxy_group_name == "" then
				m.uci:set(proxies_config, proxy_group_sid, "enable", "false")
				m.message = translate("Some PROXY GROUP(s) had been DISABLED, due NO NAME")
			elseif proxy_group_type == "url-test" or
					proxy_group_type == "fallback" or
					proxy_group_type == "load-balance" then
					local proxy_group_url = formvalue_info[proxy_group_sid..".url"]
					local proxy_group_interval = formvalue_info[proxy_group_sid..".interval"]
					if not proxy_group_url or not proxy_group_interval or proxy_group_interval == "" or proxy_group_url == "" then
						m.uci:set(proxies_config, proxy_group_sid, "enable", "false")
						m.message = translate("Some PROXY GROUP(s) had been DISABLED, due NO INTERVAL or NO URL")
					end
			end

			-- handle proxy provider for groups
				for _, proxy_name in ipairs(proxies_name) do
					
					if proxies_info_list[proxy_name] and proxies_info_list[proxy_name].enable == "true" then
						-- proxies or proxy_provider
						if proxies_info_list[proxy_name].type == "proxy_provider" then
							table.insert(providers_list, proxy_name)
						else
							table.insert(proxies_list, proxy_name)
						end
					elseif proxy_name == "DIRECT" or proxy_name == "REJECT" then
						-- others
						table.insert(proxies_list, proxy_name)
					elseif proxy_name ~= proxy_group_name then
						-- groups in group, exclude self
						if proxy_group_info_list[proxy_name] and proxy_group_info_list[proxy_name].enable == "true" then
							table.insert(proxies_list, proxy_name)
						end
					end
				end
				if next(providers_list) ~= nil then
					m.uci:set(proxies_config, proxy_group_sid, "proxy_providers", providers_list)
				else
					m.uci:delete(proxies_config, proxy_group_sid, "proxy_providers")
				end
				if next(proxies_list) ~= nil then
					m.uci:set(proxies_config, proxy_group_sid, "proxies", proxies_list)
				else
					m.uci:delete(proxies_config, proxy_group_sid, "proxies")
				end

				if next(providers_list) == nil and next(proxies_list) == nil then
					m.uci:set(proxies_config, proxy_group_sid, "enable", "false")
					m.message = translate("Some PROXY GROUP(s) had been DISABLED, due INVALID PROXIES")
				end
		end
	end
end

return m