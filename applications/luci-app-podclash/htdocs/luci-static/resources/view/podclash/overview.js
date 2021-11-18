'use strict';
'require ui';
'require view';
'require dom';
'require poll';
'require uci';
'require rpc';
'require fs';
'require form';
'require podclash/js-yaml';
'require podclash/podclash as podclash';

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet',
	'type': 'text/css',
	'href': L.resource('podclash/codemirror.css')
}));

return view.extend({
	load: function () {
		return fs.read_direct(podclash.SERVER_SIDE_CONFIG_PATH, 'json')
			.catch(() => { return {} })
	},
	render: function (_data) {
		podclash.data.init(_data)
		_data["_INFO_00pod_name"] = { key: _('POD Name'), value: '-', ".type": '_INFO', ".name": '_INFO_00pod_name' }
		_data["_INFO_01pod_ip"] = { key: _('IP'), value: '-', ".type": '_INFO', ".name": '_INFO_01pod_ip' }
		_data["_INFO_10clash_version"] = { key: _('Clash Version'), value: '-', ".type": '_INFO', ".name": '_INFO_10clash_version' }
		_data["_INFO_11clash_running_mode"] = { key: _('Running Mode'), value: '-', ".type": '_INFO', ".name": '_INFO_11clash_running_mode' }
		_data["_INFO_12clash_proxies_rules"] = { key: _('Proxies & Rules'), value: 'Proxies: - | Rules: -', ".type": '_INFO', ".name": '_INFO_12clash_proxies_rules' }
		_data["_INFO_13clash_ports"] = { key: _('Clash Ports'), value: '-', ".type": '_INFO', ".name": '_INFO_13clash_ports' }
		_data["_INFO_22clash_dashboard"] = { key: _('Clash Dashboard'), value: '-', ".type": '_INFO', ".name": '_INFO_22clash_dashboard' }
		// _data["_INFO_21external_controller"] = { key: _('External Controller'), value: '-', ".type": '_INFO', ".name": '_INFO_21external_controller' }
		_data["_INFO_31public_ip"] = { key: _('Public IP'), value: '-', ".type": '_INFO', ".name": '_INFO_31public_ip' }
		_data["_INFO_31connect_check"] = { key: _('Connect Check'), value: '-', ".type": '_INFO', ".name": '_INFO_31connect_check' }
		_data["_logs"] = {}

		let m, s, o, ss, so
		m = new form.JSONMap({}, _('POD Clash'));
		m.tabbed = true
		m.data.data = _data
		// result = m.data.data
		m.save = function (cb, silent) {
			this.checkDepends();
			return this.parse()
				.then(cb)
				.then(this.data.save.bind(this.data))
				.then(this.load.bind(this))
				.catch(function (e) {
					if (!silent) {
						ui.showModal(_('Save error'), [
							E('p', {}, [_('An error occurred while saving the form:')]),
							E('p', {}, [E('em', { 'style': 'white-space:pre' }, [e.message])]),
							E('div', { 'class': 'right' }, [
								E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, [_('Dismiss')])
							])
						]);
					}

					return Promise.reject(e);
				})
				.then(this.renderContents.bind(this));
		}

		m.data.add = function (config, sectiontype, sectionname, index) {
			let num_sections_type = 0, next_index = 0;
			for (let name in this.data) {
				if (this.data[name]['.type'] == sectiontype) {
					num_sections_type += (this.data[name]['.type'] == sectiontype);
					next_index = Math.max(next_index, this.data[name]['.index']);
					if (index != null && this.data[name]['.index'] >= index) {
						this.data[name]['.index'] += 1
					}
				}
			}

			let section_id = sectionname || sectiontype + num_sections_type;
			if (!this.data.hasOwnProperty(section_id)) {
				// clone form default config
				if (sectiontype === 'Configuration')
					this.data[section_id] = JSON.parse(JSON.stringify(podclash.default_config))
				else
					this.data[section_id] = {}

				this.data[section_id]['.name'] = section_id
				this.data[section_id]['.type'] = sectiontype
				this.data[section_id]['.anonymous'] = (sectionname == null)
				this.data[section_id]['.index'] = index != null ? index : next_index
			}

			return section_id;
		}

		// info
		s = m.section(form.TableSection, '_INFO', _("Info"), null)
		s.anonymous = true
		o = s.option(form.DummyValue, 'key', _("Info"))
		o = s.option(form.DummyValue, 'value', null)


		// configurations
		s = m.section(form.GridSection, 'Configuration', _("Configuration"), null)
		s.anonymous = false
		s.addremove = true
		s.viewConfig = podclash.viewConfig
		s.renderMoreOptionsModal = podclash.renderMoreOptionsModal
		s.renderSectionAdd = function (extra_class) {
			if (!this.addremove)
				return E([]);

			let createEl = E('div', { 'class': 'cbi-section-create' }),
				btn_title = this.titleFn('addbtntitle');

			if (extra_class != null)
				createEl.classList.add(extra_class);

			let nameEl = E('input', {
				'type': 'text',
				'class': 'cbi-section-create-name',
				'disabled': this.map.readonly || null
			});

			dom.append(createEl, [
				E('div', {}, nameEl),
				E('button', {
					'class': 'cbi-button cbi-button-add',
					'title': _('Add'),
					'click': ui.createHandlerFn(this, function (ev) {
						if (nameEl.classList.contains('cbi-input-invalid'))
							return;
						return this.handleAdd(ev, nameEl.value);
					}),
					'disabled': this.map.readonly || true
				}, [_('Add')]),
				E('button', {
					'class': 'cbi-button cbi-button-add',
					'title': _('Add'),
					'click': ui.createHandlerFn(this, function (ev) {
						if (nameEl.classList.contains('cbi-input-invalid'))
							return;
						return this.handleAdd(ev, nameEl.value);
					}),
					'disabled': this.map.readonly || true
				}, [_('From URL')]),
			]);

			if (this.map.readonly !== true) {
				ui.addValidator(nameEl, 'uciname', true, function (v) {
					let buttonAdd = createEl.querySelector('.cbi-section-create > .cbi-button-add');
					// check for duplicate names
					if (v !== '' && !podclash.data.get(v)) {
						buttonAdd.disabled = null;
						return true;
					}
					else {
						buttonAdd.disabled = true;
						return _('Expecting: %s').format(_('non-empty value') + ' | ' + _('non-exist value'));
					}
				}, 'blur', 'keyup');
			}
			return createEl;
		}

		s.handleModalSave = function (modalMap, sid, noUpload, needClose, ev) {
			// save rules
			let rules, script, hosts
			try {
				hosts = jsyaml.load(podclash.data.get(sid, '__dnsCodeMirror').getValue()).hosts || null
				rules = jsyaml.load(podclash.data.get(sid, '__rulesCodeMirror').getValue()).rules || null
				script = jsyaml.load(podclash.data.get(sid, '__scriptCodeMirror').getValue()).script || null
			} catch (error) { }

			// if script.code == empty clear it
			if (script && script.code && script.code.match(/^\s+$/)) {
				script = null
			}

			if (podclash.isNullObj(hosts)) {
				hosts = null
			}
			return modalMap.save(null, true)
				.then(L.bind(this.map.load, this.map))
				.then(L.bind(this.map.reset, this.map))
				.then(L.bind(function () { this.addedSection = null }, this))
				.then(() => {
					if (hosts)
						podclash.data.set(sid, 'dns_hosts', hosts)
					if (rules)
						podclash.data.set(sid, 'rules', rules)
					if (script)
						podclash.data.set(sid, 'script', script)
				})
				.then(() => {
					// TODO: upload to luci server
					if (!noUpload) podclash.data.upload()
					if (needClose) ui.hideModal()
					// setTimeout(() => {
					// 	podclash.getClashInfo()
					// }, 0);
					console.log(podclash.data.get())
				})
				// .then(ui.hideModal)
				.catch(function () { });
		}
		s.renderRowActions = function (section_id) {
			let tdEl = this.super('renderRowActions', [section_id, _('Edit')]),
				using = false;
			dom.content(tdEl.lastChild, [
				E('button', {
					'class': 'cbi-button cbi-button-positive',
					'click': ui.createHandlerFn(this, 'viewConfig', section_id),
					'title': _('View / Edit')
				}, _('View / Edit')),
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					// 'click': podclash.applyConfig.bind(this, section_id),
					'click':  (ev) => {	podclash.applyConfig(section_id, ev) },
					'title': using ? _('Reload') : _('Apply')
				}, using ? _('Reload') : _('Apply')),
				tdEl.lastChild.firstChild,
				E('button', {
					'class': 'cbi-button cbi-button-remove',
					'click': podclash.removeConfig.bind(this, section_id),
					'title': _('Remove'),
					'disabled': using ? true : null
				}, _('Remove')),
				// tdEl.lastChild.lastChild
			]);
			return tdEl;
		};

		// o = s.option(form.DummyValue, "name", _("Config Name"))
		o = s.option(form.DummyValue, "mode", _("Mode"))
		o = s.option(form.DummyValue, "dns_enhanced-mode", _("DNS Mode"))
		o = s.option(form.DummyValue, "__port", _("Ports"))
		o.cfgvalue = function (section_id) {
			return (podclash.data.get(section_id, 'port')
				&& ('http: ' + String(podclash.data.get(section_id, 'port'))) || '')
				+ (podclash.data.get(section_id, 'socks-port')
					&& (' socks: ' + String(podclash.data.get(section_id, 'socks-port'))) || '')
				+ (podclash.data.get(section_id, 'mixed-port')
					&& (' mixed: ' + String(podclash.data.get(section_id, 'mixed-port'))) || '')
		}
		o = s.option(form.DummyValue, "__proxy_nums", _("Proxies"))
		o.cfgvalue = function (section_id) {
			let num = (podclash.data.get(section_id, 'proxies') && podclash.data.get(section_id, 'proxies').length || 0) +
				(podclash.data.get(section_id, 'proxy-groups') && podclash.data.get(section_id, 'proxy-groups').length || 0)
			return String(num)
		}
		o = s.option(form.DummyValue, "__rule_nums", _("Rules"))
		o.cfgvalue = function (section_id) {
			return podclash.data.get(section_id, 'rules') && String(podclash.data.get(section_id, 'rules').length) || '0'
		}

		s.modaltitle = function (section_id) {
			return _('Configuration') + ': ' + section_id || "New Config"
		};

		s.addModalOptions = function (sConfig, sidConfig, ev) {
			sConfig.tab('general', _('General Settings'));
			sConfig.tab('dns', _('DNS Settings'));
			sConfig.tab('proxies', _('Proxies Settings'));
			sConfig.tab('rules', _('Rules Settings'));
			sConfig.tab('script', _('Script'));
			sConfig.showAll = false;

			o = sConfig.taboption('general', form.ListValue, 'mode', _("Running Mode"))
			o.value("rule", _("Rule"))
			o.value("global", _("Global"))
			o.value("direct", _("Direct"))
			o.value("script", _("Script"))

			o = sConfig.taboption('general', form.Flag, "allow-lan", _("Allow LAN"), _("Allow other devices access"))
			o.DATATYPE = "boolean"
			o.enabled = true
			o.disabled = false
			o.rmempty = false

			o = sConfig.taboption('general', form.Value, 'port', _("Port of HTTP"))
			o.datatype = "port"
			o.DATATYPE = "number"
			o.placeholder = 7890
			// o.depends("allow-lan", true)

			o = sConfig.taboption('general', form.Value, 'socks-port', _("Port of Socks"))
			o.DATATYPE = "number"
			o.datatype = "port"
			o.placeholder = 7891
			// o.depends("allow-lan", true)

			o = sConfig.taboption('general', form.Value, 'mixed-port', _("Port of HTTP&SOCKS5"))
			o.DATATYPE = "number"
			o.datatype = "port"
			o.placeholder = 7894
			// o.depends("allow-lan", true)

			// o = sConfig.taboption('general', form.Value, 'redir-port', _("Redirect TCP and TProxy UDP"))
			// o.DATATYPE = "number"
			// o.datatype = "port"
			// o.placeholder = 7892

			// o = sConfig.taboption('general', form.Value, 'tproxy-port', _("TProxy TCP and TProxy UDP"))
			// o.DATATYPE = "number"
			// o.datatype = "port"
			// o.placeholder = 7893

			o = sConfig.taboption('general', form.DynamicList, 'authentication', _("Authentication"), _("Authentication of local SOCKS5/HTTP(S) server"))
			o.placeholder = "user1:pass1"
			o.depends("allow-lan", true)

			o = sConfig.taboption('general', form.Value, 'secret', _("Secret"), _("Secret for RESTful API for external-controller port: 9090"))
			o.password = true
			o.placeholder = "podclash"

			o = sConfig.taboption('general', form.ListValue, 'log-level', _("Log level"))
			o.value("silent", _("Silent"))
			o.value("error", _("Error"))
			o.value("warning", _("Warning"))
			o.value("info", _("Info"))
			o.value("debug", _("Debug"))

			//dns
			o = sConfig.taboption('dns', form.ListValue, 'dns_enhanced-mode', _("DNS Mode"))
			o.value("redir-host", _("Redir-host"))
			o.value("fake-ip", _("Fake-ip"))

			o = sConfig.taboption('dns', form.Value, "dns_fake-ip-range", _("Fake-ip range"))
			o.datatype = "ipaddr"
			o.placeholder = "198.18.0.1/16"
			o.default = "198.18.0.1/16"
			o.depends("dns_enhanced-mode", "fake-ip")

			o = sConfig.taboption('dns', form.DynamicList, "dns_fake-ip-filter", _("Fake-ip white domain list"), _("fake ip white domain list, aka Always Real IP"))
			o.placeholder = "*.lan"
			o.default = ["*.lan"]
			o.depends("dns_enhanced-mode", "fake-ip")

			o = sConfig.taboption('dns', form.DynamicList, "dns_default-nameserver", _("DOT/DOH nameserver"), _("Use for resolve DOT/DOH dns nameserver host"))
			o.placeholder = "114.114.114.114"
			o.datatype = "ipaddr"

			o = sConfig.taboption('dns', form.DynamicList, "dns_nameserver", _("Nameserver"), _("Defines several upstream DNS server, support resolve by udp, tcp, udp on specific port, tcp on specific port, DNS over TLS, DNS over HTTPS. <br>eg. 114.114.114.114, tls.//dns.rubyfish.cn.853, https.//1.1.1.1/dns-query, tls.//1.1.1.1.853"))
			o.placeholder = "114.114.114.114"

			o = sConfig.taboption('dns', form.DynamicList, "dns_fallback", _("Fallback nameserver"), _("Concurrent request with nameserver, fallback used when GEOIP country isn't CN.<br>eg. 114.114.114.114.53, tls.//dns.rubyfish.cn.853, https.//1.1.1.1/dns-query, tls.//1.1.1.1.853"))
			o.placeholder = "114.114.114.114"

			o = sConfig.taboption('dns', form.DynamicList, "dns_fallback-filter-ipcidr", _("Fallback filter ipcidr"), _("IPs in these subnets will be considered polluted, fallback nameserver will used"))
			o.datatype = "ipaddr"
			o.placeholder = "240.0.0.0/4"

			o = sConfig.taboption('dns', form.DynamicList, "dns_domain", _("Fallback Domain"), _("Domains in these list will be considered polluted, when lookup these domains, clash will use fallback results."))
			o.placeholder = "+.google.com"

			o = sConfig.taboption('dns', form.Flag, "dns_use-hosts", _("Use hosts"), _("Lookup hosts and return IP record instead of return a fake ip"))
			o.DATATYPE = "boolean"
			o.enabled = true
			o.disabled = false
			o.rmempty = false

			o = sConfig.taboption('dns', form.Value, "_dns_hosts", _("Hosts"), _("System hosts"))
			// o.depends('dns_use-hosts', true)
			o.renderWidget = function (sid) {
				return E('div', { 'class': 'cbi-value' }, [
					E('div', { 'class': 'cbi-value-text' },
						E('div', { 'style': 'border: 1px solid #ccc;border-radius:3px;width:100%;' },
							E('textarea', { 'id': 'dns_hosts_textarea', 'style': 'width:60%', 'rows': 15, }, podclash.data.get(sid, 'dns_hosts'))
						)
					)
				]);
			}
			o.write = () => { }

			// ------------
			o = sConfig.taboption('proxies', form.Button, "_showAll", _("Show ALL"))
			o.onclick = function (ev, section_id) {
				sConfig.map.save(this.map, section_id)
					.then(this.map.renderContents.bind(this.map))
					.then(podclash.renderCodeMirrors(section_id))
					.then(sConfig.showAll = !sConfig.showAll)
			}
			o.inputstyle = 'add'
			o.render = podclash.showAllRender

			o = sConfig.taboption('rules', form.Button, "_showAll", _("Show ALL"))
			o.onclick = function (ev, section_id) {
				sConfig.map.save(this.map, section_id)
					.then(this.map.renderContents.bind(this.map))
					.then(podclash.renderCodeMirrors(section_id))
					.then(sConfig.showAll = !sConfig.showAll)
			}
			o.inputstyle = 'add'
			o.render = podclash.showAllRender

			// Proxies
			o = sConfig.taboption('proxies', form.SectionValue, 'proxies', form.GridSection, 'proxies', _('Proxies'))
			ss = o.subsection
			ss.parentsection = sConfig
			ss.nodescriptions = true
			ss.anonymous = false
			ss.addremove = true
			ss.modaltitle = function (section_id) {
				return _('Proxy') + ': ' + this.parentsection.section + ' -> ' + section_id || "New Proxy"
			};

			ss.renderMoreOptionsModal = podclash.renderMoreOptionsModal
			ss.renderSectionAdd = podclash.renderSectionAdd
			ss.renderRowActions = podclash.renderModalRowActions
			ss.handleModalCancel = podclash.handleModalCancel
			ss.handleModalSave = podclash.handleModalSave
			ss.handleClear = podclash.handleClear
			ss.filter = podclash.modalFilter
			ss.viewConfig = podclash.viewConfig

			so = ss.option(form.ListValue, 'type', _('Type'))
			for (let k in podclash.proxy_types) {
				so.value(k, podclash.proxy_types[k])
			}
			so = ss.option(form.Value, 'server', _('Server'))
			so.depends({ type: 'proxy-providers', "!reverse": true })
			so.cfgvalue = function (section_id) {
				if (podclash.data.get(section_id, 'type') != 'proxy-providers') {
					return podclash.data.get(section_id, 'server')
				} else {
					return podclash.data.get(section_id, 'proxy-providers_url')
				}
			}

			so = ss.option(form.Value, 'port', _('Port'))
			so.datatype = "port"
			so.DATATYPE = "number"
			so.cfgvalue = function (section_id) {
				return podclash.data.get(section_id, "port") && String(podclash.data.get(section_id, "port"))
			}
			so.depends({ type: 'proxy-providers', "!reverse": true })
			so = ss.option(form.Flag, '_proxies_enable', _('Enable'))
			so.modalonly = false
			so.rmempty = false
			so.editable = true
			so.cfgvalue = podclash.modalEnableFlagCFGValue
			so.write = podclash.modalEnableFlagWrite

			so = ss.option(form.Flag, 'udp', _('Udp'))
			so.DATATYPE = "boolean"
			so.modalonly = true
			so.enabled = true
			so.disabled = false
			so.depends({ type: 'vmess' })
			so.depends({ type: 'ss' })
			so.depends({ type: 'socks5' })
			so.depends({ type: 'trojan' })
			so.depends({ type: 'ssr' })

			//proxy provider
			so = ss.option(form.ListValue, 'proxy-providers_type', _('Provider Type'))
			so.value("http")
			so.value("file")
			so.modalonly = true
			so.readonly = true
			so.default = 'http'
			so.depends({ type: 'proxy-providers' })

			so = ss.option(form.Value, 'proxy-providers_path', _('Path'))
			so.placeholder = '/clash/proxies/provider_name.yaml'
			so.readonly = true
			so.modalonly = true
			so.depends({ type: 'proxy-providers' })

			so = ss.option(form.Value, 'proxy-providers_url', _('Url'))
			so.modalonly = true
			so.depends({ type: 'proxy-providers' })

			so = ss.option(form.Value, 'proxy-providers_interval', _('Interval'), _('Auto update interval'))
			so.placeholder = '3600'
			so.default = 3600
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.modalonly = true
			so.depends({ type: 'proxy-providers' })

			so = ss.option(form.Flag, 'proxy-providers_health-check_enable', _('Health check'))
			so.DATATYPE = "boolean"
			so.default = true
			so.enabled = true
			so.disabled = false
			so.modalonly = true
			so.depends({ type: 'proxy-providers' })

			so = ss.option(form.Value, 'proxy-providers_health-check_url', _('Health check url'), _('The url using for health check'))
			so.placeholder = 'http://www.gstatic.com/generate_204'
			so.default = 'http://www.gstatic.com/generate_204'
			so.modalonly = true
			so.depends({ type: 'proxy-providers', "proxy-providers_health-check_enable": true })

			so = ss.option(form.Value, 'proxy-providers_health-check_interval', _('Health check interval'))
			so.placeholder = 300
			so.default = 300
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.modalonly = true
			so.depends({ type: 'proxy-providers', "proxy-providers_health-check_enable": true })

			//vmess
			so = ss.option(form.Value, 'vmess_uuid', _('UUID'))
			so.modalonly = true
			so.depends({ type: 'vmess' })

			so = ss.option(form.Value, 'vmess_alterId', _('alterId'))
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.modalonly = true
			so.depends({ type: 'vmess' })

			so = ss.option(form.ListValue, 'vmess_cipher', _('Cipher'))
			podclash.ciphers.vmess.forEach(item => {
				so.value(item, item)
			})
			so.modalonly = true
			so.depends({ type: 'vmess' })

			so = ss.option(form.ListValue, 'vmess_network', _('Network'))
			so.value("none", "none")
			so.value("ws", "ws")
			so.value("http", "HTTP")
			so.value("h2", "H2")
			so.value("grpc", "gRPC")
			so.modalonly = true
			so.depends({ type: 'vmess' })

			so = ss.option(form.Value, 'vmess_servername', _('Server Name'), _("Priority over wss host"))
			so.modalonly = true
			so.depends({ type: 'vmess' })

			//vmess ws
			so = ss.option(form.Value, 'vmess_ws-opts_headers_Host', _('Host'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'ws' })

			so = ss.option(form.Value, 'vmess_ws-opts_path', _('Path'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'ws' })

			so = ss.option(form.Value, 'vmess_ws-opts_max-early-data', _('Max early data'))
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.modalonly = true
			so.default = 2048
			so.depends({ type: 'vmess', vmess_cipher: 'ws' })

			so = ss.option(form.Value, 'vmess_ws-opts_early-data-header-name', _('Early data header name'))
			so.modalonly = true
			so.default = 'Sec-WebSocket-Protocol'
			so.depends({ type: 'vmess', vmess_cipher: 'ws' })

			//vmess h2
			so = ss.option(form.DynamicList, 'vmess_h2-opts_host', _('Host'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'h2' })

			so = ss.option(form.Value, 'vmess_h2-opts_path', _('Path'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'h2' })

			// vmess http
			so = ss.option(form.DynamicList, 'vmess_http_path', _('Path'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'http' })

			so = ss.option(form.Value, 'vmess_http-opts-method', _('method'))
			so.value("GET", "GET")
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'http' })

			so = ss.option(form.Flag, 'vmess_http-opts-headers_Connection', _('Keep alive'))
			so.DATATYPE = "boolean"
			so.enabled = true
			so.disabled = false
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'http' })

			// vmess grpc
			so = ss.option(form.Value, 'vmess_grpc-opts_path', _('Path'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_network: 'grpc' })

			so = ss.option(form.Value, 'vmess_grpc-opts_grpc-service-name', _('gRPC service name'))
			so.modalonly = true
			so.depends({ type: 'vmess', vmess_cipher: 'grpc' })

			//ss
			so = ss.option(form.ListValue, 'ss_cipher', _('Cipher'))
			podclash.ciphers.ss.forEach(item => {
				so.value(item, item)
			})
			so.modalonly = true
			so.depends({ type: 'ss' })

			so = ss.option(form.Value, 'ss_password', _('Password'))
			so.password = true
			so.modalonly = true
			so.depends({ type: 'ss' })

			so = ss.option(form.ListValue, 'ss_plugin', _('Plugin'))
			so.value('none', 'none')
			so.value('obfs', 'obfs')
			so.value('v2ray-plugin', 'v2ray-plugin')
			so.modalonly = true
			so.depends({ type: 'ss' })

			so = ss.option(form.ListValue, 'ss_plugin-opts_mode', _('Plugin mode'))
			so.modalonly = true
			so.value('tls', 'tls')
			so.value('http', 'http')
			so.value('websocket', 'websocket')
			so.depends({ type: 'ss' })

			so = ss.option(form.Value, 'ss_plugin-opts_host', _('Host'))
			so.modalonly = true
			so.depends({ type: 'ss' })

			so = ss.option(form.Value, 'ss_plugin-opts_path', _('Path'))
			so.modalonly = true
			so.depends({ type: 'ss', ss_plugin: 'v2ray-plugin' })

			so = ss.option(form.Flag, 'ss_plugin-opts_mux', _('Mux'))
			so.DATATYPE = "boolean"
			so.modalonly = true
			so.enabled = true
			so.disabled = false
			so.depends({ type: 'ss', ss_plugin: 'v2ray-plugin' })

			so = ss.option(form.Value, 'ss_plugin-opts_headers_custom', _('Headers'))
			so.modalonly = true
			so.depends({ type: 'ss', ss_plugin: 'v2ray-plugin' })

			//ssr
			so = ss.option(form.ListValue, 'ssr_cipher', _('Cipher'))
			podclash.ciphers.ssr.forEach(item => {
				so.value(item, item)
			})
			so.modalonly = true
			so.depends({ type: 'ssr' })

			so = ss.option(form.Value, 'ssr_password', _('Password'))
			so.password = true
			so.modalonly = true
			so.depends({ type: 'ssr' })

			so = ss.option(form.ListValue, 'ssr_obfs', _('Obfs'))
			podclash.ssr_obfses.forEach(item => {
				so.value(item, item)
			})
			so.modalonly = true
			so.depends({ type: 'ssr' })

			so = ss.option(form.ListValue, 'ssr_protocol', _('Protocol'))
			podclash.ssr_protocols.forEach(item => {
				so.value(item, item)
			})
			so.modalonly = true
			so.depends({ type: 'ssr' })

			so = ss.option(form.Value, 'ssr_obfs-param', _('Obfs param'))
			so.modalonly = true
			so.depends({ type: 'ssr' })

			so = ss.option(form.Value, 'ssr_protocol-param', _('Protocol param'))
			so.modalonly = true
			so.depends({ type: 'ssr' })

			//socks5
			so = ss.option(form.Value, 'socks5_username', _('Username'))
			so.modalonly = true
			so.depends({ type: 'socks5' })

			so = ss.option(form.Value, 'socks5_password', _('Password'))
			so.password = true
			so.modalonly = true
			so.depends({ type: 'socks5' })

			//http
			so = ss.option(form.Value, 'http_username', _('Username'))
			so.modalonly = true
			so.depends({ type: 'http' })

			so = ss.option(form.Value, 'http_password', _('Password'))
			so.password = true
			so.modalonly = true
			so.depends({ type: 'http' })

			so = ss.option(form.Value, 'http_sni', _('SNI'))
			so.modalonly = true
			so.depends({ type: 'http' })

			//snell
			so = ss.option(form.Value, 'snell_password', _('PSK'))
			so.password = true
			so.modalonly = true
			so.depends({ type: 'snell' })

			so = ss.option(form.ListValue, 'snell_obfs-opts_mode', _('Mode'))
			so.value("tls", "tls")
			so.value("http", "http")
			so.modalonly = true
			so.depends({ type: 'snell' })

			so = ss.option(form.Value, 'snell_obfs-opts_host', _('Host'))
			so.modalonly = true
			so.depends({ type: 'snell' })

			//trojan
			so = ss.option(form.Value, 'trojan_password', _('Password'))
			so.password = true
			so.modalonly = true
			so.depends({ type: 'trojan' })

			so = ss.option(form.Value, 'trojan_sni', _('SNI'))
			so.modalonly = true
			so.depends({ type: 'trojan' })

			so = ss.option(form.DynamicList, 'trojan_alpn', _('ALPN'))
			so.value("http/1.1")
			so.value("h2")
			so.modalonly = true
			so.depends({ type: 'trojan' })

			so = ss.option(form.Value, 'trojan_network', _('Network'))
			so.value("grpc", "gRPC")
			so.modalonly = true
			so.depends({ type: 'trojan' })

			so = ss.option(form.Value, 'trojan_grpc-opts_grpc-service-name', _('gRPC service name'))
			so.modalonly = true
			so.depends({ type: 'trojan', trojan_network: 'grpc' })

			//common tls settings
			so = ss.option(form.Flag, 'tls', _('Tls'))
			so.DATATYPE = "boolean"
			so.modalonly = true
			so.enabled = true
			so.disabled = false
			so.depends({ type: 'ss', plugin: 'v2ray-plugin' })
			so.depends({ type: 'vmess' })
			so.depends({ type: 'socks5' })
			so.depends({ type: 'http' })

			so = ss.option(form.Flag, 'skip-cert-verify', _('Skip cert verify'))
			so.DATATYPE = "boolean"
			so.modalonly = true
			so.enabled = true
			so.disabled = false
			so.depends({ type: 'ss', ss_plugin: 'v2ray-plugin', tls: true })
			so.depends({ type: 'vmess', tls: true })
			so.depends({ type: 'socks5', tls: true })
			so.depends({ type: 'http', tls: true })
			so.depends({ type: 'trojan' })

			// proxy groups
			o = sConfig.taboption('proxies', form.SectionValue, 'proxy-groups', form.GridSection, 'proxy-groups', _('Proxy Groups'))
			ss = o.subsection
			ss.nodescriptions = true
			ss.anonymous = false
			ss.addremove = true
			ss.modaltitle = function (section_id) {
				return _('Proxy Group') + ': ' + this.parentsection.section + ' -> ' + section_id || "New Proxy Group"
			};
			ss.parentsection = sConfig
			ss.renderSectionAdd = podclash.renderSectionAdd
			ss.renderRowActions = podclash.renderModalRowActions
			ss.handleModalCancel = podclash.handleModalCancel
			ss.handleModalSave = podclash.handleModalSave
			ss.renderMoreOptionsModal = podclash.renderMoreOptionsModal
			ss.handleClear = podclash.handleClear
			ss.filter = podclash.modalFilter
			ss.viewConfig = podclash.viewConfig

			so = ss.option(form.ListValue, 'type', _('Type'))
			so.value("select", _("Select"))
			so.value("url-test", _("URL Test"))
			so.value("fallback", _("Fallback"))
			so.value("load-balance ", _("Load Balance"))
			so.value("relay", _("Proxy Chains"))
			so = ss.option(form.DynamicList, 'proxies', _('Proxies'))
			so.value("DIRECT", "DIRECT")
			so.value("REJECT", "REJECT")
			for (let x in podclash.data.get()) {
				if (podclash.data.get(x, '.type') == 'proxies') {
					if (podclash.data.get(x, 'type') == 'proxy-providers') {
						so.value(podclash.data.get(x, '.name'), 'Provider: ' + podclash.data.get(x, '.name'))
					} else {
						so.value(podclash.data.get(x, '.name'), 'Proxy: ' + podclash.data.get(x, '.name'))
					}
				} else if (podclash.data.get(x, '.type') == 'proxy-groups') {
					so.value(podclash.data.get(x, '.name'), 'Group: ' + podclash.data.get(x, '.name'))
				}
			}
			so = ss.option(form.Value, 'url', _('Url'), _('A url will be used for benchmarking the latency. Recommand http.'))
			so.placeholder = 'http://www.gstatic.com/generate_204'
			so.default = 'http://www.gstatic.com/generate_204'
			so.modalonly = true
			so.depends('type', 'url-test')
			so.depends('type', 'fallback')
			so.depends('type', 'load-balance')
			
			so = ss.option(form.Value, 'interval', _('Interval'), _('Retest the latency after several seconds.'))
			so.placeholder = '300'
			so.default = '300'
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.modalonly = true
			so.depends('type', 'url-test')
			so.depends('type', 'fallback')
			so.depends('type', 'load-balance')
			so = ss.option(form.Value, 'tolerance', _('Tolerance'), _('Clash will only change proxy when the latency of the new Proxy is further below the tolerance plus the current delay of the old one. The default value is 0ms, and not necessary.'))
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.modalonly = true
			so.depends('type', 'url-test')
			so = ss.option(form.Flag, 'lazy', _('Lazy'), _('when lazy open, proxy group and proxy provider that have not been used during the cycle will not be speed tested.'))
			so.default = true
			so.DATATYPE = "boolean"
			so.modalonly = true
			so.enabled = true
			so.disabled = false
			so.depends('type', 'url-test')
			so.depends('type', 'fallback')
			so.depends('type', 'load-balance')
			so = ss.option(form.Flag, 'disable-udp', _('Disable UDP'), _('disable udp traffic on this group.'))
			so.default = false
			so.DATATYPE = "boolean"
			so.enabled = true
			so.disabled = false
			so = ss.option(form.Flag, '_proxy-groups_enable', _('Enable'))
			so.modalonly = false
			so.rmempty = false
			so.editable = true
			so.cfgvalue = podclash.modalEnableFlagCFGValue
			so.write = podclash.modalEnableFlagWrite

			// rule-providers
			o = sConfig.taboption('rules', form.SectionValue, 'rule-providers', form.GridSection, 'rule-providers', _('Rule Providers'))
			ss = o.subsection
			ss.parentsection = sConfig
			ss.nodescriptions = true
			ss.anonymous = false
			ss.addremove = true

			ss.modaltitle = function (section_id) {
				return _('Rule Provider') + ': ' + this.parentsection.section + ' -> ' + section_id || "New rule provider"
			};

			ss.renderMoreOptionsModal = podclash.renderMoreOptionsModal
			ss.renderSectionAdd = podclash.renderSectionAdd
			ss.renderRowActions = podclash.renderModalRowActions
			ss.handleModalCancel = podclash.handleModalCancel
			ss.handleModalSave = podclash.handleModalSave
			ss.handleClear = podclash.handleClear
			ss.filter = podclash.modalFilter
			ss.viewConfig = podclash.viewConfig

			so = ss.option(form.ListValue, "type", _("Type"))
			so.default = "http"
			so.modalonly = true
			so.readonly = true
			so.value("http", _("HTTP"))
			so.value("file", _("File"))

			so = ss.option(form.ListValue, "behavior", _("Behavior"), _('Type of rules, it can be a domain, ipcidr or classical, domain means all things in it must be a domains, ipcidr means all things in it must be a ip cidrs, classical means it is a rules liked rule-provider.'))
			so.default = "classical"
			so.value("classical", _("Classical"))
			so.value("domain", _("Domain"))
			so.value("ipcidr", _("IPcidr"))

			so = ss.option(form.Value, "path", _("Path"))
			so.placeholder = '/clash/rules/provider_name.yaml'
			so.modalonly = true
			so.readonly = true

			so = ss.option(form.Value, "url", _("URL"))
			so = ss.option(form.Value, "interval", _("Interval"), _('Auto update interval'))
			so.datatype = "uinteger"
			so.DATATYPE = "number"
			so.default = 86400
			so.cfgvalue = function (section_id) {
				return podclash.data.get(section_id, "interval") && String(podclash.data.get(section_id, "interval"))
			}

			so = ss.option(form.Flag, '_rule-providers_enable', _('Enable'))
			so.modalonly = false
			so.rmempty = false
			so.editable = true
			so.cfgvalue = podclash.modalEnableFlagCFGValue
			so.write = podclash.modalEnableFlagWrite

			// rules
			o = sConfig.taboption('rules', form.Value, '_rules', _('Rules'))
			o.render = function (sid) {
				return E([
					E('h3', _('Rules')),
					E('p', {},
						E('div', { 'style': 'border: 1px solid #ccc;border-radius:3px;width:100%;' },
							E('textarea', { 'id': 'rules_textarea', 'style': 'width:100%', 'rows': 25, }, '')
						)
					)
				]);
			}
			o.write = function () { }
			// o = sConfig.taboption('rules', form.SectionValue, '_rules_' + sConfig.section, form.GridSection, '_rules_' + sConfig.section, _('Rules'))
			// ss = o.subsection
			// ss.parentsection = sConfig
			// ss.addremove = true
			// ss.anonymous = true
			// ss.sortable = true

			// ss.modaltitle = function (section_id) {
			// 	return _('Rule') + ': ' + this.parentsection.section || "New rule"
			// };

			// ss.renderMoreOptionsModal = podclash.renderMoreOptionsModal
			// ss.renderSectionAdd = podclash.renderSectionAdd
			// ss.renderRowActions = podclash.renderModalRowActions
			// ss.handleModalCancel = podclash.handleModalCancel
			// ss.handleModalSave = podclash.handleModalSave
			// ss.handleAddAtTop = podclash.handleAddAtTop
			// ss.handleClear = podclash.handleClear
			// ss.filter = podclash.modalFilter
			// ss.viewConfig = podclash.viewConfig

			// so = ss.option(form.ListValue, "type", _("Rule Type"))
			// so.default = "DOMAIN"
			// so.value("RULE-SET", _("RULE-SET"))
			// so.value("DOMAIN-SUFFIX", _("DOMAIN-SUFFIX"))
			// so.value("DOMAIN-KEYWORD", _("DOMAIN-KEYWORD"))
			// so.value("DOMAIN", _("DOMAIN"))
			// so.value("SRC-IP-CIDR", _("SRC-IP-CIDR"))
			// so.value("IP-CIDR", _("IP-CIDR"))
			// so.value("IP-CIDR6", _("IP-CIDR6"))
			// so.value("GEOIP", _("GEOIP"))
			// so.value("DST-PORT", _("DST-PORT"))
			// so.value("SRT-PORT", _("SRT-PORT"))
			// so.value("MATCH", _("MATCH"))

			// so = ss.option(form.Value, "matcher", _("Matcher"))
			// so = ss.option(form.Value, "policy", _("Proxies (Groups)"))
			// so.value("DIRECT", "DIRECT")
			// so.value("REJECT", "REJECT")
			// for (let x in podclash.data.get()) {
			// 	if (podclash.data.get(x, '.type') == 'proxies') {
			// 		if (podclash.data.get(x, 'type') == 'proxy-providers'){
			// 			so.value(podclash.data.get(x, '.name'), 'Provider: ' + podclash.data.get(x, '.name'))
			// 		}else{
			// 			so.value(podclash.data.get(x, '.name'), 'Proxy: ' + podclash.data.get(x, '.name'))
			// 		}
			// 	} else if (podclash.data.get(x, '.type') == 'proxy-groups'){
			// 		so.value(podclash.data.get(x, '.name'), 'Group: ' + podclash.data.get(x, '.name'))
			// 	}
			// }

			// so = ss.option(form.Flag, '_rules_enable', _('Enable'))
			// so.modalonly = false
			// so.rmempty = false
			// so.editable = true
			// so.cfgvalue = podclash.modalEnableFlagCFGValue
			// so.write = podclash.modalEnableFlagWrite

			// script
			o = sConfig.taboption('script', form.Value, '_script', _('Script'))
			o.render = function (sid) {
				return E([
					E('h3', _('Script')),
					E('p', {},
						E('div', { 'style': 'border: 1px solid #ccc;border-radius:3px;width:100%;' },
							E('textarea', { 'id': 'script_textarea', 'style': 'width:100%', 'rows': 25, }, podclash.data.get(this.section.section, 'script'))
						)
					)
				]);
			}
			o.write = () => { }
		}

		// global pod setting
		// s = m.section(form.NamedSection, 'Pod', _("Pod Settings"), null)

		// o = s.option(form.Value, "pod_name", _("Container Name"))
		// o = s.option(form.Value, "image_name", _("Image name of PODCLASH"))
		// o = s.option(form.Value, "pod_config", _("Config file in Container"))
		// o = s.option(form.Value, "pod_config_path", _("Config Path in Container"))
		// o = s.option(form.Value, "subconverter_base_url", _("Subconverter Base URL"))

		// logs
		s = m.section(form.NamedSection, '_logs', _("Logs"), null)
		o = s.option(form.Value, '_logs', _('Logs'))
		o.render = async function (sid) {
			// setTimeout(() => {
			// 	const target_logs = document.getElementsByClassName('cbi-map-tabbed')[0].children[2]
			// 	const options = {
			// 		attributes: true,
			// 		attributeFilter: ['data-tab-active']
			// 	}
			// 	const mb_logs = new MutationObserver(function (mutationRecord, observer) {
			// 		if (target_logs.getAttribute("data-tab-active") == "true") {
			// 			podclash.getPodLogs()
			// 		}
			// 	})
			// 	mb_logs.observe(target_logs, options)
			// }, 0);
			return E([], [
				E('h3', { 'id': 'cbi-json-_logs' }, [_('Logs')]),
				E('div', {
					'id': 'content_clashlog',
					'style': 'font-size:12px; width:100%'
				}, [
					E('textarea', {
						'id': 'clashlog',
						'style': 'font-size:12px; width:100%',
						'readonly': 'readonly',
						'wrap': 'off',
						'rows': 10
					}, '')
				])
			]);
		}

		// add Event Listener for tabs, tab click reload clash info and logs
		setTimeout(() => {
			podclash.getClashInfo()
			const throttle = function (fn, wait) {
				let previous = 0;
				return function () {
					let now = new Date().getTime();
					if (now - previous > wait) {
						fn.apply(this, arguments);
						previous = now;
					}
				}
			}
			const tabs = document.getElementsByClassName('cbi-tabmenu')[0].children
			for (let tab of tabs) {
				if (tab.getAttribute('data-tab') == '_INFO') {
					tab.addEventListener('click', throttle(function () {
						podclash.getClashInfo()
					}, 5000))
				}
				else if (tab.getAttribute('data-tab') == _('Logs')) {
					tab.addEventListener('click', throttle(function () {
						podclash.getPodLogs()
					}, 2000))
				}
			}
			// add update/switch
			const ver_td = document.getElementById('cbi-json-_INFO_10clash_version-value')
			const update_btn = E('button', { 'id': 'btn_update_clash', 'disabled': 'true', 'class': 'cbi-button cbi-button-apply', 'click': (ev) => { podclash.updatePodClash(ev) } }, [_('Update')])
			const switch_btn = E('button', { 'id': 'btn_switch_clash_ver', 'disabled': 'true', 'class': 'cbi-button cbi-button-apply', 'click': (ev) => { podclash.updatePodClash(ev) } }, [_('Switch')])
			ver_td.style['display'] = 'inline-block'
			ver_td.parentElement.appendChild(E('span', {}, '&nbsp;&nbsp;'))
			ver_td.parentElement.appendChild(update_btn)
			ver_td.parentElement.appendChild(E('span', {}, '&nbsp;'))
			ver_td.parentElement.appendChild(switch_btn)
		}, 0);

		return m.render()
	},

	handleSaveApply: null,
	handleReset: null,
	handleSave: null

})
