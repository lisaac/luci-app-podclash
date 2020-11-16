local _clash = {}
local global_config = "pod_clash"
local uci = require "luci.model.uci"
local syaml = require "luci.model.syaml"

-- {x:x,y:y}
_clash.get_enabled_name_list = function(config, seciton_type)
  local _section
  local name_list = {}
  uci:foreach(config, seciton_type, function(_section)
    if uci:get(config, _section[".name"], "enable") == "true" then
      name_list[uci:get(config, _section[".name"], "name")] = _section[".name"]
    end
  end)
  return name_list
end

_clash.parse_general = function(general_config, general_table)
  local stat = true
  uci:set(general_config, "general", "mode", general_table["mode"] or "rule")
  uci:set(general_config, "general", "allow_lan", general_table["allow-lan"] and "true" or "false")
  uci:set(general_config, "general", "port", general_table["port"] or "7890")
  uci:set(general_config, "general", "redir_port", general_table["redir-port"] or "7892")
  uci:set(general_config, "general", "socks_port", general_table["socks-port"] or "7891")
  uci:set(general_config, "general", "mixed_port", general_table["mixed-port"] or "7893")
  uci:set(general_config, "general", "external_controller", general_table["external-controller"] or "0.0.0.0:9090")
  uci:set(general_config, "general", "secret", general_table["secret"] or "mypass")
  uci:set(general_config, "general", "log_level", general_table["log-level"] or "info")
  uci:set(general_config, "general", "authentication", general_table["authentication"] or {'user1:pass1'})
  return stat
end

_clash.parse_dns = function(dns_config, dns_table)
  local stat = true
  uci:set(dns_config, "dns", "enhanced_mode", dns_table["enhanced-mode"] or "redir-host")
  uci:set(dns_config, "dns", "use_hosts", dns_table["use-hosts"] and "true" or "false")
  uci:set(dns_config, "dns", "ipv6", dns_table["ipv6"] and "true" or "false")
  uci:set(dns_config, "dns", "default_nameserver", dns_table["default-nameserver"] or {'114.114.114.114'})
  uci:set(dns_config, "dns", "fake_ip_range", dns_table["fake-ip-range"] or '198.18.0.1/16')
  uci:set(dns_config, "dns", "fake_ip_filter", dns_table["fake-ip-filter"] or {'*.lan'})
  uci:set(dns_config, "dns", "nameserver", dns_table["nameserver"] or {'114.114.114.114','https://1.1.1.1/dns_query'})
  uci:set(dns_config, "dns", "fallback", dns_table["fallback"] or {'tcp://1.1.1.1'})
  if type(dns_table["fallback-filter"]) == "table" then
    uci:set(dns_config, "dns", "fallback_filter_geoip", dns_table["fallback-filter"]["geoip"] and "true" or "false")
    uci:set(dns_config, "dns", "fallback_filter_ipcidr", dns_table["fallback-filter"]["ipcidr"] or {'240.0.0.0/4'})
  else
    uci:set(dns_config, "dns", "fallback_filter_geoip", "true")
    uci:set(dns_config, "dns", "fallback_filter_ipcidr", {'240.0.0.0/4'})
  end
  return stat
end

_clash.parse_proxies = function(proxies_config, proxies_table)
  local stat = true
  local _, proxy
  for _, proxy in ipairs(proxies_table) do
    if proxy["name"] then
      local s_name
      local proxy_config = {
        enable = "true",
        name = proxy["name"],
        type = proxy["type"],
        port = proxy["port"],
        server = proxy["server"]
      }
      if proxy["type"] == "ss" then
        proxy_config.udp = proxy["udp"] and "true" or "false"
        proxy_config.ss_cipher = proxy["cipher"]
        proxy_config.ss_password = proxy["password"]
        proxy_config.ss_plugin = proxy["plugin"]
        if proxy["plugin-opts"] then
          proxy_config.ss_mode = proxy["plugin-opts"]["mode"]
          proxy_config.ss_host = proxy["plugin-opts"]["host"]
          proxy_config.ss_path = proxy["plugin-opts"]["path"]
          proxy_config.tls = proxy["plugin-opts"]["tls"] and "true" or "false"
          proxy_config.skip_cert_verify = proxy["plugin-opts"]["skip-cert-verify"] and "true" or "false"
          proxy_config.ss_header = proxy["plugin-opts"]["headers"] and proxy["plugin-opts"]["headers"]["custom"]
        end
      elseif proxy["type"] == "ssr" then
        proxy_config.udp = proxy["udp"] and "true" or "false"
        proxy_config.ssr_cipher = proxy["cipher"]
        proxy_config.ssr_password = proxy["password"]
        proxy_config.ssr_obfs = proxy["obfs"]
        proxy_config.ssr_obfs_param = proxy["obfs-param"]
        proxy_config.ssr_protocol_param = proxy["protocol-param"]
        proxy_config.ssr_protocol = proxy["protocol"]
      elseif proxy["type"] == "vmess" then
        proxy_config.udp = proxy["udp"] and "true" or "false"
        proxy_config.vmess_uuid = proxy["uuid"]
        proxy_config.vmess_alter_id = proxy["alterId"]
        proxy_config.vmess_cipher = proxy["cipher"]
        proxy_config.vmess_network = proxy["network"]
        proxy_config.tls = proxy["tls"] and "true" or "false"
        proxy_config.skip_cert_verify = proxy["skip-cert-verify"] and "true" or "false"
        if proxy["network"] == "ws" then
          proxy_config.vmess_path = proxy["ws-path"]
          proxy_config.vmess_host = proxy["ws-headers"] and proxy["ws-headers"]["Host"]
        elseif proxy["network"] == "http" and proxy["http-opts"] then
          proxy_config.vmess_path = proxy["http-opts"]["path"]
          proxy_config.vmess_host = proxy["http-opts"]["host"]
          proxy_config.vmess_keep_alive = proxy["http-opts"]["headers"] and proxy["http-opts"]["headers"]["Connection"] and proxy["http-opts"]["headers"]["Connection"]["keep-alive"] and "true" or "false"
        end
      elseif proxy["type"] == "socks5" then
        proxy_config.udp = proxy["udp"] and "true" or "false"
        proxy_config.username = proxy["username"]
        proxy_config.password = proxy["password"]
        proxy_config.tls = proxy["tls"] and "true" or "false"
        proxy_config.skip_cert_verify = proxy["skip-cert-verify"] and "true" or "false"
      elseif proxy["type"] == "http" then
        proxy_config.username = proxy["username"]
        proxy_config.password = proxy["password"]
        proxy_config.tls = proxy["tls"] and "true" or "false"
        proxy_config.skip_cert_verify = proxy["skip-cert-verify"] and "true" or "false"
      elseif proxy["type"] == "snell" then
        proxy_config.snell_psk = proxy["psk"]
        proxy_config.snell_mode = proxy["obfs-opts"] and proxy["obfs-opts"]["mode"]
        proxy_config.snell_host = proxy["obfs-opts"] and proxy["obfs-opts"]["host"]
      elseif proxy["type"] == "trojan" then
        proxy_config.trojan_password = proxy["password"]
        proxy_config.trojan_sni = proxy["sni"]
        proxy_config.trojan_alpn = proxy["alpn"]
        proxy_config.udp = proxy["udp"] and "true" or "false"
        proxy_config.tls = proxy["tls"] and "true" or "false"
        proxy_config.skip_cert_verify = proxy["skip-cert-verify"] and "true" or "false"
      end
      s_name = uci:section(proxies_config, "proxy", nil, proxy_config)
      if s_name then
        stat = stat and luci.model.uci:save(proxies_config)
      end
    end
  end
  return stat
end

_clash.parse_proxy_providers = function(proxy_providers_config, proxy_providers_table)
  local stat = true
  local provider_name, provider
  for provider_name, provider in pairs(proxy_providers_table) do
    local s_name = uci:section(proxy_providers_config, "proxy", nil, {
      enable = "true",
      type = "proxy_provider",
      name = provider_name,
      provider_type = provider.type,
      provider_path = provider.path,
      provider_url = provider.url,
      --don't foget the server
      server = provider.url,
      provider_interval = provider.interval,
      provider_health_check = provider["health-check"] and provider["health-check"]["enable"] and "true" or false,
      provider_health_check_url = provider["health-check"] and provider["health-check"]["url"],
      provider_health_check_interval = provider["health-check"] and provider["health-check"]["interval"]
    })

    if s_name then
      stat = stat and luci.model.uci:save(proxy_providers_config)
    end
  end
  return stat
end

_clash.parse_proxy_groups = function(proxy_groups_config, proxy_groups_table)
  local stat = true
  local proxy_groups_name = _clash.get_enabled_name_list(proxy_groups_config, "proxy_group")
  local k, v, _, y
  for k, v in ipairs(proxy_groups_table) do
    -- only accpet the proxy groups without duplicate names
    if not proxy_groups_name[k] then
      local proxies_name = {}
      if type(v.use) == "table" then
        for _, y in ipairs(v.use) do
          table.insert(proxies_name, y)
        end
      end
      if type(v.proxies) == "table" then
        for _, y in ipairs(v.proxies) do
          table.insert(proxies_name, y)
        end
      end
      local s_name = uci:section(proxy_groups_config, "proxy_group", nil, {
        enable = "true",
        name = v.name,
        type = v.type,
        proxies = v.proxies,
        proxy_providers = v.use,
        proxies_name = proxies_name,
        url = v.url,
        interval = v.interval,
        tolerance = v.tolerance
      })

      if s_name then
        stat = stat and luci.model.uci:save(proxy_groups_config)
      end
    end
  end
  if stat == true then
    return true
  else
    return false
  end
end

_clash.parse_rules = function(rules_config, rules_table)
  local stat = true
  local _, v
  for _, v in ipairs(rules_table) do
    local rule_type, matcher, proxies, s_name
    rule_type, matcher, proxies = v:match("(.-),(.-),(.+)$")
    if rule_type and matcher and proxies then 
      s_name = uci:section(rules_config, "rule", nil, {
        enable = "true",
        rule_type = rule_type,
        -- don't forget the valid matcher
        valid_matcher = matcher,
        matcher = matcher,
        proxies = proxies
      })
    else
      rule_type, proxies = v:match("(.-),(.+)$")
      s_name = uci:section(rules_config, "rule", nil, {
        enable = "true",
        rule_type = rule_type,
        valid_matcher = matcher,
        matcher = "null",
        proxies = proxies
      })
    end
    if s_name then
      stat = stat and luci.model.uci:save(rules_config)
    end
  end
  if stat == true then
    return true
  else
    return false
  end
end

_clash.parse_rule_providers = function(rule_providers_config, rule_providers_table)
  local stat = true
  local rule_providers_name = _clash.get_enabled_name_list(rule_providers_config, "rule_provider")
  local k, v
  for k, v in pairs(rule_providers_table) do
    -- only accpet the rules without duplicate names
    if not rule_providers_name[k] then
      local s_name = uci:section(rule_providers_config, "rule_provider", nil, {
        enable = "true",
        name = k,
        type = v.type,
        behavior = v.behavior,
        path = v.path,
        url = v.url,
        interval = v.interval
      })
      if s_name then
        stat = stat and luci.model.uci:save(rule_providers_config)
      end
    end
  end
  if stat == true then
    return true
  else
    return false
  end
end

_clash.parse_all = function(config_file, config_table)
  local stat = true
  local proxies_config = "pod_clash_proxies_" .. config_file
  local rules_config   = "pod_clash_rules_" .. config_file
  local general_config = "pod_clash_general_" .. config_file
  if nixio.fs.access(proxies_config) or nixio.fs.access(rules_config) or nixio.fs.access(general_config) then
    return false
  else
    nixio.fs.writefile("/etc/config/"..proxies_config, "")
    nixio.fs.writefile("/etc/config/"..rules_config, "")
    nixio.fs.writefile("/etc/config/"..general_config, "config clash 'general'\n\nconfig clash 'dns'")
  end

  stat = stat and _clash.parse_general(general_config, config_table or {})
  stat = stat and _clash.parse_dns(general_config, config_table["dns"] or {})
  stat = stat and _clash.parse_rules(rules_config, config_table["rules"] or {})
  stat = stat and _clash.parse_rule_providers(rules_config, config_table["rule-providers"] or {})
  stat = stat and _clash.parse_proxy_groups(proxies_config, config_table["proxy-groups"] or {})
  stat = stat and _clash.parse_proxies(proxies_config, config_table["proxies"] or {})
  stat = stat and _clash.parse_proxy_providers(proxies_config, config_table["proxy-providers"] or {})

  if stat then
    _clash.validate_config(proxies_config, proxies_config, rules_config, rules_config)
    uci:commit(proxies_config)
    uci:commit(rules_config)
    uci:commit(general_config)
  else
    nixio.fs.remove("/etc/config/"..proxies_config)
    nixio.fs.remove("/etc/config/"..rules_config)
    nixio.fs.remove("/etc/config/"..general_config)
  end
  return stat
end


_clash.new_config = function(config_file, config_table)
  local stat = _clash.parse_all(config_file, config_table or {})

  if stat then
    local configs = uci:get(global_config, "global", "configs")
    table.insert(configs, config_file)
    uci:set(global_config, "global", "configs", configs)
    uci:save(global_config)
    uci:commit(global_config)
  end

  return stat
end

_clash.switch_config = function(config_file)
  uci:set(global_config, "global", "config", config_file)
  uci:commit(global_config)
  -- regeneratere config file
  -- handle clash api
end

_clash.remove_config = function(config_file)
  local configs = uci:get(global_config, "global", "configs")

  for i, v in ipairs(configs) do
    if v == config_file then
      table.remove(configs, i)
      break
    end
  end

  uci:set(global_config, "global", "configs", configs)
  uci:commit(global_config)

  local general_config = "pod_clash_general_" .. config_file
  local proxies_config = "pod_clash_proxies_" .. config_file
  local rules_config   = "pod_clash_rules_" .. config_file

  luci.util.exec("rm /etc/config/".. proxies_config .. " >/dev/null 2>&1")
  luci.util.exec("rm /etc/config/".. rules_config .. " >/dev/null 2>&1")
  luci.util.exec("rm /etc/config/".. general_config .. " >/dev/null 2>&1")
end

_clash.validate_rule_providers = function(rule_providers_config)
  local rule_providers_list = {}
  local message = "ok"
  uci:foreach(rule_providers_config, "rule_provider", function(_section)
      local e = uci:get(proxies_config, _section[".name"], "enable")
      if e ~= "true" then return end
      local n = uci:get(proxies_config, _section[".name"], "name")
      local t = uci:get(proxies_config, _section[".name"], "type")
      local behavior = uci:get(proxies_config, _section[".name"], "behavior")
      if not behavior or behavior == "" then
        uci:set(rules_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some RULE PROVIDER(s) had been DISABLED, due no BEHAVIOR")
        return
      end
      if t == "http" then
        local interval = uci:get(proxies_config, _section[".name"], "interval")
        local url = uci:get(proxies_config, _section[".name"], "url")
        if not interval or interval == "" or not url or url == "" then
          uci:set(rules_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some RULE PROVIDER(s) had been DISABLED, due no URL or PATH or INTERVAL")
          return
        end
      elseif t == "file" then
        local path = uci:get(proxies_config, _section[".name"], "path")
        if not path or path == "" then
					uci:set(rules_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some RULE PROVIDER(s) had been DISABLED, due no PATH")
          return
        end
      end

      if rule_providers_list[n] then
        uci:set(rules_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some RULE PROVIDER(s) had been DISABLED, due Duplicate with an existing provider!")
      end
      rule_providers_list[n] = {
        enable = e,
        type = t,
        behavior = behavior
      }
    end)
    return rule_providers_list, message
end

_clash.validate_rules = function(proxies_info_list, proxy_group_info_list, rule_providers_list, rules_config)
  local rules_list = {}
  local message = "ok"
  uci:foreach(rules_config, "rule", function(_section)
      local e = uci:get(proxies_config, _section[".name"], "enable")
      if e ~= "true" then return end
      local rule_type = uci:get(proxies_config, _section[".name"], "rule_type")
      local matcher = uci:get(proxies_config, _section[".name"], "matcher")
      local proxy = uci:get(proxies_config, _section[".name"], "proxies")
      if not rule_type or rule_type == "" or not matcher or matcher == "" or not proxy and proxy == "" then
        uci:set(proxies_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some Porxy(s) had been DISABLED, due no TYPE or no MATCHER or no PROXY")
        return
      elseif rule_type == "RULE-SET" then
        if not rule_provider_info_list[matcher] or rule_provider_info_list[matcher]["enable"] ~= "true" then
          uci:set(rules_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some RULE(s) had been DISABLED, due disabled rule provider or no rule provider")
          return
        end
      elseif rule_type == "DST-PORT" or rule_type == "SRC-PORT" then
        if not matcher:match("^%d+$") then
          uci:set(rules_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some RULE(s) had been DISABLED, due invalid PORT matcher")
          return
        end
      elseif rule_type == "SRC-IP-CIDR" or rule_type == "IP-CIDR" then
        local ip = luci.ip.new(matcher)
        if not ip or not ip:is4() then
          uci:set(rules_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some RULE(s) had been DISABLED, due invalid IP-CIDR matcher")
          return
        end
      elseif rule_type == "IP-CIDR6" then
        local ip = luci.ip.new(matcher)
        if not ip or not ip:is6() then
          uci:set(rules_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some RULE(s) had been DISABLED, due invalid IP-CIDR6 matcher")
          return
        end
      end

      if proxy ~= "REJECT" and proxy ~= "DIRECT" then
        if not proxies_info_list[proxy] and not proxy_group_info_list[proxy] then
          uci:set(rules_config, _section[".name"], "enable", "false")
					m.message = luci.dispatcher.translate("Some RULE(s) had been DISABLED, due INVALID PROXIES")
          return
        end
      end
    end)
    return {}, message
end

_clash.validate_proxies = function(proxies_config)
  local proxies_info_list = {}
  local message = "ok"
  uci:foreach(proxies_config, "proxy", function(_section)
      local e = uci:get(proxies_config, _section[".name"], "enable")
      if e ~= "true" then return end
      local n = uci:get(proxies_config, _section[".name"], "name")
      local t = uci:get(proxies_config, _section[".name"], "type")
      local s = uci:get(proxies_config, _section[".name"], "server")
      local p = uci:get(proxies_config, _section[".name"], "port")
      if not n or not t or not s or (not p and t ~= "proxy_provider") then
        uci:set(proxies_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some Porxy(s) had been DISABLED, due INVALID NAME or TYPE or SERVER or PORT")
        return
      end
      proxies_info_list[n] = {
        enable = e,
        type = t,
        server = s,
        port = p
      }
    end)
  return proxies_info_list, message
end

_clash.validate_proxy_groups = function(proxies_info_list, proxy_groups_config)
  local proxy_group_info_list = {}
  -- luci.util.perror(proxy_groups_config)
  local message = "ok"
  uci:foreach(proxy_groups_config, "proxy_group", function(_section)
      local e = uci:get(proxy_groups_config, _section[".name"], "enable")
      if e ~= "true" then return end

      local n = uci:get(proxy_groups_config, _section[".name"], "name")
      local t = uci:get(proxy_groups_config, _section[".name"], "type")      
      if not n or n == "" or not t or t == "" then
        uci:set(proxy_groups_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some Porxy Group(s) had been DISABLED, due INVALID NAME or TYPE")
      end

      if proxy_group_info_list[n] then
        uci:set(proxy_groups_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some Porxy(s) had been DISABLED, due Duplicate with an existing proxy group!")
      end

      if proxies_info_list[n] then
        uci:set(proxy_groups_config, _section[".name"], "enable", "false")
        message = luci.dispatcher.translate("Some Porxy(s) had been DISABLED, due Duplicate with an existing proxy!")
      end

      local proxies = uci:get(proxy_groups_config, _section[".name"], "proxies_name")
      for _, v in ipairs(proxies) do
        if not proxies_info_list[v] then
          uci:set(proxy_groups_config, _section[".name"], "enable", "false")
          message = luci.dispatcher.translate("Some Porxy(s) had been DISABLED, due INVALID PROXIES")
        end
      end

      proxy_group_info_list[n] = {
        enable = e
      }
    end)
    return proxy_group_info_list, message
end

_clash.validate_config = function(proxies_config, proxy_groups_config, rule_providers_config, rules_config)
  local proxies_info_list = _clash.validate_proxies(proxies_config)
  local proxy_group_info_list = _clash.validate_proxy_groups(proxies_info_list, proxy_groups_config)
  local rule_provider_info_list = _clash.validate_rule_providers(rule_providers_config)
  _clash.validate_rules(proxies_info_list, proxy_group_info_list, rule_provider_info_list, proxies_config)
end

-- local echo_space = function(num)
--   local str = ""
--   for i=num,1,-1 do
--     str = str .. " "
--   end
--   return str
-- end

-- local stringify_yaml_list = function(tbl, depth)
--   if type(tbl) ~= "table" or next(tbl) == nil then
--     return ""
--   end
--   local list_str, _, v
--   for _, v in ipairs(tbl) do
--     list_str = (list_str and (list_str .. "\n") or "") .. echo_space(depth * 2) .. "- \"" .. v .. "\""
--   end
--   return list_str
-- end

_clash.gen_general_config = function(general_config)
  local general_table = uci:get_all(general_config, "general")
  return string.format([[
port: %s
redir-port: %s
socks-port: %s
mixed-port: %s
allow-lan: %s
bind-address: "*"
authentication: %s
mode: "%s"
log-level: "%s"
external-controller: "%s"
secret: "%s"]], general_table.port or "", general_table.redir_port or "7892", general_table.socks_port or "", general_table.mixed_port or ""
    , general_table.allow_lan and "true" or "false", syaml.encode(general_table.authentication or {}), general_table.mode or ""
    , general_table.log_level or "info", general_table.external_controller or "", general_table.secret or "")
end

_clash.gen_dns_config = function(dns_config)
  local dns = uci:get_all(dns_config, "dns")
  local dns_yaml = "\ndns: " .. syaml.encode( {
    enable = true,
    ipv6 = dns.ipv6 and true or false,
    listen = "0.0.0.0:53",
    ["enhanced-mode"] = dns.enhanced_mode,
    ["use-hosts"] = dns.use_hosts,
    ["default-nameserver"] = dns.default_nameserver,
    nameserver = dns.nameserver,
    fallback = dns.fallback,
    ["fallback-filter"] = {
      geoip = dns.fallback_filter_geoip and true or false,
      ipcidr = dns.fallback_filter_ipcidr
    },
    ["fake-ip-range"] = dns.fake_ip_range,
    ["fake-ip-filter"] = dns.fake_ip_filter
  })
  return dns_yaml
end

_clash.gen_proxies_config = function(proxies_config)
  local proxies_yaml = "\nproxies:"
  local providers_yaml = "\nproxy-providers:"
  uci:foreach(proxies_config, "proxy", function(section)
    if section.enable ~= "true" or not section.name or not section.type then return end
    local proxy_yaml
    local provider_yaml
    if section.type == "ss" then
      proxy_yaml = "\n  - " .. syaml.encode({
        name = section.name,
        type = section.type,
        server = section.server,
        port = section.port,
        chpher = section.ss_cipher,
        password = section.password,
        plugin = seciton.ss_plugin,
        ["plugin-opts"] = {
          mode = section.ss_mode,
          host = section.ss_host,
          tls = section.tls and true or false,
          ["skip-cert-verify"] = section.skip_cert_verify and true or false,
          host = section.ss_host,
          path = section.ss_path,
          mux = true,
          headers = { custom = section.ss_header }
        }
      })
    elseif section.type == "ssr" then
      proxy_yaml = string.format('\n  - { name: %s, type: %s, server: %s, port: %s, cipher: %s, password: %s, obfs: %s, protocol: %s, obfs-param: %s, protocol-param: %s, udp: %s }',
      section.name, section.type, section.server or "", section.port or "", section.ssr_cipher or "", section.ssr_password or "", section.ssr_obfs or "", section.ssr_protocol or "", section.ssr_obfs_param or "", section.ssr_protocol_param or "", section.udp or "")
    elseif section.type == "vmess" then
        local vmess = {
          name = section.name,
          type = section.type,
          server = section.server,
          port = section.port and tonumber(section.port),
          uuid = section.vmess_uuid,
          alterId = section.vmess_alter_id and tonumber(section.vmess_alter_id),
          cipher = section.vmess_cipher,
          udp = section.udp and true or false,
          tls = section.tls and true or false,
          ["skip-cert-verify"] = section.skip_cert_verify and true or false,
          network = section.vmess_network,
          ["ws-path"] = section.vmess_path,
          ["ws-headers"] = {Host = section.vmess_host},
        }
      if section.vmess_network == "http" then
        vmess["http-opts"] = {method="GET", path = section.vmess_path}
      end 
      if section.vmess_keep_alive == "true" then 
        vmess["http-opts"]["headers"] = {Connection = { "keep-alive" }}
      end
      proxy_yaml = "\n  - " .. syaml.encode(vmess)
    elseif section.type == "http" then
      proxy_yaml = string.format('\n  - { name: %s,    type: %s,    server: %s, port: %s, username: %s, password: %s, tls: %s, skip-cert-verify: %s }', 
      section.name, section.type, section.server or "", section.port or "", section.username or "", section.password or "", section.tls or "", section.skip_cert_verify or "false")
    elseif section.type == "socks5" then
      proxy_yaml = string.format('\n  - { name: %s, type: %s, server: %s, port: %s, username: %s, password: %s, tls: %s, skip-cert-verify: %s, udp: %s }',
      section.name, section.type, section.server or "", section.port or "", section.username or "", section.password or "", section.tls or "", section.skip_cert_verify or "false", section.udp or "")
    elseif section.type == "snell" then
      proxy_yaml = string.format('\n  - { name: %s, type: %s, server: %s, port: %s, psk: %s, obfs-opts: { mode: %s, host: %s }}',
      section.name, section.type, section.server or "", section.port or "", section.snell_psk or "", section.snell_mode or "", section.snell_host or "")
    elseif section.type == "trojan" then
      proxy_yaml = string.format("\n  - { name: %s, type: %s, server: %s, port: %s, password: %s, udp: %s, sni: %s, alpn: %s, skip-cert-verify: %s }", 
      section.name, section.type, section.server or "", section.port or "", section.trojan_password or "", section.udp or "", section.trojan_sni or "",  section.trojan_alpn or "", section.skip_cert_verify or "false")
    elseif section.type == "proxy_provider" then
      provider_yaml = "\n  " .. section.name .. ": " .. syaml.encode({
        type = section.provider_type,
        path = section.provider_path,
        url = section.provider_url,
        interval = section.provider_interval,
        ["health-check"] = {
          enable = section.provider_health_check and true or false,
          url = section.provider_health_check_url,
          interval = section.provider_health_check_interval
        }
      })
      providers_yaml = providers_yaml .. provider_yaml
    end
    if proxy_yaml then
      proxies_yaml = proxies_yaml .. proxy_yaml
    end
  end)
  return proxies_yaml .. providers_yaml
end

_clash.gen_proxy_groups_config = function(proxies_config)
  local proxy_groups_yaml = "\nproxy-groups:"

  uci:foreach(proxies_config, "proxy_group",
  function(section)
    if section.enable ~= "true" or not section.name or not section.type then return end
    local proxy_group_yaml = "\n  - " .. syaml.encode({
      name = section.name,
      type = section.type,
      url = section.url,
      tolerance = section.tolerance,
      interval = section.interval,
      use = section.proxy_providers,
      proxies = section.proxies
    })
    proxy_groups_yaml = proxy_groups_yaml .. proxy_group_yaml
  end)
  return proxy_groups_yaml
end

_clash.gen_rule_providers_config = function(rules_config)
  local rule_providers_yaml = "\nrule-providers:"
  
  uci:foreach(rules_config, "rule_provider", function(section)
    if section.enable ~= "true" or not section.name or not section.type then return end
    local rule_provider_yaml = string.format('\n  %s: { type: %s, behavior: %s, path: %s, url: %s, interval: %s }',
          section.name, section.type, section.behavior, section.path, section.url, section.interval)
    rule_providers_yaml = rule_providers_yaml .. rule_provider_yaml
  end)

  return rule_providers_yaml
end

_clash.gen_rules_config = function(rules_config)
  local rules_yaml = "\nrules:"
  uci:foreach(rules_config, "rule", function(section)
    if section.enable ~= "true" or not section.rule_type or not section.proxies then return end
    local rule_yaml
    if section.rule_type == "MATCH" then
      rule_yaml = string.format('\n  - %s,%s', section.rule_type, section.proxies)
    else
      rule_yaml = string.format('\n  - %s,%s,%s', section.rule_type, section.valid_matcher or section.matcher, section.proxies)
    end
    rules_yaml = rules_yaml .. rule_yaml
  end)
  return rules_yaml
end

_clash.gen_config = function(config_file)
  local proxies_config = "pod_clash_proxies_" .. config_file
  local rules_config   = "pod_clash_rules_" .. config_file
  local general_config = "pod_clash_general_" .. config_file

  local yaml_config = _clash.gen_general_config(general_config) .. _clash.gen_dns_config(general_config)
                   .. _clash.gen_proxies_config(proxies_config) .. _clash.gen_proxy_groups_config(proxies_config)
                   .. _clash.gen_rule_providers_config(rules_config) .. _clash.gen_rules_config(rules_config)

  return yaml_config
end

return _clash