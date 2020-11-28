local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local rules_config   = "pod_clash_rules_" .. config_file
local proxies_config = "pod_clash_proxies_" .. config_file

m = Map(rules_config, translate("Clash Config") .. ": " .. config_file)

function get_info_list()
	local rule_provider_info_list = {}
	local rule_info_list = {}
	local formvalue_info = luci.http.formvaluetable("cbid."..rules_config)

	-- if page submited, we can get formdata by formvaluetable
	if next(formvalue_info) ~= nil then
		local k, v
		for k, v in pairs(formvalue_info) do
			-- rule provider has name
			local rule_provider_sid = k:match("(.-).name$")
			-- rule has rule_type
			local rule_sid = k:match("(.-).rule_type$")
			if rule_provider_sid then
				rule_provider_info_list[v] = {
					section  = rule_provider_sid,
					enable   = formvalue_info[rule_provider_sid..".enable"],
					type     = formvalue_info[rule_provider_sid..".type"],
					behavior = formvalue_info[rule_provider_sid..".behavior"],
					path     = formvalue_info[rule_provider_sid..".path"],
					url      = formvalue_info[rule_provider_sid..".url"],
					interval = formvalue_info[rule_provider_sid..".interval"]
				}
			elseif rule_sid then
				table.insert(rule_info_list,{
					section  = rule_sid,
					rule_type = v,
					enable = formvalue_info[rule_sid..".enable"],
					matcher = formvalue_info[rule_sid..".matcher"],
					proxies = formvalue_info[rule_sid..".proxies"],
				})
			end
		end
	else
		-- need not get rules config, since it's not a submited page
		-- we only need rule_provider_list, use for add value on rule matchers list
		m.uci:foreach(rules_config, "rule_provider",
			function(_section)
				local n = m.uci:get(rules_config, _section[".name"], "name")
				if not n then return end
				rule_provider_info_list[n] = {
					enable = m.uci:get(rules_config, _section[".name"], "enable")
				}
			end)
	end
	return rule_provider_info_list, rule_info_list
end

local rule_provider_info_list, rule_info_list = get_info_list()


-- rule provider
s = m:section(TypedSection, "rule_provider", translate("Rule Providers"))
s.anonymous = true
s.addremove = true
s.template = "pod_clash/cbi/tblsection"
s.has_provider = true

s.parse = function(self, ...)
	TypedSection.parse(self, ...)
	local REMOVE_ALL_PREFIX = "cbi.rats."

	local crval = REMOVE_ALL_PREFIX .. self.config .. "." .. self.sectiontype
	if next(self.map:formvaluetable(crval)) then
		self.map.uci:delete_all(rules_config, "rule_provider")
	end
end

o = s:option(Flag, "enable", translate("Enable"))
o.rmempty = false
-- o.default = "true"
o.disabled = "false"
o.enabled = "true"

o = s:option(Value, "name", translate("Name"))
-- o.rmempty = false
o.width = 100
o.validate = function(self, value, sid)
	if not self.section.changed then
		return value
	end
	local _section
	local e = 0
	m.uci:foreach(rules_config, "rule_provider",
		function(_section)
			if _section[".name"]  ~= sid then
				local n = m.uci:get(rules_config, _section[".name"], "name")
				if n == value then
					e = 1
				end
			end
		end)

	if e == 1 then 
		return nil, translate("Invalid RULE PROVIDER NAME! Duplicate with an existing proxy!")
	end
	return value
end

o = s:option(ListValue, "type", translate("Type"))
-- o.rmempty = false
o.default = "http"
o:value("http", translate("HTTP"))
o:value("file", translate("File"))
o.width = 100

o = s:option(ListValue, "behavior", translate("Behavior"))
-- o.rmempty = false
o.width = 100
o.default = "classical"
o:value("classical", translate("Classical"))
o:value("domain", translate("Domain"))
o:value("ipcidr", translate("IPcidr"))

o = s:option(Value, "path", translate("Path"))
-- o.rmempty = false
o = s:option(Value, "url", translate("URL"))
-- o.rmempty = false

o = s:option(Value, "interval", translate("Interval(s)"))
-- o.rmempty = false
o.default = 86400
o.width = 10

-- rule
s = m:section(TypedSection, "rule", translate("Rules"))
s.addremove = true
s.anonymous = true
s.sortable = true
s.template = "pod_clash/cbi/tblsection"
s.sp_addremove = true

s.parse = function(self, ...)
	TypedSection.parse(self, ...)
	local REMOVE_ALL_PREFIX = "cbi.rats."
	local CREATE_TOP_PREFIX = "cbi.tcts."

	-- remove all
	local crval = REMOVE_ALL_PREFIX .. self.config .. "." .. self.sectiontype
	if next(self.map:formvaluetable(crval)) then
		self.map.uci:delete_all(rules_config, "rule")
	end

	-- add on top and add on bottom
	if self.sp_addremove then
		-- Create
		local created
		local crval = CREATE_TOP_PREFIX .. self.config .. "." .. self.sectiontype
		local origin, name = next(self.map:formvaluetable(crval))
		if self.anonymous then
			if name then
				created = self:create(nil, origin)
				luci.model.uci:reorder(rules_config, created, 1)
			end
		else
			if name then
				-- Ignore if it already exists
				if self:cfgvalue(name) then
					name = nil;
				end

				name = self:checkscope(name)

				if not name then
					self.err_invalid = true
				end

				if name and #name > 0 then
					created = self:create(name, origin) and name
					if not created then
						self.invalid_cts = true
					end
				end
			end
		end

		if created then
			AbstractSection.parse_optionals(self, created)
		end
	end
end

o = s:option(Flag, "enable", translate("Enable"))
-- o.default = "true"
o.rmempty = false
o.disabled = "false"
o.enabled = "true"

o = s:option(Value, "rule_type", translate("Rule Type"))
o.width = 200
-- o.rmempty = false
o.default = "DOMAIN"
o:value("RULE-SET", translate("RULE-SET"))
o:value("DOMAIN-SUFFIX", translate("DOMAIN-SUFFIX"))
o:value("DOMAIN-KEYWORD", translate("DOMAIN-KEYWORD"))
o:value("DOMAIN", translate("DOMAIN"))
o:value("SRC-IP-CIDR", translate("SRC-IP-CIDR"))
o:value("IP-CIDR", translate("IP-CIDR"))
o:value("IP-CIDR6", translate("IP-CIDR6"))
o:value("GEOIP", translate("GEOIP"))
o:value("DST-PORT", translate("DST-PORT"))
o:value("SRT-PORT", translate("SRT-PORT"))
o:value("MATCH", translate("MATCH"))

o = s:option(Value, "matcher", translate("Matcher"))
-- o.rmempty = false

for k in pairs(rule_provider_info_list) do
	o:value(k, k)
end
o:value("CN", "CN")

o = s:option(Value, "proxies", translate("Proxies (Groups)"))
-- o.rmempty = false
o:value("DIRECT", translate("DIRECT"))
o:value("REJECT", translate("REJECT"))
m.uci:foreach(proxies_config, "proxy_group",
	function(i)
		if i.name then
			o:value(i.name, "[GROUP] "..i.name)
		end
	end)
m.uci:foreach(proxies_config, "proxy",
	function(i)
		if i.name then
			o:value(i.name, "[PROXY] "..i.name)
		end
	end)
o.width = 200

m.on_before_save = function(self)
	-- on before save only trigger while the page submited, 
	-- so rule_provider_info_list and rule_info_list have more info then not submited page.

	local _section, k, v

	-- validate the rule provider and disable it
	for k, v in pairs(rule_provider_info_list) do
		if v.enable == "true" then
			if v.type == "http" and
				(not v.path or v.path == "" or 
				not v.url or v.url == "" or
				not v.interval or v.interval == "") then
					m.uci:set(rules_config, v.section, "enable", "false")
					m.message = translate("Some RULE PROVIDER(s) had been DISABLED, due no URL or PATH or INTERVAL")
			elseif not v.path or v.path == "" then
					m.uci:set(rules_config, v.section, "enable", "false")
					m.message = translate("Some RULE PROVIDER(s) had been DISABLED, due no PATH")
			end
		end
	end

	-- validate the rules, disable the rules while the proxies is disabled or matcher is disabled
	for k, v in ipairs(rule_info_list) do
		if v.enable == "true" then
			if not v.rule_type or v.rule_type == "" or not v.matcher or v.matcher == "" or not v.proxies or v.proxies == "" then
				m.uci:set(rules_config, v.section, "enable", "false")
				m.message = translate("Some RULE(s) had been DISABLED, due no TYPE or no MATCHER or no PROXY")
			else
				-- filter enabled matcher(rules provider) && validate matcher
				if v.rule_type == "RULE-SET" then
					if not rule_provider_info_list[v.matcher] or rule_provider_info_list[v.matcher]["enable"] ~= "true" then
						-- no rule provider or rule provider set this rule to disabled
						m.uci:set(rules_config, v.section, "enable", "false")
						m.message = translate("Some RULE(s) had been DISABLED, due disabled rule provider or no rule provider")
					end
				elseif v.rule_type == "DST-PORT" or v.rule_type == "SRC-PORT" then
					if not v.matcher:match("^%d+$") then
						m.uci:set(rules_config, v.section, "enable", "false")
						m.message = translate("Some RULE(s) had been DISABLED, due invalid PORT matcher")
					end
				elseif v.rule_type == "SRC-IP-CIDR" or v.rule_type == "IP-CIDR" then
					local ip = luci.ip.new(v.matcher)
					if not ip or not ip:is4() then
						m.uci:set(rules_config, v.section, "enable", "false")
						m.message = translate("Some RULE(s) had been DISABLED, due invalid IP-CIDR matcher")
					end
				elseif v.rule_type == "IP-CIDR6" then
					local ip = luci.ip.new(v.matcher)
					if not ip or not ip:is6() then
						m.uci:set(rules_config, v.section, "enable", "false")
						m.message = translate("Some RULE(s) had been DISABLED, due invalid IP-CIDR6 matcher")
					end
				end

				-- if there is no proxies or disabled proxies, then disable the rule
				local proxies_info_list = {}
				m.uci:foreach(proxies_config, "proxy_group",
					function(_section)
						local n = m.uci:get(proxies_config, _section[".name"], "name")
						local e = m.uci:get(proxies_config, _section[".name"], "enable")
						if not n or not e or e ~= "true" then return end
						proxies_info_list[n] = e
					end)
				m.uci:foreach(proxies_config, "proxy",
					function(_section)
						local n = m.uci:get(proxies_config, _section[".name"], "name")
						local e = m.uci:get(proxies_config, _section[".name"], "enable")
						if not n or not e or e ~= "true" then return end
						proxies_info_list[n] = e
				end)
				if v.proxies ~= "REJECT" and v.proxies ~= "DIRECT" and not proxies_info_list[v.proxies] then
					m.uci:set(rules_config, v.section, "enable", "false")
					m.message = translate("Some RULE(s) had been DISABLED, due INVALID PROXIES")
				end

			end
		end
	end
end

return m