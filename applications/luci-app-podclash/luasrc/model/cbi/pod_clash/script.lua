local m, s, o
local global_config = "pod_clash"
local config_file = luci.model.uci:get(global_config, "global", "config") or "default"
local script_config = "pod_clash_script_" .. config_file

m = SimpleForm("pod_clash_script", translate("Clash Config") .. ": " .. config_file)
s = m:section(SimpleSection, translate("Script"))
o = s:option(Value, "script")
o.template = "cbi/tvalue"
o.rows = 28

o.cfgvalue = function (self, section)
  return nixio.fs.readfile("/etc/config/" .. script_config)
end
-- o.forcewrite = true
-- o.write = function (self, section, value)
--   local s
--   local val
--   if value:match("^script:") then
--     for s in value:gmatch("[^\r\n]+") do
--       if not s:match("^script:") and not s:match("^  code: |") then
--         val = (val and ( val .. "\n" ) or "") .. s:sub(5)
--       end
--     end
--   end
--   value = val or value
--   nixio.fs.writefile("/etc/config/" .. script_config, value)
-- end

m.handle = function(self, state, data)
  if state ~= FORM_VALID then return end
  local value = o:formvalue(1) or ""
  local val, s 
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