'use strict';
"require baseclass"
'require uci';
'require dom'
'require ui'
'require fs';
'require form';
'require podclash/js-yaml';
'require podclash/codemirror as CodeMirror'

const PODCLASH = {
	INFO: [
		{ key: _("POD Name"), value: "-" },
		{ key: _("POD IP"), value: "-" },
		{ key: _("Running Mode"), value: "-" },
		{ key: _("Proxies & Rules"), value: "-" },
		{ key: _("Clash Ports"), value: "-" },
		{ key: _("Clash Dashboard"), value: "-" },
		{ key: _("External Controller"), value: "-" }
	],
	Configuration: [
		{
			".name": "default1",
			'.type': 'config',
			mode: "rule",
			dnsMode: "fake-ip",
			port: 7890,
			proxies: ["proxy1"],
			'proxy-groups': ["group1", "group2"],
			'rule-providers': ['rulep1', 'rulep2'],
			scripts: 'sssssss'
		},
		{
			".name": "default2", mode: "rule", dnsMode: "fake-ip", port: 7890, proxy_nums: '200', rule_nums: '100',
			proxies: ["proxy1"],
			'proxy-groups': ["group1", "group2"],
			'rule-providers': ['rulep1', 'rulep2'],
			scripts: 'sssssss'
		},
		{
			".name": "default3", mode: "rule", dnsMode: "fake-ip", port: 7890, proxy_nums: '200', rule_nums: '100',
			proxies: ["proxy1", 'proxy2'],
			'proxy-groups': [],
			'rule-providers': ['rulep1', 'rulep2'],
			scripts: 'sssss'
		},
		{
			".name": "default4", mode: "rule", dnsMode: "fake-ip", port: 7890, proxy_nums: '200', rule_nums: '100',
			proxies: ["proxy2"],
			'proxy-groups': ["group1"],
			'rule-providers': ['rulep1', 'rulep2'],
			scripts: 'sssss'
		}
	],
	proxies: [
		{ ".name": "proxy1", type: 'ss', server: 'xyz.cn', port: 10000 },
		{ ".name": "proxy2", type: 'ss', server: 'xyz.cn', port: 10000 },
	],
	'proxy-groups': [
		{ ".name": "group1", type: 'auto', proxies: ["proxy1", "proxy2"], url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 0 },
		{ ".name": "group2", type: 'auto', proxies: ["proxy1"], url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 0 },
	],
	'rule-providers': [
		{ ".name": "rulep1", type: 'http', behavior: 'domain', path: '', url: 'http://www.gstatic.com/generate_204', interval: 300 },
		{ ".name": "rulep2", type: 'file', behavior: 'domain', path: '', url: 'http://www.gstatic.com/generate_204', interval: 300 },
		{ ".name": "rulep3", type: 'http', behavior: 'domain', path: '', url: 'http://www.gstatic.com/generate_204', interval: 300 }
	],
	_rules_default4: [
		{ type: 'DOMAIN-SUFFIX', matcher: 'google1.com', policy: 'REJECT' },
		{ type: 'DOMAIN-SUFFIX', matcher: 'google2.com', policy: 'REJECT' },
		{ type: 'DOMAIN-SUFFIX', matcher: 'google3.com', policy: 'REJECT' }
	],
	Pod: {
		pod_name: 'podclash',
		image_name: 'lisaac/podclash:premium',
		pod_config: '/clash/config.yaml',
		pod_config_path: '/clash',
		subconverter_base_url: 'http://127.0.0.1:25500/sub?',
	}
}

const PODCLASH_DATA = function () {
	let _data = {}
	return {
		init: function (__data) {
			_data = __data
		},
		// set('config1', 'proxies', 'type', 'vmess')
		set: function () {
			(function (obj, keys) {
				var value = keys.pop(),
					final = keys.pop(), k
				while (k = keys.shift()) {
					if (typeof obj[k] === 'undefined')
						obj[k] = {}
					obj = obj[k]
				}
				obj[final] = value
			})(_data, [].slice.call(arguments))
		},
		// get('config1', 'proxies', 'type')
		get: function () {
			return (function (obj, keys) {
				if (keys.length == 0) return obj
				let final = keys.pop(), k
				while (k = keys.shift()) {
					if (typeof obj[k] === 'undefined')
						return undefined
					obj = obj[k]
				}
				return obj[final]
			})(_data, [].slice.call(arguments))
		},
	}
}()

const default_config = {
	"mode": 'rule',
	"port": 7890,
	"socks-port": 7891,
	"redir-port": 7892,
	"tproxy-port": 7893,
	"mixed-port": 7894,
	"allow-lan": true,
	"bind-address": "*",
	"authentication": null,
	"log-level": 'info',
	"external-controller": ":9090",
	"secret": "podclash",
	"external-ui": "/clash/yacd/",
	"dns_enable": true,
	"dns_ipv6": false,
	"dns_listen": '0.0.0.0:53',
	"dns_enhanced-mode": 'redir',
	"dns_default-nameserver": ['223.5.5.5', '119.29.29.29'],

}

const template = {
	"Configuration": {
		"port": null,
		"socks-port": null,
		"redir-port": null,
		"tproxy-port": null,
		"mixed-port": null,
		"allow-lan": null,
		"bind-address": '*',
		"authentication": null,
		"mode": null,
		"log-level": null,
		"external-controller": ":9090",
		"secret": "podclash",
		"external-ui": "/clash/yacd/",
		"dns": {
			"enable": true,
			"ipv6": false,
			"listen": "0.0.0.0:53",
			"enhanced-mode": null,
			"nameserver-policy": {},
			"default-nameserver": null,
			"fake-ip-range": null,
			"use-hosts": null,
			"fake-ip-filter": null,
			"nameserver": null,
			"fallback": null,
			"fallback-filter": {
				"geoip": null,
				"geoip-code": null,
				"ipcidr": null,
				"domain": null,
			}
		},
		"scripts": null
	},
	"tun": {
		"enable": false,
		"stack": null,
		"dns-hijack": null
	},
	"proxies": {
		"proxy-providers": {
			"type": null,
			"path": null,
			"url": null,
			"interval": null,
			"health-check": {
				"enable": null,
				"url": null,
				"interval": null
			}
		},
		"vmess": {
			"name": null,
			"type": 'vmess',
			"server": null,
			"port": null,
			"uuid": null,
			"alterId": null,
			"cipher": null,
			"udp": null,
			"tls": null,
			"skip-cert-verify": null,
			"servername": null,
			"network": null,
			"ws-opts": {
				"path": null,
				"headers": {
					"Host": null
				},
				"max-early-data": null,
				"early-data-header-name": null
			},
			"h2-opts": {
				"host": null,
				"path": null
			},
			"grpc-opts": {
				"grpc-service-name": null
			},
			"http-opts": {
				"method": null,
				"path": null//,
				// "headers": {
				// 	"Connection": null
				// }
			}
		},
		"ss": {
			"name": null,
			"type": 'ss',
			"server": null,
			"port": null,
			"cipher": null,
			"password": null,
			"udp": null,
			"plugin": null,
			"plugin-opts": {
				"mode": null,
				"host": null,
				"tls": null,
				"skip-cert-verify": null,
				"path": null,
				"mux": null,
				"headers": {
					"custom": null
				}
			}
		},
		"ssr": {
			"name": null,
			"type": 'ssr',
			"server": null,
			"port": null,
			"cipher": null,
			"password": null,
			"obfs": null,
			"protocol": null,
			"obfs-param": null,
			"protocol-param": null,
			"udp": null
		},
		"trojan": {
			"name": null,
			"type": 'trojan',
			"server": null,
			"port": null,
			"password": null,
			"udp": null,
			"sni": null,
			"alpn": null,
			"grpc-opts": {
				"grpc-service-name": null
			},
			"skip-cert-verify": null,
		},
		"socks5": {
			"name": null,
			"type": 'socks5',
			"server": null,
			"port": null,
			"username": null,
			"password": null,
			"udp": null,
			"tls": null,
			"skip-cert-verify": null,
		},
		"http": {
			"name": null,
			"type": 'http',
			"server": null,
			"port": null,
			"username": null,
			"password": null,
			"tls": null,
			"skip-cert-verify": null,
			"sni": null
		},
		"snell": {
			"name": null,
			"type": 'snell',
			"server": null,
			"port": null,
			"psk": null,
			"version": 2,
			"obfs-opts": {
				"mode": null,
				"host": null
			}
		}
	},
	"proxy-groups": {
		"name": null,
		"type": null,
		"proxies": null,
		"use": null,
		"url": null,
		"interval": null,
		"tolerance": null,
		"lazy": null,
		"disable-udp": null
	},
	"rule-providers": {
		"type": null,
		"behavior": null,
		"path": null,
		"url": null,
		"interval": null
	},
	"rules": {
		"type": null,
		"matcher": null,
		"policy": null
	}
}

const proxy_types = {
	"proxy-providers": "Proxy Providers",
	"vmess": "Vmess",
	"trojan": "Trojan",
	"ss": "Shadowsocks",
	"ssr": "ShadowsocksR",
	"socks5": "Socks5",
	"http": "Http",
	"snell": "Snell"
}

const ciphers = {
	vmess: ["auto", "aes-128-gcm", "chacha20-poly1305", "none"],
	ss: ["aes-128-gcm", "aes-192-gcm", "aes-256-gcm", "aes-128-cfb",
		"aes-192-cfb", "aes-256-cfb", "aes-128-ctr", "aes-192-ctr",
		"aes-256-ctr", "rc4-md5", "chacha20-ietf", "xchacha20",
		"chacha20-ietf-poly1305", "xchacha20-ietf-poly1305"],
	ssr: ["aes-128-cfb", "aes-192-cfb", "aes-256-cfb",
		"aes-128-ctr", "aes-192-ctr", "aes-256-ctr",
		"rc4-md5", "chacha20-ietf", "xchacha20"]
}

const ssr_obfses = ["plain", "http_simple", "http_post", "random_head",
	"tls1.2_ticket_auth", "tls1.2_ticket_fastauth"]

const ssr_protocols = ["origin", "auth_sha1_v4", "auth_aes128_md5",
	"auth_aes128_sha1", "auth_chain_a", "auth_chain_b"]

const isNullObj = function (obj) {
	for (var x in obj) {
		if (obj[x] != undefined) {
			return false
		}
	}
	return true
}

const handleAddAtTop = function (ev, name) {
	var config_name = this.uciconfig || this.map.config,
		section_id = this.map.data.add(config_name, this.sectiontype, name, 0);

	this.addedSection = section_id;
	return this.renderMoreOptionsModal(section_id);
}

const handleClear = function (ev) {
	const podclash_data = this.map.data.data
	const isRules = this.sectiontype.match(/^_rules_.+/) ? true : false
	if (isRules) {
		for (var x in podclash_data) {
			if (podclash_data[x]['.type'] == this.sectiontype) {
				podclash_data[x] = []
			}
		}
	} else {
		let pool = []
		for (var x in podclash_data) {
			if (podclash_data[x]["rule-providers"]) {
				pool = pool.concat(podclash_data[x]["rule-providers"])
			}
			if (podclash_data[x]["proxy-groups"]) {
				pool = pool.concat(podclash_data[x]["proxy-groups"])
			}
			if (podclash_data[x]["proxies"]) {
				pool = pool.concat(podclash_data[x]["proxies"])
			} else if (podclash_data[x]["policy"]) {
				pool = pool.concat(podclash_data[x]["policy"])
				pool = pool.concat(podclash_data[x]["policy"])
				if (podclash_data[x]['matcher'] && podclash_data[x]['type'] == 'RULE-SET') {
					pool = pool.concat(podclash_data[x]['matcher'])
				}
			}
		}
		for (var x in podclash_data) {
			if (podclash_data[x]['.type'] == this.sectiontype) {
				if (pool.indexOf(podclash_data[x]['.name']) < 0) {
					podclash_data[x] = []
				}
			}
		}
	}
	return this.parentsection.parentmap.children[1].renderMoreOptionsModal(this.parentsection.section);
}

const renderSectionAdd = function (extra_class) {
	if (!this.addremove)
		return E([]);
	let isEnabled = false

	var createEl = E('div', { 'class': 'cbi-section-create' }),
		btn_title = this.titleFn('addbtntitle');

	if (extra_class != null)
		createEl.classList.add(extra_class);

	if (this.anonymous) {
		document.querySelectorAll('[data-widget-id$="_' + 'rules' + '_enable"]')
			.forEach((item) => {
				isEnabled = isEnabled || (item.value == '1' ? true : false)
			})
		dom.append(createEl, [
			E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': btn_title || _('Add at TOP'),
				'click': ui.createHandlerFn(this, 'handleAddAtTop'),
				'disabled': this.map.readonly || null
			}, [btn_title || _('Add at TOP')]),
			E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': btn_title || _('Add at Bottom'),
				'click': ui.createHandlerFn(this, 'handleAdd'),
				'disabled': this.map.readonly || null
			}, [btn_title || _('Add at Bottom')]),
			E('button', {
				'class': 'cbi-button cbi-button-positive',
				'title': _('View / Edit'),
				'click': ui.createHandlerFn(this, 'viewConfig', null),
				'disabled': this.map.readonly && true
			}, [_('View / Edit')]),
			this.parentsection.showAll ? E('button', {
				'class': 'cbi-button cbi-button-remove',
				'title': _(isEnabled ? 'Disable All' : 'Enable All'),
				'click': ui.createHandlerFn(this, function (ev) {
					document.querySelectorAll('[data-widget-id$="_' + 'rules' + '_enable"]')
						.forEach((item) => {
							if (isEnabled)
								item.checked = false
							else
								item.checked = true
						})
				}),
			}, [_(isEnabled ? 'Disable All' : 'Enable All')]) : '',
			this.parentsection.showAll ? E('button', {
				'class': 'cbi-button cbi-button-remove',
				'title': _('Clear'),
				'click': ui.createHandlerFn(this, function (ev) {
					return this.handleClear(ev);
				}),
			}, [_('Clear')]) : ""
		])
	}
	else {
		var nameEl = E('input', {
			'type': 'text',
			'class': 'cbi-section-create-name',
			'disabled': this.map.readonly || null
		});
		document.querySelectorAll('[data-widget-id$="_' + this.parentoption.option + '_enable"]')
			.forEach((item) => {
				isEnabled = isEnabled || (item.value == '1' ? true : false)
			})

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
				'class': 'cbi-button cbi-button-positive',
				'title': _('View / Edit'),
				'click': ui.createHandlerFn(this, 'viewConfig', null),
				'disabled': this.map.readonly && true
			}, [_('View / Edit')]),
			this.parentsection.showAll ? E('button', {
				'class': 'cbi-button cbi-button-remove',
				'title': _(isEnabled ? 'Disable All' : 'Enable All'),
				'click': ui.createHandlerFn(this, function (ev) {
					document.querySelectorAll('[data-widget-id$="_' + this.parentoption.option + '_enable"]')
						.forEach((item) => {
							if (isEnabled)
								item.checked = false
							else
								item.checked = true
						})
				}),
			}, [_(isEnabled ? 'Disable All' : 'Enable All')]) : '',
			this.parentsection.showAll ? E('button', {
				'class': 'cbi-button cbi-button-remove',
				'title': _('Clear'),
				'click': ui.createHandlerFn(this, function (ev) {
					return this.handleClear(ev, nameEl.value);
				}),
			}, [_('Clear')]) : ""
		]);

		if (this.map.readonly !== true) {
			ui.addValidator(nameEl, 'uciname', true, function (v) {
				var buttonAdd = createEl.querySelector('.cbi-section-create > .cbi-button-add');
				// check for duplicate names
				if (v !== '' && !PODCLASH_DATA.get(v)) {
					buttonAdd.disabled = null;
					return true;
				}
				else {
					buttonAdd.disabled = true;
					return _('Expecting: %s').format(_('non-empty value') + _(' and non-exist value'));
				}
			}, 'blur', 'keyup');
		}
	}

	return createEl;
}

const handleModalCancel = function (modalMap, ev) {
	const config_name = this.uciconfig || this.map.config;
	if (this.addedSection != null) {
		this.map.data.remove(config_name, this.addedSection);
		this.addedSection = null;
	}
	return Promise.resolve(this.map.parent.children[1].renderMoreOptionsModal(this.parentsection.section))
}

const handleModalSave = function (modalMap, sid, ev) {
	const configName = this.parentsection.section
	let configSectionType = this.sectiontype.match(/^_rules_.+/) && 'rules' || this.sectiontype
	return modalMap.save(null, true)
		.then(L.bind(this.map.load, this.map))
		.then(L.bind(this.map.reset, this.map))
		.then(L.bind(function () { this.addedSection = null }, this))
		.then(this.map.parent.children[1].renderMoreOptionsModal(configName))
		// save the section name to podclash data
		.then(
			(() => {
				PODCLASH_DATA.get(configName, configSectionType) ? PODCLASH_DATA.get(configName, configSectionType).push(sid) : PODCLASH_DATA.set(configName, configSectionType, [sid])
				function unique(arr) {
					return Array.from(new Set(arr))
				}
				PODCLASH_DATA.set(configName, configSectionType, unique(PODCLASH_DATA.get(configName, configSectionType)))
			})()
		)
		.catch(function () { });
}

const showAllRender = function (option_index, section_id, in_table) {
	let dv = E('div', {
		'style': 'display: inline-block;'
	})
	dom.content(dv,
		[E('button', {
			'class': 'cbi-button cbi-button-%s'.format(this.inputstyle || 'button'),
			'click': ui.createHandlerFn(this, function (section_id, ev) {
				if (this.onclick)
					return this.onclick(ev, section_id);
				ev.currentTarget.parentNode.nextElementSibling.value = value;
				return this.map.save();
			}, section_id)
		}, [this.section.showAll ? _('Show OWN') : _('Show ALL')])])
	return dv
}

const renderModalRowActions = function (section_id) {
	var tdEl = this.super('renderRowActions', [section_id, _('Edit')]),
		using = false,
		isRules = this.sectiontype.match(/^_rules_.+/) ? true : false

	if (!isRules) {
		for (var k in this.map.data.data) {
			if (this.map.data.data[k][this.sectiontype] && this.map.data.data[k][this.sectiontype].indexOf(section_id) >= 0) {
				using = true;
			}
		}
	}
	dom.content(tdEl.lastChild, [
		E('button', {
			'class': 'cbi-button cbi-button-positive',
			'click': ui.createHandlerFn(this, 'viewConfig', section_id),
			'title': _('View / Edit')
		}, _('View / Edit')),
		tdEl.lastChild.firstChild,
		isRules ? tdEl.lastChild.children[1] : '',
		this.parentsection.showAll ? E('button', {
			'class': 'cbi-button cbi-button-remove',
			'click': removeConfig.bind(this, section_id),
			'title': _('Remove'),
			'disabled': using ? true : null
		}, _('Remove')) : ""
	]);
	return tdEl;
};

const modalEnableFlagCFGValue = function (section_id) {
	const podclash_data = this.map.data.data
	const configName = this.section.parentsection.section
	// configSectionType: proxiex, proxy-goups, rule-providers, rules.
	const configSectionType = this.section.sectiontype.match(/^_rules_.+/) && 'rules' || this.section.sectiontype
	return (podclash_data[configName][configSectionType] && (podclash_data[configName][configSectionType].indexOf(section_id) >= 0)) ? true : false
}

const modalEnableFlagWrite = function (section_id, value) {
	const podclash_data = this.map.data.data
	const configName = this.section.parentsection.section
	// configSectionType: proxiex, proxy-goups, rule-providers, rules.
	const configSectionType = this.section.sectiontype.match(/^_rules_.+/) && 'rules' || this.section.sectiontype
	if (!podclash_data[configName][configSectionType])
		podclash_data[configName][configSectionType] = []
	const i = podclash_data[configName][configSectionType].indexOf(section_id)
	if (value == 1) {
		if (i >= 0)
			podclash_data[configName][configSectionType].splice(i, 1)
		podclash_data[configName][configSectionType].push(section_id)
	}
	else {
		if (i >= 0)
			podclash_data[configName][configSectionType].splice(i, 1)
	}
}

const modalFilter = function (section_id) {
	const podclash_data = this.map.data.data
	const configName = this.parentsection.section
	// configSectionType: proxiex, proxy-goups, rule-providers, rules.
	const configSectionType = this.sectiontype.match(/^_rules_.+/) && 'rules' || this.sectiontype
	if (this.parentsection.showAll) return true
	return podclash_data[configName][configSectionType] ? podclash_data[configName][configSectionType].reduce((y, x) => {
		if (x == section_id) {
			y = true
		}
		return y
	}, false) : false
}

const renderMoreOptionsModal = function (section_id, ev) {
	var parent = this.map,
		title = parent.title,
		name = null,
		m = new form.JSONMap({}, null, null),
		s = m.section(form.NamedSection, section_id, this.sectiontype);
	m.parent = parent
	m.data = parent.data
	m.readonly = parent.readonly

	s.tabs = this.tabs;
	s.tab_names = this.tab_names;
	s.parentmap = parent;

	if ((name = this.titleFn('modaltitle', section_id)) != null)
		title = name;
	else if ((name = this.titleFn('sectiontitle', section_id)) != null)
		title = '%s - %s'.format(parent.title, name);
	else if (!this.anonymous)
		title = '%s - %s'.format(parent.title, section_id);

	for (var i = 0; i < this.children.length; i++) {
		var o1 = this.children[i];

		if (o1.modalonly === false)
			continue;

		var o2 = s.option(o1.constructor, o1.option, o1.title, o1.description);

		for (var k in o1) {
			if (!o1.hasOwnProperty(k))
				continue;

			switch (k) {
				case 'map':
				case 'section':
				case 'option':
				case 'title':
				case 'description':
					continue;

				default:
					o2[k] = o1[k];
			}
		}
	}

	return Promise.resolve(
		this.addModalOptions(s, section_id, ev))
		.then(L.bind(m.render, m))
		.then(L.bind(function (nodes) {
			ui.showModal(title, [
				nodes,
				E('div', { 'class': 'right' }, [
					E('button', {
						'class': 'cbi-button',
						'click': ui.createHandlerFn(this, 'handleModalCancel', m, section_id)
					}, [_('Dismiss')]), ' ',
					E('button', {
						'class': 'cbi-button cbi-button-positive important',
						'click': ui.createHandlerFn(this, 'handleModalSave', m, section_id),
						'disabled': m.readonly || null
					}, [_('Save')])
				])
			], 'cbi-modal');
		}, this))
		.then((node) => {
			const rules_textarea = document.getElementById("rules_textarea")
			if (rules_textarea)
				genRulesCodeMirror(rules_textarea, section_id)
			return node
		})
		.catch(L.error);
}

const genRulesCodeMirror = function (el, section_id) {

	const hints = [
		['DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN', 'SRC-IP-CIDR', 'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'DST-PORT', 'SRT-PORT', 'MATCH'],
		[],
		['DIRECT','REJECT']
	]

	for (var x in PODCLASH_DATA.get()) {
		if (PODCLASH_DATA.get(x, '.type') == 'proxies') {
			hints[2].push({text: PODCLASH_DATA.get(x, '.name'), displayText:'fdfdf'})
		} else if (PODCLASH_DATA.get(x, '.type') == 'proxy-groups') {
			hints[2].unshift(PODCLASH_DATA.get(x, '.name'))
		}
	}

	const rulesCodeMirror = CodeMirror.CodeMirror.fromTextArea(el, {
		mode: "yaml",
		theme: "idea",
		// keyMap: "sublime",
		lineNumbers: true,
		smartIndent: true,
		indentUnit: 4,
		indentWithTabs: true,
		lineWrapping: true,
		gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
		foldGutter: true,
		autofocus: true,
		matchBrackets: true,
		autoCloseBrackets: true,
		styleActiveLine: true,
		hintOptions: {
			hint: synonyms
		},
	});
	const rule_yaml = jsyaml.dump({ rules: PODCLASH_DATA.get(section_id, 'rules') || ['MATCH,DIRECT'] }, { flowLevel: -1 })
	rulesCodeMirror.setOption("value", rule_yaml);

	function synonyms(cm, option) {
		return new Promise(function (accept) {
			setTimeout(function () {
				const list = []
				var cursor = cm.getCursor(), line = cm.getLine(cursor.line)
				var start = cursor.ch, end = cursor.ch
				// match ^ - 
				if (line.match(/^\s+\-\s/)){
					while (start && /\w/.test(line.charAt(start - 1)))
						--start
					while (end < line.length && /\w/.test(line.charAt(end)))
						++end
					var word = line.slice(start, end)
					const fields = line.split(',')
					const field = fields.length > 2 && 2 || fields.length - 1
					for (var j = 0; j < hints[field].length; j++) {
						if (hints[field][j].toString().toUpperCase().indexOf(word.toUpperCase()) != -1) {
							list.push(hints[field][j])
						}
					}
				}

				return accept({
					list: list,
					from: CodeMirror.CodeMirror.Pos(cursor.line, start),
					to: CodeMirror.CodeMirror.Pos(cursor.line, end)
				});
			}, 10)
		})
	}
	rulesCodeMirror.on("keyup", function (cm, event) {
		if (!cm.state.completionActive    /*Enables keyboard navigation in autocomplete list*/
			&& ((event.keyCode > 64 && event.keyCode < 122) || event.keyCode == 188 || event.keyCode == 32) // only when a letter key is pressed
			){
			CodeMirror.CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
		}
	});

	PODCLASH_DATA.set(section_id, '__rulesCodeMirror', rulesCodeMirror)
}

// podclash_data:podclash data, sid: section id, section: yaml section(proxies, proxy-groups...)
const genConfig = function (podclash_data, sid, needSectionType) {
	if (!podclash_data || !sid || !needSectionType || !podclash_data[sid] || !podclash_data[sid]['.type']) return
	const configSectionType = (podclash_data[sid]['.type'].match(/^_rules_.+/)) && 'rules' || podclash_data[sid]['.type']
	needSectionType = needSectionType.match(/^_rules_.+/) && 'rules' || needSectionType
	let part_config, k

	if (configSectionType != needSectionType) {
		if (configSectionType == 'Configuration') {
			// needSectionType: rules/proxies/proxy-groups/proxy-providers/rule-providers, we don't need template for roof
			part_config = {}
		} else if (!(needSectionType == 'proxy-providers' && configSectionType == 'proxies' && podclash_data[sid]['type'] == 'proxy-providers')) {
			return
		}
	} else {
		// get the template
		part_config = needSectionType == 'proxies' && JSON.parse(JSON.stringify(template[needSectionType][podclash_data[sid]['type']])) || JSON.parse(JSON.stringify(template[needSectionType]))
	}

	let clone_config = function (cfg, key) {
		for (k in cfg) {
			if (cfg[k] == null) {
				const dat = podclash_data[sid][k] || podclash_data[sid][key + '_' + k]
				// clone data
				cfg[k] = dat && JSON.parse(JSON.stringify(dat))
			} else if (typeof cfg[k] != 'string' && typeof cfg[k] != 'number' && typeof cfg[k] != 'boolean') {
				cfg[k] = clone_config(cfg[k], key && key + '_' + k || k)
			}
		}
		return isNullObj(cfg) ? undefined : cfg
	}
	// clone the data  based on field information in template
	if (configSectionType == 'proxies')
		part_config = clone_config(part_config, podclash_data[sid]['type']) || {}
	else
		part_config = clone_config(part_config) || {}

	switch (configSectionType) {
		case 'proxies':
			// for proxy-providers
			if (podclash_data[sid]['type'] == 'proxy-providers') {
				part_config = { [podclash_data[sid]['.name']]: part_config }
			} else {
				part_config['name'] = podclash_data[sid]['.name']
			}
			break;
		case 'proxy-groups':
			// handle for proxy-providers
			for (k in part_config['proxies']) {
				const proxyName = part_config['proxies'][k]
				if (podclash_data[proxyName] && podclash_data[proxyName]['type'] === 'proxy-providers') {
					part_config['use'] ? part_config['use'].push(proxyName) : part_config['use'] = [proxyName]
					part_config['proxies'].splice(k, 1)
				}
			}
			part_config['name'] = podclash_data[sid]['.name']
			break;
		case 'proxy-providers':
		case 'rule-providers':
			part_config = { [podclash_data[sid]['.name']]: part_config }
			break;
		// case 'rules':
		// 	if (part_config.type && part_config.type.toUpperCase() === 'MATCH')
		// 		part_config = part_config.type + ',' + part_config.policy
		// 	else
		// 		part_config = part_config.type + ',' + part_config.matcher + ',' + part_config.policy
		// 	break;
		case 'Configuration':
			let sections
			if (needSectionType == configSectionType) {
				sections = ['proxies', 'proxy-groups', 'rule-providers']
			} else {
				sections = [needSectionType]
			}
			sections.forEach(sec => {
				const __sec = (sec == 'proxies' && podclash_data[sid]['type'] == 'proxy-providers') && 'proxy-providers' || sec
				part_config[sec] = []
				for (k in podclash_data[sid][sec]) {
					const json_cfg = genConfig(podclash_data, podclash_data[sid][sec][k], __sec)
					if (podclash_data[podclash_data[sid][sec][k]] && podclash_data[podclash_data[sid][sec][k]]['type'] == 'proxy-providers' || sec == 'rule-providers') {
						const _sec = (sec == 'rule-providers') && 'rule-providers' || 'proxy-providers'
						if (part_config[_sec] && part_config[_sec].constructor === Object) {
							for (var l in json_cfg) {
								part_config[_sec][l] = json_cfg[l]
							}
						} else {
							part_config[_sec] = json_cfg
						}
					} else {
						part_config[sec].push(json_cfg)
					}
				}
				// for Configuration type, remove the null section, 
				// and for others reserve object [] or {}, it's use for show the null config section like: proxies:[]
				if (isNullObj(part_config[sec]) && needSectionType == 'Configuration') {
					part_config[sec] = undefined
				}
			})
			break;
	}

	if (needSectionType == 'Configuration') {
		return isNullObj(part_config) ? undefined : part_config
	}
	else {
		return part_config
	}
}

//jsonConfig: json, sname: section name(config name), section: yaml section (proxiex, proxy-groups, rule-providers..)
const resolveConfig = function (jsonConfig, sname, needSectionType) {
	needSectionType = needSectionType.match(/^_rules_.+/) && 'rules' || needSectionType

	//const unflatten = function (data) {
	// 	"use strict";
	// 	if (Object(data) !== data || Array.isArray(data))
	// 		return data;
	// 	var result = {}, cur, prop, idx, last, temp;
	// 	for (var p in data) {
	// 		cur = result, prop = "", last = 0;
	// 		do {
	// 			idx = p.indexOf("_", last);
	// 			temp = p.substring(last, idx !== -1 ? idx : undefined);
	// 			cur = cur[prop] || (cur[prop] = (!isNaN(parseInt(temp)) ? [] : {}));
	// 			prop = temp;
	// 			last = idx + 1;
	// 		} while (idx >= 0);
	// 		cur[prop] = data[p];
	// 	}
	// 	return result[""];
	// }
	const flatten = function (cfg, p) {
		var result = {};
		function recurse(cur, prop) {

			if (Object(cur) !== cur || Array.isArray(cur)) {
				result[prop] = cur;
				// } else if (Array.isArray(cur)) {
				// 	for (var i = 0, l = cur.length; i < l; i++)
				// 		recurse(cur[i], prop ? prop + "_" + i : "" + i);
				// 	if (l == 0)
				// 		result[prop] = [];
			} else {
				var isEmpty = true;
				for (var p in cur) {
					isEmpty = false;
					if (p == 'server' || p == 'port' || p == 'type' || p == 'port' || p == 'udp' || p == 'tls' || p == 'skip-cert-verify')
						recurse(cur[p], p);
					else
						recurse(cur[p], prop ? prop + "_" + p : p);
				}
				if (isEmpty)
					result[prop] = {};
			}
		}
		recurse(cfg, p);
		return result;
	}

	let k

	if (PODCLASH_DATA.get(sname, '.type') === 'Configuration' && needSectionType != 'Configuration') {
		needSectionType = 'Parts'
	}

	// console.log(jsonConfig, sname)

	switch (needSectionType) {
		case 'proxies':
			// has type means not proxy-providers
			if (jsonConfig['type']) {
				jsonConfig = flatten(jsonConfig, jsonConfig['type'])
			} else {
				jsonConfig = flatten(jsonConfig[sname], jsonConfig[sname]['type'])
			}
			break;
		case 'proxy-providers':
			jsonConfig = flatten(jsonConfig, jsonConfig['type'])
			break;
		case 'proxy-groups':
		case 'rule-providers':
			// jsonConfig = flatten(jsonConfig)
			break;
		// case 'rules':
		// 	const _rules = jsonConfig.split(',')

		// 	if (_rules[0] && _rules[0].toUpperCase() == 'MATCH') {
		// 		jsonConfig = {
		// 			type: _rules[0],
		// 			policy: _rules[1]
		// 		}
		// 	} else if (_rules.length >= 3) {
		// 		jsonConfig = {
		// 			type: _rules[0],
		// 			matcher: _rules[1],
		// 			policy: _rules[2]
		// 		}
		// 	}
		// 	break;
		case 'Configuration':
			['proxies', 'proxy-groups'].forEach(sec => {
				const names = []
				if (typeof jsonConfig[sec] != 'object') return
				jsonConfig[sec].forEach(proxy => {
					if (typeof proxy.name != 'string') return
					names.push(proxy.name)
					resolveConfig(proxy, proxy.name, sec)
				})
				jsonConfig[sec] = names
			})
			const sections = ['proxy-providers', 'rule-providers']
			for (k in sections) {
				const sec = sections[k]
				const names = []
				if (typeof jsonConfig[sec] == 'object') {
					for (k in jsonConfig[sec]) {
						names.push(k)
						resolveConfig(jsonConfig[sec][k], k, sec)
					}
					jsonConfig[sec] = names
				}
			}
			// const sec = 'rules'
			// const names = []
			// if (typeof jsonConfig[sec] == 'object') {
			// 	for (k in jsonConfig[sec]) {
			// 		names.push('_rules_' + sname + k)
			// 		resolveConfig(jsonConfig[sec][k], '_rules_' + sname + k, sec)
			// 	}
			// 	jsonConfig[sec] = names
			// }
			jsonConfig = flatten(jsonConfig)
			break;
		case 'Parts':
			['proxies', 'proxy-groups'].forEach(sec => {
				if (typeof jsonConfig[sec] != 'object') return
				jsonConfig[sec].forEach(proxy => {
					if (typeof proxy.name != 'string') return
					resolveConfig(proxy, proxy.name, sec)
				})
			})
			const parts = ['proxy-providers', 'rule-providers']
			for (k in parts) {
				const sec = parts[k]
				if (typeof jsonConfig[sec] == 'object') {
					for (k in jsonConfig[sec]) {
						resolveConfig(jsonConfig[sec][k], k, sec)
					}
				}
			}
			const _sec = 'rules'
			if (typeof jsonConfig[_sec] == 'object') {
				for (k in jsonConfig[_sec]) {
					resolveConfig(jsonConfig[_sec][k], '_rules_' + sname + k, _sec)
				}
			}
			jsonConfig = null
			break;
	}
	if (typeof jsonConfig === 'object') {
		jsonConfig['.type'] = (needSectionType == 'proxy-providers') && 'proxies' || ((needSectionType == 'rules') && sname.split(/\d+/)[0] || needSectionType)
		jsonConfig['.name'] = sname
		jsonConfig['.anonymous'] = false
		PODCLASH_DATA.set(sname, jsonConfig)
		// console.log(jsonConfig && { [sname]: jsonConfig })
	} else {
		console.log(jsonConfig)
		console.log(needSectionType)
		console.log(sname)
	}
}

const viewConfig = function (section_id, ev) {
	section_id = section_id ? section_id : this.parentsection.section
	ui.showModal(_('View: ' + this.sectiontype), [
		E('p', {}, [E('em', { 'style': 'white-space:pre' }, section_id)]),
		E('textarea', { 'class': 'view_edit_textarea', 'style': 'width:100%', 'rows': 28, },
			jsyaml.dump(genConfig(PODCLASH_DATA.get(), section_id, this.sectiontype), { flowLevel: 2 })
		),
		E('div', { 'class': 'right' }, [
			E('button', {
				'class': 'cbi-button',
				'click': (() => {
					if (this.sectiontype != "Configuration")
						this.parentsection.parentmap.children[1].renderMoreOptionsModal(this.parentsection.section)
					else
						ui.hideModal()
				})
			}, [_('Dismiss')]),
			E('button', {
				'class': 'cbi-button cbi-button-positive important',
				'click': (() => {
					resolveConfig(jsyaml.load(document.querySelector('.view_edit_textarea').value), section_id, this.sectiontype)
					if (this.sectiontype != "Configuration")
						this.parentsection.parentmap.children[1].renderMoreOptionsModal(this.parentsection.section)
					else
						ui.hideModal()
				})
			}, [_('Save')])
		])
	], 'cbi-modal')
}

const applyConfig = function (section_id) {

}

const removeConfig = function (section_id) {
	const config_name = this.uciconfig || this.map.config;

	this.map.data.remove(config_name, section_id);
	return this.map.save(null, true);
}

return baseclass.extend({
	data: PODCLASH_DATA,
	handleAddAtTop: handleAddAtTop,
	handleClear: handleClear,
	renderSectionAdd: renderSectionAdd,
	handleModalCancel: handleModalCancel,
	handleModalSave: handleModalSave,
	showAllRender: showAllRender,
	renderModalRowActions: renderModalRowActions,
	modalEnableFlagCFGValue: modalEnableFlagCFGValue,
	modalEnableFlagWrite: modalEnableFlagWrite,
	modalFilter: modalFilter,
	renderMoreOptionsModal: renderMoreOptionsModal,
	genConfig: genConfig,
	resolveConfig: resolveConfig,
	viewConfig: viewConfig,
	applyConfig: applyConfig,
	removeConfig: removeConfig,

	proxy_types: proxy_types,
	ciphers: ciphers,
	ssr_obfses: ssr_obfses,
	ssr_protocols: ssr_protocols,
	default_config: default_config
})