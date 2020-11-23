m = SimpleForm("pod_clash_log")
m.submit = false
m.reset  = false
s = m:section(SimpleSection)
log = s:option(DummyValue, "_logs")
log.template = "pod_clash/logs"
return m