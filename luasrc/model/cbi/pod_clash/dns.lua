
local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local dns_config = "pod_clash_general_" .. config_file

m = Map(dns_config, translate("Clash Config") .. ": " .. config_file)
s = m:section(NamedSection, "dns", "clash", translate("DNS Settings"))

local enhanced_mode = s:option(ListValue, "enhanced_mode", translate("Running Mode"))
enhanced_mode:value("redir-host", translate("Redir-host"))
enhanced_mode:value("fake-ip", translate("Fake-ip"))

o = s:option(Value, "fake_ip_range", translate("Fake-ip range"))
o.placeholder = "198.18.0.1/16"
o.default = "198.18.0.1/16"
o:depends("enhanced_mode", "fake-ip")

o = s:option(DynamicList, "fake_ip_filter", translate("Fake-ip white domain list"), translate("fake ip white domain list, aka Always Real IP"))
o.placeholder = "*.lan"
o.default = {"*.lan"}
o:depends("enhanced_mode", "fake-ip")

o = s:option(Flag, "use_hosts", translate("Use hosts"), translate("Lookup hosts and return IP record instead of return a fake ip"))
o.rmempty = false
o.disabled = "false"
o.enabled = "true"
o:depends("enhanced_mode", "fake-ip")

o = s:option(DynamicList, "default_nameserver", translate("DOT/DOH nameserver"), translate("Use for resolve DOT/DOH dns nameserver host"))
o.placeholder = "114.114.114.114"
o.datatype="ip4addr"

o = s:option(DynamicList, "nameserver", translate("Nameserver"), translate("Defines several upstream DNS server, support resolve by udp, tcp, udp on specific port, tcp on specific port, DNS over TLS, DNS over HTTPS. <br>eg: 114.114.114.114, tls://dns.rubyfish.cn:853, https://1.1.1.1/dns-query, tls://1.1.1.1:853"))
o.placeholder = "114.114.114.114"

o = s:option(DynamicList, "fallback", translate("Fallback nameserver"), translate("Concurrent request with nameserver, fallback used when GEOIP country isn't CN.<br>eg: 114.114.114.114:53, tls://dns.rubyfish.cn:853, https://1.1.1.1/dns-query, tls://1.1.1.1:853"))
o.placeholder = "114.114.114.114"

-- o = s:option(Flag, "fallback_filter_geoip", translate("fallback_filter_geoip"))
-- o.rmempty = false
-- o.disabled = "false"
-- o.enabled = "true"

o = s:option(DynamicList, "fallback_filter_ipcidr", translate("Fallback filter ipcidr"), translate("IPs in these subnets will be considered polluted, fallback nameserver will used"))
o.placeholder = "240.0.0.0/4"

return m
