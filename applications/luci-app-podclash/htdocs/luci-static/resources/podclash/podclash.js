'use strict';
'require baseclass';
'require uci';
'require dom';
'require ui';
'require fs';
'require rpc';
'require request';
'require form';
'require podclash/js-yaml';
'require podclash/codemirror as CodeMirror';
'require podclash/tar as tar';

const SERVER_SIDE_CONFIG_PATH = '/etc/config/podclash'
const CLASH_CONFIG_PATH = '/clash/config.yaml'
const CLASH_PROXY_PROVIDERS_PATH = '/clash/proxies/'
const CLASH_RULE_PROVIDERS_PATH = '/clash/rules/'
const POD_NAME = 'podclash'
const CLASH_PORT = '9090'
const CLASH_SECRET = 'podclash'
const CREATE_POD_CLI = 'docker run -d --privileged -e TZ=Asia/Shanghai -p 9090:9090 -p 7890:7890 -p 7891:7891 -p 7892:7892 -p 7893:7893 -p 7894:7894 --restart unless-stopped --name podclash lisaac/podclash'
const FONT_PERFIX_RED = '<font style="font-weight: bold; color: #ff0000;">'
const FONT_PERFIX_GREEN = '<font style="font-weight: bold; color: #00aa00;">'
const FONT_SUFFIX = '</font>'
const FONT_TIMEOUT = FONT_PERFIX_RED + _("TIME OUT") + FONT_SUFFIX

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
		//clear codemirror objects, prefix with __
		clear: function () {
			const dat = this.get.apply(this, [].slice.call(arguments))
			const clr = function (obj) {
				for (var k in obj) {
					if (k.match(/^__.+/)) {
						delete obj[k]
					} else if (typeof obj[k] === 'object') {
						clr(obj[k])
					}
				}
			}
			clr(dat)
		},
		upload: function () {
			this.clear()
			const fmdata = new FormData()
			// clear codemirror objects
			const jsonfile = new File([JSON.stringify(_data)], "podclash", { type: "text/plan" })
			fmdata.append('sessionid', rpc.getSessionID())
			fmdata.append('filename', SERVER_SIDE_CONFIG_PATH)
			fmdata.append('filedata', jsonfile)
			request.post(L.env.cgi_base + '/cgi-upload', fmdata, {
				timeout: 0
			}).then(res => {
			}).catch(e => {
			})
		}
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
	"dns_nameserver": ['119.29.29.29', '119.28.28.28', '223.6.6.6', '223.5.5.5', 'tls://dns.rubyfish.cn:853'],
	"dns_fallback": ['tls://dns.rubyfish.cn:853', 'tls://8.8.4.4:853', 'tls://1.0.0.1:853']
}

const template = {
	"Configuration": {
		"port": null,
		"socks-port": null,
		"redir-port": 7892,
		"tproxy-port": 7893,
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
			},
			"hosts": null
		},
		"proxies": null,
		"proxy-providers": null,
		"proxy-groups": null,
		"rule-providers": null,
		"rules": null,
		"script": null
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
	// const isRules = this.sectiontype.match(/^_rules_.+/) ? true : false
	// if (isRules) {
	// 	for (var x in podclash_data) {
	// 		if (podclash_data[x]['.type'] == this.sectiontype) {
	// 			podclash_data[x] = []
	// 		}
	// 	}
	// } else {
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
	// }
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

const toSubconverter = function (url) {
	return 'http://127.0.0.1:25500/sub?target=clash&list=true&url=' + encodeURIComponent(url)
}

const handleModalSave = function (modalMap, sid, ev) {
	const configName = this.parentsection.section
	// let configSectionType = this.sectiontype.match(/^_rules_.+/) && 'rules' || this.sectiontype
	const configSectionType = this.sectiontype
	return modalMap.save(null, true)
		.then(L.bind(this.map.load, this.map))
		.then(L.bind(this.map.reset, this.map))
		.then(L.bind(function () { this.addedSection = null }, this))
		.then(this.map.parent.children[1].renderMoreOptionsModal(configName))
		.then(
			(() => {
				// handle proxy providers path and url(subconverter)
				if (configSectionType == 'proxies' && PODCLASH_DATA.get(sid, 'type') == 'proxy-providers') {
					if (PODCLASH_DATA.get(sid, 'proxy-providers_url') && PODCLASH_DATA.get(sid, 'proxy-providers_url') != "") {
						if (PODCLASH_DATA.get(sid, 'proxy-providers_url').match(/^http:\/\/127.0.0.1:25500\/sub\?target=clash&list=true&url=/) == null) {
							PODCLASH_DATA.set(sid, 'proxy-providers_url', toSubconverter(PODCLASH_DATA.get(sid, 'proxy-providers_url')))
							PODCLASH_DATA.set(sid, 'proxy-providers_path', CLASH_PROXY_PROVIDERS_PATH + sid + '.yaml')
						}
					}
				}
				// handle rule providers path
				if (configSectionType == 'rule-providers') {
					PODCLASH_DATA.set(sid, 'path', CLASH_RULE_PROVIDERS_PATH + sid + '.yaml')
				}
				// save the section name to podclash data
				PODCLASH_DATA.get(configName, configSectionType) ? PODCLASH_DATA.get(configName, configSectionType).push(sid) : PODCLASH_DATA.set(configName, configSectionType, [sid])
				function unique(arr) { return Array.from(new Set(arr)) }
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
		using = false
	// ,isRules = this.sectiontype.match(/^_rules_.+/) ? true : false

	// if (!isRules) {
	// 	for (var k in this.map.data.data) {
	// 		if (this.map.data.data[k][this.sectiontype] && this.map.data.data[k][this.sectiontype].indexOf(section_id) >= 0) {
	// 			using = true;
	// 		}
	// 	}
	// }
	dom.content(tdEl.lastChild, [
		E('button', {
			'class': 'cbi-button cbi-button-positive',
			'click': ui.createHandlerFn(this, 'viewConfig', section_id),
			'title': _('View / Edit')
		}, _('View / Edit')),
		tdEl.lastChild.firstChild,
		// isRules ? tdEl.lastChild.children[1] : '',
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
	// const configSectionType = this.section.sectiontype.match(/^_rules_.+/) && 'rules' || this.section.sectiontype
	const configSectionType = this.section.sectiontype
	return (podclash_data[configName][configSectionType] && (podclash_data[configName][configSectionType].indexOf(section_id) >= 0)) ? true : false
}

const modalEnableFlagWrite = function (section_id, value) {
	const podclash_data = this.map.data.data
	const configName = this.section.parentsection.section
	// configSectionType: proxiex, proxy-goups, rule-providers, rules.
	// const configSectionType = this.section.sectiontype.match(/^_rules_.+/) && 'rules' || this.section.sectiontype
	const configSectionType = this.section.sectiontype
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
	// const configSectionType = this.sectiontype.match(/^_rules_.+/) && 'rules' || this.sectiontype
	const configSectionType = this.sectiontype
	if (this.parentsection.showAll) return true
	return podclash_data[configName][configSectionType] ? podclash_data[configName][configSectionType].reduce((y, x) => {
		if (x == section_id) {
			y = true
		}
		return y
	}, false) : false
}

const renderMoreOptionsModal = function (section_id, ev) {
	if (this.parentsection) {
		// open new sub modal dialog, so we need to save the current modal dialog first
		this.parentsection.parentmap.children[1].handleModalSave(this.map, this.parentsection.section, true)
	}
	var parent = this.map,
		title = parent.title,
		name = null,
		m = new form.JSONMap({}, null, null),
		s = m.section(form.NamedSection, section_id, this.sectiontype)
	m.parent = parent
	m.data = parent.data
	m.readonly = parent.readonly
	m.save = function (cb, silent) {
		this.checkDepends()
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
		// .then(this.renderContents.bind(this));
	}

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
						'class': 'cbi-button cbi-button-positive',
						'click': ui.createHandlerFn(this, 'handleModalSave', m, section_id),
						'disabled': m.readonly || null
					}, [_('Save')]), ' ',
					E('button', {
						'class': 'cbi-button cbi-button-positive important',
						'click': ui.createHandlerFn(this, 'handleModalSave', m, section_id, undefined, true),
						'disabled': m.readonly || null
					}, [_('Save&Close')])
				])
			], 'cbi-modal');
		}, this))
		.then(() => {
			// create and render codemirror instance
			renderCodeMirrors(section_id)
		})
		.catch(L.error);
}

const renderCodeMirrors = function (section_id) {
	setTimeout(() => {
		const rules_textarea = document.getElementById("rules_textarea")
		const script_textarea = document.getElementById("script_textarea")
		const dns_hosts = document.getElementById("dns_hosts_textarea")
		if (rules_textarea) {
			genRulesCodeMirror(rules_textarea, section_id)
		}
		if (script_textarea) {
			const scriptCodeMirror = genCodeMirror(script_textarea, 'python')
			const script_yaml = jsyaml.dump({ script: PODCLASH_DATA.get(section_id, 'script') || { code: '\n' } }, { flowLevel: -1 })
			scriptCodeMirror.setOption("value", script_yaml);
			PODCLASH_DATA.set(section_id, "__scriptCodeMirror", scriptCodeMirror)
		}
		if (dns_hosts) {
			const dnsCodeMirror = genCodeMirror(dns_hosts, 'yaml')
			const dns_hosts_yaml = jsyaml.dump({ hosts: PODCLASH_DATA.get(section_id, 'dns_hosts') || {} }, { flowLevel: -1 })
			dnsCodeMirror.setOption("value", dns_hosts_yaml);
			PODCLASH_DATA.set(section_id, "__dnsCodeMirror", dnsCodeMirror)
		}
	}, 0)
}

const genCodeMirror = function (el, lang, customHint) {
	const CM = CodeMirror.CodeMirror.fromTextArea(el, {
		mode: lang,
		theme: "idea",
		// keyMap: "sublime",
		lineNumbers: true,
		smartIndent: true,
		tabSize: 2,
		indentUnit: 2,
		// indentWithTabs: true,
		lineWrapping: true,
		gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
		foldGutter: true,
		autofocus: true,
		matchBrackets: true,
		autoCloseBrackets: true,
		styleActiveLine: true,
		hintOptions: {
			hint: customHint
		}
	});
	CM.setOption("extraKeys", {
		"Tab": function (cm) {
			if (cm.somethingSelected()) {
				var sel = CM.getSelection("\n");
				// Indent only if there are multiple lines selected, or if the selection spans a full line
				if (sel.length > 0 && (sel.indexOf("\n") > -1 || sel.length === cm.getLine(cm.getCursor().line).length)) {
					cm.indentSelection("add");
					return;
				}
			}

			if (cm.options.indentWithTabs)
				cm.execCommand("insertTab");
			else
				cm.execCommand("insertSoftTab");
		},
		"Shift-Tab": function (cm) {
			cm.indentSelection("subtract");
		}
	});
	CM.on("keyup", function (cm, event) {
		if (!cm.state.completionActive    /*Enables keyboard navigation in autocomplete list*/
			&& ((event.keyCode > 64 && event.keyCode < 122) || event.keyCode == 188 || event.keyCode == 32) // only when a letter key is pressed
		) {
			CodeMirror.CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
		}
	});
	return CM
}

const genViewCodeMirror = function (el, section_id) {
	const viewCodeMirror = genCodeMirror(el, 'yaml')
	viewCodeMirror.setSize('100%', '100%')
	PODCLASH_DATA.set(section_id, "__viewCodeMirror", viewCodeMirror)
}

const genRulesCodeMirror = function (el, section_id) {
	const hints = [
		['DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN', 'SRC-IP-CIDR', 'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'DST-PORT', 'SRT-PORT', 'MATCH'],
		[],
		['DIRECT', 'REJECT']
	]
	for (var x in PODCLASH_DATA.get()) {
		if (PODCLASH_DATA.get(x, '.type') == 'proxies') {
			hints[2].push({ text: PODCLASH_DATA.get(x, '.name'), displayText: 'fdfdf' })
		} else if (PODCLASH_DATA.get(x, '.type') == 'proxy-groups') {
			hints[2].unshift(PODCLASH_DATA.get(x, '.name'))
		}
	}

	const rule_yaml = jsyaml.dump({ rules: PODCLASH_DATA.get(section_id, 'rules') || ['MATCH,DIRECT'] }, { flowLevel: -1 })
	const customHint = function (cm, option) {
		return new Promise(function (accept) {
			setTimeout(function () {
				const list = []
				var cursor = cm.getCursor(), line = cm.getLine(cursor.line)
				var start = cursor.ch, end = cursor.ch
				// match ^ - 
				if (line.match(/^\s+\-\s/)) {
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
				})
			}, 10)
		})
	}

	const rulesCodeMirror = genCodeMirror(el, 'yaml', customHint)
	rulesCodeMirror.setOption("value", rule_yaml);

	PODCLASH_DATA.set(section_id, '__rulesCodeMirror', rulesCodeMirror)
}

// podclash_data:podclash data, sid: section id, section: yaml section(proxies, proxy-groups...)
const genConfig = function (podclash_data, sid, needSectionType) {
	if (!podclash_data || !sid || !needSectionType || !podclash_data[sid] || !podclash_data[sid]['.type']) return
	// const configSectionType = (podclash_data[sid]['.type'].match(/^_rules_.+/)) && 'rules' || podclash_data[sid]['.type']
	const configSectionType = podclash_data[sid]['.type']
	// needSectionType = needSectionType.match(/^_rules_.+/) && 'rules' || needSectionType
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
				const dat = podclash_data[sid][key + '_' + k] || podclash_data[sid][k]
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
		// if (part_config.type && part_config.type.toUpperCase() === 'MATCH')
		// 	part_config = part_config.type + ',' + part_config.policy
		// else
		// 	part_config = part_config.type + ',' + part_config.matcher + ',' + part_config.policy
		// break;
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
					if (isNullObj(json_cfg) || !json_cfg) continue
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
				if (part_config[sec].length == 0 && needSectionType == 'Configuration') {
					delete part_config[sec]
				}
			})
			break;
	}

	if (needSectionType == 'Configuration') {
		return isNullObj(part_config) ? undefined : part_config
	} else {
		return part_config
	}
}
//jsonConfig: json, sname: section name(config name), section: yaml section (proxiex, proxy-groups, rule-providers..)
const resolveConfig = function (jsonConfig, sname, needSectionType) {
	let rv, isSectionofConfig;
	if (PODCLASH_DATA.get(sname, '.type') === 'Configuration' && needSectionType != 'Configuration') {
		// only resolve muti-proxies/proxy-groups/rule-providers section, not the global config...
		isSectionofConfig = true
		needSectionType = 'Configuration'
	}
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
					if (p == 'server' || p == 'port' || p == 'type' || p == 'udp' || p == 'tls' || p == 'skip-cert-verify')
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
	switch (needSectionType) {
		case 'proxies':
			// has type means not proxy-providers
			if (jsonConfig['type']) {
				// proxy
				rv = flatten(jsonConfig, jsonConfig['type'])
			} else {
				// proxy-providers
				rv = flatten(jsonConfig[sname], 'proxy-providers')
				rv['type'] = 'proxy-providers'
				rv['proxy-providers_path'] = CLASH_PROXY_PROVIDERS_PATH + sname + '.yaml'
			}
			break;
		case 'proxy-providers':
			if (jsonConfig['type']) {
				rv = flatten(jsonConfig, jsonConfig['type'])
			} else {
				rv = flatten(Object.values(jsonConfig)[0], Object.values(jsonConfig)[0]['type'])
			}
			break;
		// case 'proxy-groups':
		case 'rule-providers':
			if (jsonConfig['type']) {
				rv = jsonConfig
			} else {
				rv = Object.values(jsonConfig)[0]
			}
			rv['rule-providers_path'] = CLASH_RULE_PROVIDERS_PATH + sname + '.yaml'
			break;
		case 'Configuration':
			if (isSectionofConfig) {
				rv = { [sname]: {} };
			} else {
				rv = { [sname]: flatten(jsonConfig) };
				rv[sname]['.type'] = 'Configuration';
				rv[sname]['.name'] = sname;
				rv[sname]['.anonymous'] = false;
			};

			['proxies', 'proxy-groups'].forEach(sec => {
				if (typeof jsonConfig[sec] != 'object') return
				// clear meta data
				rv[sname][sec] = [];
				jsonConfig[sec].forEach(proxy => {
					if (!proxy || proxy == null || typeof proxy.name != 'string') return
					resolveConfig(proxy, proxy.name, sec)
						.then(resolved_obj => {
							rv[proxy.name] = resolved_obj
							rv[sname][sec].push(proxy.name)
						})
				})
			});
			['proxy-providers', 'rule-providers'].forEach(sec => {
				if (typeof jsonConfig[sec] != 'object') return
				const _sec = (sec === 'proxy-providers') && 'proxies' || sec
				rv[sname][_sec] = [];
				for (let k in jsonConfig[sec]) {
					if (jsonConfig[sec][k] && jsonConfig[sec][k] != null) {
						resolveConfig(jsonConfig[sec][k], k, sec)
							.then(resolved_obj => {
								rv[resolved_obj['.name']] = resolved_obj
								rv[sname][_sec].push(resolved_obj['.name'])
							})
					}
				}
			})
			break;
	}
	if (rv != null && typeof rv === 'object') {
		// add meta data for proxy/proxy-group/provider sections
		if (needSectionType != 'Configuration' && !isSectionofConfig) {
			rv['.type'] = (needSectionType == 'proxy-providers') && 'proxies' || needSectionType
			rv['.name'] = sname
			rv['.anonymous'] = false
		}
	} else {
		return Promise.reject(sname, needSectionType, rv)
	}
	// if (PODCLASH_DATA.get(sname) && needSectionType != 'Configuration') {
	// clear codemirror object first
	// PODCLASH_DATA.clear()
	// if (JSON.stringify(PODCLASH_DATA.get(sname)) != JSON.stringify(jsonConfig)) {
	// 	if (confirm(needSectionType + ': ' + sname + _(' is repeat with existing, do you wan\'t to overwrite??'))) {
	// 		PODCLASH_DATA.set(sname, jsonConfig)
	// 	}
	// } else {
	// 	PODCLASH_DATA.set(sname, jsonConfig)
	// }
	// }
	return Promise.resolve(rv)
}

const viewConfig = function (section_id, ev) {
	if (this.parentsection) {
		// view config will open new modal dialog, so we need to save the current modal dialog first
		this.parentsection.parentmap.children[1].handleModalSave(this.map, this.parentsection.section, true)
	}
	const sid = section_id ? section_id : this.parentsection.section
	ui.showModal(_('View: ' + sid + ' (' + this.sectiontype + ')'), [
		// E('p', {}, [E('em', { 'style': 'white-space:pre' }, this.sectiontype)]),
		E('div', { 'style': 'border: 1px solid #ccc;border-radius:3px;width:100%;' },
			E('textarea', { 'class': 'view_edit_textarea', 'id': 'view_edit_textarea', 'style': 'width:100%', 'rows': 28, },
				jsyaml.dump(genConfig(PODCLASH_DATA.get(), sid, this.sectiontype), { flowLevel: 2 })
			)
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
			}, [_('Dismiss')]), ' ',
			this.sectiontype == "Configuration" ? E('button', {
				'class': 'cbi-button cbi-button-apply',
				'click': (() => {
					const yaml = document.getElementById('view_edit_textarea').innerHTML
					const yamlfile = new File([yaml], section_id + '.yaml', { type: "text/plan" })
					const dl_link = document.createElement('a');
					dl_link.href = window.URL.createObjectURL(yamlfile);
					dl_link.download = section_id + '.yaml';
					dl_link.click();
				})
			}, [_('Download')]) : '', ' ',
			E('button', {
				'class': 'cbi-button cbi-button-positive important',
				'click': (() => {
					const yaml = PODCLASH_DATA.get(sid, '__viewCodeMirror').getValue()
					try {
						resolveConfig(jsyaml.load(yaml), sid, this.sectiontype)
							.then(resolved_obj => {
								if (resolved_obj['.type']) {
									// resolved object has type, its A single proxy/group/provider section.
									PODCLASH_DATA.set(resolved_obj['.name'], resolved_obj)
								} else {
									let k, cancel;
									// its configuration or proxies/groups/providers
									if (resolved_obj[sid]['.type']) {
										// overwrite whole configuration
										PODCLASH_DATA.set(sid, resolved_obj[sid])
									} else {
										for (k in resolved_obj[sid]) {
											// rewirte proxies/groups/providers
											PODCLASH_DATA.set(sid, k, resolved_obj[sid][k])
										}
									}
									// handle proxies/groups/providers sections
									const duplicated = []
									for (k in resolved_obj) {
										// skip configuration
										if (k == sid) continue;
										if (PODCLASH_DATA.get(k)) {
											const compare = function (origin, target) {
												if (typeof target !== "object") {
													return origin === target;
												}
												if (typeof origin !== "object") {
													return false;
												}
												for (let key of Object.keys(target)) {
													if (!compare(origin[key], target[key])) {
														return false;
													}
												}
												return true;
											}
											// PODCLASH_DATA.clear(k)
											// if (JSON.stringify(PODCLASH_DATA.get(k)) != JSON.stringify(resolved_obj[k]))
											if (!compare(PODCLASH_DATA.get(k), resolved_obj[k]))
												duplicated.push(resolved_obj[k]['.type'] + ': ' + k)
										}
									}
									if (duplicated.length > 0) {
										if (!confirm(_('!!!DUPLICATE EXISTS WARNING!!!') + '\n' + duplicated.join('\n') + _('\nDo you wan\'t to overwrite??'))) {
											cancel = true
										}
									}
									if (cancel) return
									for (k in resolved_obj) {
										// skip configuration
										if (k == sid) continue;
										PODCLASH_DATA.set(k, resolved_obj[k])
									}
								}

								// render modal
								if (this.sectiontype != "Configuration") {
									this.parentsection.parentmap.children[1].renderMoreOptionsModal(this.parentsection.section)
								} else {
									PODCLASH_DATA.clear()
									// different handleModalSave doing differents, view/edit button in global, it'll upload configurations to server
									this.handleModalSave(this.map, section_id)
									ui.hideModal()
								}
							})
					} catch (error) {
						alert(error)
						throw (error)
					}

				})
			}, [_('Save')])
		])
	], 'cbi-modal')
	const view_edit_textarea = document.querySelector('.view_edit_textarea')
	if (view_edit_textarea)
		genViewCodeMirror(view_edit_textarea, sid)
}

async function file2Tar(tarFile, fileToLoad) {
	if (!fileToLoad) return
	function file2Byte(file) {
		return new Promise((resolve, reject) => {
			var fileReader = new FileReader();
			fileReader.onerror = () => {
				fileReader.abort();
				reject(new DOMException("Problem parsing input file."));
			};
			fileReader.onload = (fileLoadedEvent) => {
				resolve(tar.ByteHelper.stringUTF8ToBytes(fileLoadedEvent.target.result));
			}
			fileReader.readAsBinaryString(file);
		})
	}
	const x = await file2Byte(fileToLoad)
	return fileByte2Tar(tarFile, fileToLoad.name, x).downloadAs(fileToLoad.name + ".tar")
}

function fileByte2Tar(tarFile, fileName, fileBytes) {
	if (!tarFile) tarFile = tar.TarFile.create(fileName)
	var tarHeader = tar.TarFileEntryHeader.default();
	var tarFileEntryHeader = new tar.TarFileEntryHeader
		(
			// tar.ByteHelper.bytesToStringUTF8(fileName),
			fileName,
			tarHeader.fileMode,
			tarHeader.userIDOfOwner,
			tarHeader.userIDOfGroup,
			fileBytes.length, // fileSizeInBytes,
			tarHeader.timeModifiedInUnixFormat, // todo
			0, // checksum,
			tar.TarFileTypeFlag.Instances().Normal,
			tarHeader.nameOfLinkedFile,
			tarHeader.uStarIndicator,
			tarHeader.uStarVersion,
			tarHeader.userNameOfOwner,
			tarHeader.groupNameOfOwner,
			tarHeader.deviceNumberMajor,
			tarHeader.deviceNumberMinor,
			tarHeader.filenamePrefix
		);

	tarFileEntryHeader.checksumCalculate();
	var entryForFileToAdd = new tar.TarFileEntry
		(
			tarFileEntryHeader,
			fileBytes
		);

	tarFile.entries.push(entryForFileToAdd);
	return tarFile
}

const applyConfig = async function (section_id, ev) {
	if (!PODCLASH_DATA.get(section_id) || PODCLASH_DATA.get(section_id)['.type'] != 'Configuration') return
	ev.target.innerHTML = _('Applying')
	ev.target.setAttribute('class', 'cbi-button cbi-button-remove')
	const yaml = jsyaml.dump(genConfig(PODCLASH_DATA.get(), section_id, 'Configuration'))
	const yamlfile = new File([yaml], 'config.yaml', { type: "text/plan" })
	document.cookie = 'sysauth=' + encodeURIComponent(L.env.sessionid) + ";path=/socket";
	tar.Globals.Instance.tarFile = tar.TarFile.create("Archive.tar")
	const tarfile = await file2Tar(tar.Globals.Instance.tarFile, yamlfile)
	let [podIP, podRunning] = await getPodIP(POD_NAME)
	if (!podRunning) {
		ui.addNotification(null, _("Apply configuration ")  + section_id + _(" ERROR: no container or container not running!"))
		return
	}

	sendXHR('PUT', '/socket/containers/' + POD_NAME + '/archive?path=/clash/', {
		'socket_path': '/var/run/docker.sock',
		'Content-Type': 'application/json'
	}, tarfile, function () {
		if (this.status == 200) {
			sendXHR('PUT', "http://" + podIP + ":" + CLASH_PORT + "/configs?force=true", {
				'Authorization': "Bearer " + CLASH_SECRET,
			}, '{"path": "' + CLASH_CONFIG_PATH + '"}', function () {
				if (this.status < 300) {
					getClashInfo()
					setTimeout(() => {
						ev.target.innerHTML = _('Succeed')
						ev.target.setAttribute('class', 'cbi-button cbi-button-save')
					}, 500);
					setTimeout(() => {
						ev.target.innerHTML = _('Apply')
						ev.target.setAttribute('class', 'cbi-button cbi-button-apply')
					}, 3000);
				} else {
					// alert(JSON.parse(this.response).message)
					ui.addNotification(null, _("Apply configuration ")  + section_id + " ERROR: " + JSON.parse(this.response).message)
					setTimeout(() => {
						ev.target.innerHTML = _('Failed')
						ev.target.setAttribute('class', 'cbi-button cbi-button-remove')
					}, 500);
					setTimeout(() => {
						ev.target.innerHTML = _('Apply')
						ev.target.setAttribute('class', 'cbi-button cbi-button-apply')
					}, 3000);
				}
			})
		} else {
			ui.addNotification(null, _("Apply configuration ") + section_id + " ERROR: " + this.response)
			setTimeout(() => {
				ev.target.innerHTML = _('Failed')
				ev.target.setAttribute('class', 'cbi-button cbi-button-remove')
			}, 500);
			setTimeout(() => {
				ev.target.innerHTML = _('Apply')
				ev.target.setAttribute('class', 'cbi-button cbi-button-apply')
			}, 3000);
		}
	})
}

const removeConfig = function (section_id) {
	if (confirm(_('!!! DELETE Configuration !!!\n??? Are you sure to DELETE the Configuration: ') + section_id + ' ???')) {
		const config_name = this.uciconfig || this.map.config;

		this.map.data.remove(config_name, section_id);
		this.map.save(this.map, section_id)
			.then(PODCLASH_DATA.upload())
	}
}

const getPodIP = function (pod_name) {
	document.cookie = 'sysauth=' + encodeURIComponent(L.env.sessionid) + ";path=/socket";
	return request.request('/socket/containers/' + pod_name + '/json', {
		method: 'GET',
		query: {},
		headers: {
			'Content-Type': 'application/json',
			'socket_path': '/var/run/docker.sock'
		},
		credentials: true
	}).then((res) => {
		if (res.status < 300) {
			const r = JSON.parse(res.responseText)
			if (r.NetworkSettings && r.NetworkSettings.Networks) {
				for (var i in r.NetworkSettings.Networks) {
					// if bridge network using host ip
					return [i == 'bridge' ? location.hostname : (r.NetworkSettings.Networks[i].IPAddress || r.NetworkSettings.Networks[i].IPAMConfig.IPv4Address), r.State.Running]
				}
			}
		} else {
			return []
		}
	})
}

const sendXHR = function (method, url, header, body, cb, cb_err) {
	let xhr = new XMLHttpRequest()
	xhr.open(method, url, true)
	for (var k in header) {
		xhr.setRequestHeader(k, header[k])
	}
	xhr.onload = cb
	xhr.onerror = cb_err
	xhr.send(body)
}

const getPodLogs = function () {
	document.cookie = 'sysauth=' + encodeURIComponent(L.env.sessionid) + ";path=/socket";
	let logs = ''
	sendXHR('GET', '/socket/containers/' + POD_NAME + '/logs?stdout=1&stderr=1&tail=1000', {
		"socket_path": '/var/run/docker.sock'
	}, null, function () {
		// let _length = 0, index = 0
		// while (index < this.response.length) {
		// 	_length = this.response[index + 4].charCodeAt(0) * 256 * 256 * 256 + this.response[index + 5].charCodeAt(0) * 256 * 256 + this.response[index + 6].charCodeAt(0) * 256 + this.response[index + 7].charCodeAt(0)
		// 	if (index + 8 + _length > this.response.length) {
		// 		break;
		// 	}
		// 	logs += this.response.substr(index + 8, _length)
		// 	index += (_length + 8)
		// }
		if (this.status >= 300) return
		const buf = this.response.split('\n')
		buf.forEach(line => {
			logs += line.substr(8) + '\n'
		})
		document.getElementById('clashlog').rows = buf.length + 1
		document.getElementById('clashlog').innerHTML = logs
	})

}

const _getClashInfo = function (podIP) {
	sendXHR('GET', "http://" + podIP + ":" + CLASH_PORT + "/configs", {
		'Authorization': "Bearer " + CLASH_SECRET
	}, null, function () {
		if (this.status < 300) {
			const res = JSON.parse(this.response)
			const h = {
				'_INFO_00pod_name': '<a href=' + L.env.scriptname + '/admin/docker/container/' + POD_NAME + '>' + POD_NAME + '</a>',
				'_INFO_01pod_ip': podIP,
				'_INFO_11clash_running_mode': res.mode.toUpperCase(),
				// '_INFO_12clash_proxies_rules': '',
				'_INFO_13clash_ports': 'Http: <b>' + res.port + '</b> | Socks: <b>' + res['socks-port'] + '</b> | Mixed: <b>' + res['mixed-port'] + '</b>',
				'_INFO_22clash_dashboard': "<a target=\"_blank\" href=http://" + podIP + ":" + CLASH_PORT + "/ui>http://" + podIP + ":" + CLASH_PORT + "/ui</a>",
				// '_INFO_21external_controller': "http://" + podIP + ":" + CLASH_PORT + "<br>Secret: " + CLASH_SECRET
			}
			for (var k in h) {
				const id = 'cbi-json-' + k + '-value'
				document.getElementById(id).children[0].innerHTML = h[k]
			}
		} else {
			ui.addNotification(null, _('Get CLASH info ERROR, make sure CLASH STARTED and you can ACCESS CLASH API !!'))
			document.getElementById('cbi-json-_INFO_00pod_name-value').children[0].innerHTML =  _('Get CLASH info ERROR, make sure CLASH STARTED and you can ACCESS CLASH API !!')
		}
	}, function(){
		ui.addNotification(null, _('Get CLASH info ERROR, make sure CLASH STARTED and you can ACCESS CLASH API !!'))
		document.getElementById('cbi-json-_INFO_00pod_name-value').children[0].innerHTML =  _('Get CLASH info ERROR, make sure CLASH STARTED and you can ACCESS CLASH API !!')
	})

	sendXHR('GET', "http://" + podIP + ":" + CLASH_PORT + "/proxies", {
		'Authorization': "Bearer " + CLASH_SECRET
	}, null, function () {
		if (this.status < 300) {
			const res = JSON.parse(this.response)
			let count = 0
			for (var k in res.proxies) {
				count++
			}
			count -= 3
			let val = document.getElementById('cbi-json-_INFO_12clash_proxies_rules-value').children[0].innerHTML
			val = val.replace(/Proxies: [\d\-]+/, 'Proxies: <b>' + count + '</b>')
			document.getElementById('cbi-json-_INFO_12clash_proxies_rules-value').children[0].innerHTML = val
		}
	})
	sendXHR('GET', "http://" + podIP + ":" + CLASH_PORT + "/rules", {
		'Authorization': "Bearer " + CLASH_SECRET
	}, null, function () {
		if (this.status < 300) {
			const res = JSON.parse(this.response)
			let val = document.getElementById('cbi-json-_INFO_12clash_proxies_rules-value').children[0].innerHTML
			val = val.replace(/Rules: [\d\-]+/, 'Rules: <b>' + String(res.rules.length) + '</b>')
			document.getElementById('cbi-json-_INFO_12clash_proxies_rules-value').children[0].innerHTML = val
		}
	})
	sendXHR('GET', "http://" + podIP + ":" + CLASH_PORT + "/version", {
		'Authorization': "Bearer " + CLASH_SECRET
	}, null, function () {
		if (this.status < 300) {
			const res = JSON.parse(this.response)
			document.getElementById('cbi-json-_INFO_10clash_version-value').children[0].innerHTML = res.version
		}
	})
}

const getPodNetworkInfo = function () {
	document.cookie = 'sysauth=' + encodeURIComponent(L.env.sessionid) + ";path=/socket";
	sendXHR('POST', "/socket/containers/" + POD_NAME + "/exec", {
		"socket_path": '/var/run/docker.sock',
		"Content-Type": 'application/json'
	}, JSON.stringify({
		"AttachStdin": false,
		"AttachStdout": true,
		"AttachStderr": true,
		"Tty": false,
		"Cmd": ["/check_connect.sh"]
	}), function () {
		if (this.status < 300) {
			const res = JSON.parse(this.response)
			if (res.Id) {
				sendXHR('POST', "/socket/exec/" + res.Id + "/start", {
					"socket_path": '/var/run/docker.sock',
					"Content-Type": 'application/json'
				}, '{}', function () {
					let res = this.response
					res = JSON.parse(res.substring(res.indexOf('{'), res.lastIndexOf(',')) + '}')
					const ip_item = document.getElementById('cbi-json-_INFO_31public_ip-value')
					ip_item.children[0].innerHTML =
						_('IPIP.NET: ') + (res.ip_from_ipip && FONT_PERFIX_RED + res.ip_from_ipip + FONT_SUFFIX || FONT_TIMEOUT) + ' | ' +
						_('Taobao: ') + (res.ip_from_taobao && FONT_PERFIX_RED + res.ip_from_taobao + FONT_SUFFIX || FONT_TIMEOUT) + ' <br/> ' +
						_('IP.SB: ') + (res.ip_from_sb && FONT_PERFIX_RED + res.ip_from_sb + FONT_SUFFIX || FONT_TIMEOUT) + ' | ' +
						_('Google: ') + (res.ip_from_google && FONT_PERFIX_RED + res.ip_from_google + FONT_SUFFIX || FONT_TIMEOUT)
					const timeout_item = document.getElementById('cbi-json-_INFO_31connect_check-value')
					timeout_item.children[0].innerHTML =
						_('Baidu: ') + (res.access_baidu_code == '200' && FONT_PERFIX_RED + ((res.access_baidu_timeout * 1000).toFixed(2) + 'ms') + FONT_SUFFIX || FONT_TIMEOUT) + ' | ' +
						_('Taobao: ') + (res.access_taobao_code == '200' && FONT_PERFIX_RED + ((res.access_taobao_timeout * 1000).toFixed(2) + 'ms') + FONT_SUFFIX || FONT_TIMEOUT) + ' <br/> ' +
						_('Github: ') + (res.access_github_code == '200' && FONT_PERFIX_RED + ((res.access_github_timeout * 1000).toFixed(2) + 'ms') + FONT_SUFFIX || FONT_TIMEOUT) + ' | ' +
						_('Google: ') + (res.access_google_code == '204' && FONT_PERFIX_RED + ((res.access_google_timeout * 1000).toFixed(2) + 'ms') + FONT_SUFFIX || FONT_TIMEOUT)
				})
			}
		} else {
			ui.addNotification(null, _("Get Public IP/Connect Check ERROR!"))
		}
	})
}

const getClashInfo = async function () {
	let [podIP, podRunning] = await getPodIP(POD_NAME)
	if (podRunning == true) {
		if (podIP) {
			_getClashInfo(podIP)
			getPodNetworkInfo()
		} else {
			document.getElementById('cbi-json-_INFO_00pod_name-value').children[0].innerHTML = _('Please start Container: ' + '<a href=' + L.env.scriptname + '/admin/docker/container/' + POD_NAME + '>' + POD_NAME + '</a>' + ' first!')
		}
	} else if (podRunning == false) {
		// not running
		ui.addNotification(null, _('Please start Container: ' + '<a href=' + L.env.scriptname + '/admin/docker/container/' + POD_NAME + '>' + POD_NAME + '</a>' + ' first!'))
		document.getElementById('cbi-json-_INFO_00pod_name-value').children[0].innerHTML = _('Please start Container: ' + '<a href=' + L.env.scriptname + '/admin/docker/container/' + POD_NAME + '>' + POD_NAME + '</a>' + ' first!')
	} else {
		//no container
		const cmd = "DOCKERCLI -d --privileged -e TZ=Asia/Shanghai -p 9090:9090 -p 7890:7890 -p 7891:7891 -p 7892:7892 -p 7893:7893 --restart unless-stopped --name " + POD_NAME + " lisaac/podclash"
		ui.addNotification(null, '<a href="' + L.env.cgi_base + '/luci/admin/docker/newcontainer/' + cmd + ' ">' + _('No Container: ' + POD_NAME + ' found, pleae create it first!') + '</a>')

		document.getElementById('cbi-json-_INFO_00pod_name-value').children[0].innerHTML = '<a href="' + L.env.cgi_base + '/luci/admin/docker/newcontainer/' + cmd + ' ">' + _('No Container: ' + POD_NAME + ' found, pleae create it first!') + '</a>'
	}
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
	isNullObj: isNullObj,
	genRulesCodeMirror: genRulesCodeMirror,
	genCodeMirror: genCodeMirror,
	renderCodeMirrors: renderCodeMirrors,
	getClashInfo: getClashInfo,
	getPodNetworkInfo: getPodNetworkInfo,
	getPodLogs: getPodLogs,

	proxy_types: proxy_types,
	ciphers: ciphers,
	ssr_obfses: ssr_obfses,
	ssr_protocols: ssr_protocols,
	default_config: default_config,
	SERVER_SIDE_CONFIG_PATH: SERVER_SIDE_CONFIG_PATH
})