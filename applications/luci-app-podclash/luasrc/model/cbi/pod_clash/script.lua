local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local script_config = "pod_clash_script_" .. config_file

m = SimpleForm("pod_clash_script", translate("Clash Config") .. ": " .. config_file)
s = m:section(SimpleSection, translate("Script"))
o = s:option(Value, "_scrpit")
o.template = "cbi/tvalue"
o.rows = 28

function o.cfgvalue(self, section)
  return nixio.fs.readfile("/etc/config/" .. script_config)
end

function o.write(self, section, value)
  local s
  local val
  if value:match("^script:") then
    for s in value:gmatch("[^\r\n]+") do
      if not s:match("^script:") and not s:match("^  code: |") then
        val = (val and ( val .. "\n" ) or "") .. s:sub(5)
      end
    end
  end
  value = val or value
  nixio.fs.writefile("/etc/config/" .. script_config, value)
end

return m