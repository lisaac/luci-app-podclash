#!/bin/sh

# thanks ss-tproxy(https://github.com/zfl9/ss-tproxy)

INTERFACE_LO='lo'
ROUTE_TABLE='233'
TPROXY_MARK='0x2333'
SET_SNAT='false'
SET_SNAT6='false'
IPV4='true'
IPV6='false'
DNS_WHILE_STOPED='223.5.5.5'

is_support_tproxy() {
	[ "$(lsmod | grep tproxy)" != "" ]
}

is_support_tproxy && TCP_TPROXY='true'
PROXY_PROCUSER='daemon'

WHITElIST_PATH='/clash/whitelist'
CLASH_PATH="/clash"
CLASH_CONFIG="$CLASH_PATH/config/config.yaml"
CLASH_DEFAULT_CONFIG="$CLASH_PATH/config/default.yaml"
CLASH_REDIR_PORT=7892
CLASH_TPROXY_PORT=7893
CLASH_DNS_PORT=53
SUBCONVERTER_PATH="/subconverter"
YACD_PATH="$CLASH_PATH/yacd"
[ -f "$CLASH_CONFIG" ] && CLASH_FAKE_IP=$(grep fake-ip-range: ${CLASH_CONFIG} | awk -F'[:",]' '{ for(i=1; i<=NF; i++) if($i ~ /fake-ip-range/) print $(i+2)}')

readonly IPV4_RESERVED_IPADDRS='0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/4 240.0.0.0/4 255.255.255.255/32'
readonly IPV6_RESERVED_IPADDRS='::/128 ::1/128 ::ffff:0:0/96 ::ffff:0:0:0/96 64:ff9b::/96 100::/64 2001::/32 2001:20::/28 2001:db8::/32 2002::/16 fc00::/7 fe80::/10 ff00::/8'

log_info() {
	echo -e "$(date +%Y-%m-%d\ %T) $1"
}

is_true() {
	[ "$1" = 'true' ]
}

is_false() {
	[ "$1" = 'false' ]
}

is_ipv4_ipts() {
	[ "$1" = 'iptables' ]
}

is_ipv6_ipts() {
	[ "$1" = 'ip6tables' ]
}



is_empty_iptschain() {
	local ipts="$1" table="$2" chain="$3"
	[ $($ipts -t $table -nvL $chain --line-numbers | grep -Ec '^[0-9]') -eq 0 ]
}

file_is_exists() {
	[ -f "$1" ]
}

command_is_exists() {
	command -v "$1" &>/dev/null
}

process_is_running() {
	kill -0 "$1" &>/dev/null
}

tcp_port_is_exists() {
	[ $($netstat -lnpt | grep -E ":$1[ \t]" | wc -l) -ne 0 ]
}

udp_port_is_exists() {
	[ $($netstat -anpu | grep -E ":$1[ \t]" | wc -l) -ne 0 ]
}

set_sysctl_option() {
	local option_name="$1" option_value="$2"
	if command_is_exists "sysctl"; then
		sysctl -w "$option_name=$option_value" &>/dev/null
	else
		local option_path="/proc/sys/${option_name//.//}"
		echo "$option_value" >$option_path
	fi
}

enable_ipforward() {
	is_true "$IPV4" && set_sysctl_option 'net.ipv4.ip_forward' 1
	is_true "$IPV6" && set_sysctl_option 'net.ipv6.conf.all.forwarding' 1
}

enable_rtlocalnet() {
	log_info "Setting sysctl options.."
	set_sysctl_option 'net.ipv4.conf.all.route_localnet' 1
	# https://github.com/springzfx/cgproxy#known-issues
	set_sysctl_option 'net.bridge.bridge-nf-call-iptables' 0
	set_sysctl_option 'net.bridge.bridge-nf-call-ip6tables' 0
	set_sysctl_option 'net.bridge.bridge-nf-call-arptables' 0
}

_flush_iptables() {
	$1 -t mangle -D PREROUTING  -j TP_PREROUTING  &>/dev/null
	$1 -t mangle -D OUTPUT      -j TP_OUTPUT      &>/dev/null
	$1 -t nat    -D PREROUTING  -j TP_PREROUTING  &>/dev/null
	$1 -t nat    -D OUTPUT      -j TP_OUTPUT      &>/dev/null
	$1 -t nat    -D POSTROUTING -j TP_POSTROUTING &>/dev/null

	$1 -t mangle -F TP_PREROUTING  &>/dev/null
	$1 -t mangle -X TP_PREROUTING  &>/dev/null
	$1 -t mangle -F TP_OUTPUT      &>/dev/null
	$1 -t mangle -X TP_OUTPUT      &>/dev/null
	$1 -t nat    -F TP_PREROUTING  &>/dev/null
	$1 -t nat    -X TP_PREROUTING  &>/dev/null
	$1 -t nat    -F TP_OUTPUT      &>/dev/null
	$1 -t nat    -X TP_OUTPUT      &>/dev/null
	$1 -t nat    -F TP_POSTROUTING &>/dev/null
	$1 -t nat    -X TP_POSTROUTING &>/dev/null

	$1 -t mangle -F TP_RULE &>/dev/null
	$1 -t mangle -X TP_RULE &>/dev/null
	$1 -t nat    -F TP_RULE &>/dev/null
	$1 -t nat    -X TP_RULE &>/dev/null

	$1 -t raw -F    &>/dev/null
	$1 -t raw -X    &>/dev/null
	$1 -t mangle -F &>/dev/null
	$1 -t mangle -X &>/dev/null
	$1 -t nat -F    &>/dev/null
	$1 -t nat -X    &>/dev/null
	$1 -t filter -F &>/dev/null
	$1 -t filter -X &>/dev/null
}

flush_iptables() {
	is_true "$IPV4" && _flush_iptables "iptables"
	is_true "$IPV6" && _flush_iptables "ip6tables"
}

_delete_unused_iptchains() {
	if is_empty_iptschain $1 mangle TP_PREROUTING; then
		$1 -t mangle -D PREROUTING -j TP_PREROUTING
		$1 -t mangle -X TP_PREROUTING
	fi
	if is_empty_iptschain $1 mangle TP_OUTPUT; then
		$1 -t mangle -D OUTPUT -j TP_OUTPUT
		$1 -t mangle -X TP_OUTPUT
	fi
	if is_empty_iptschain $1 nat TP_PREROUTING; then
		$1 -t nat -D PREROUTING -j TP_PREROUTING
		$1 -t nat -X TP_PREROUTING
	fi
	if is_empty_iptschain $1 nat TP_OUTPUT; then
		$1 -t nat -D OUTPUT -j TP_OUTPUT
		$1 -t nat -X TP_OUTPUT
	fi
	if is_empty_iptschain $1 nat TP_POSTROUTING; then
		$1 -t nat -D POSTROUTING -j TP_POSTROUTING
		$1 -t nat -X TP_POSTROUTING
	fi
}

delete_unused_iptchains() {
	is_true "$IPV4" && _delete_unused_iptchains "iptables"
	is_true "$IPV6" && _delete_unused_iptchains "ip6tables"
}

delete_iproute2() {
	is_true "$IPV4" && {
		ip -4 rule  del   table $ROUTE_TABLE
		ip -4 route flush table $ROUTE_TABLE
	} &>/dev/null

	is_true "$IPV6" && {
		ip -6 rule  del   table $ROUTE_TABLE
		ip -6 route flush table $ROUTE_TABLE
	} &>/dev/null
}

add_white_list4() {
	#$1: iptables, $2: table, $3 chain
	[ ! -f ${WHITElIST_PATH}/whitelist4 ] && return
	while read line
	do 
		local host=$(echo $line | awk -F':' '{print $1}')
		local port=$(echo $line | awk -F':' '{print $2}')
		
		if [ "$host" -a "$port" ]; then
			$1 -t $2 -A $3 -s $host -p udp -m multiport --sports $port -j RETURN
			$1 -t $2 -A $3 -s $host -p tcp -m multiport --sports $port -j RETURN
		elif [ "$host" ]; then
			$1 -t $2 -A $3 -s $host -j RETURN
		elif [ "$port" ]; then
			$1 -t $2 -A $3 -p udp -m multiport --sports $port -j RETURN
			$1 -t $2 -A $3 -p tcp -m multiport --sports $port -j RETURN
		fi
	done < ${WHITElIST_PATH}/whitelist4
}

loopback_addr() {
	is_ipv4_ipts $1 && echo "127.0.0.1" || echo "::1"
}

privaddr_array() {
	is_ipv4_ipts $1 && echo ${IPV4_RESERVED_IPADDRS} || echo ${IPV6_RESERVED_IPADDRS}
}

start_iptables_tproxy_mode() {
	######################### TP_RULE (tcp and udp) #########################
	$1 -t mangle -N TP_RULE
	$1 -t mangle -A TP_RULE -j CONNMARK --restore-mark
	$1 -t mangle -A TP_RULE -m mark --mark $TPROXY_MARK -j RETURN
	# $1 -t mangle -A TP_RULE -p udp --dport 53           -j RETURN
	for privaddr in $(privaddr_array $1); do $1 -t mangle -A TP_RULE -d $privaddr -j RETURN; done

	$1 -t mangle -A TP_RULE -p tcp --syn -j MARK --set-mark $TPROXY_MARK
	$1 -t mangle -A TP_RULE -p udp -m conntrack --ctstate NEW -j MARK --set-mark $TPROXY_MARK
	$1 -t mangle -A TP_RULE -j CONNMARK --save-mark
	######################### TP_OUTPUT/TP_PREROUTING #########################
	$1 -t mangle -A TP_OUTPUT -m owner --uid-owner $PROXY_PROCUSER -j RETURN
	$1 -t mangle -A TP_OUTPUT -m addrtype --src-type LOCAL ! --dst-type LOCAL -p tcp -j TP_RULE
	$1 -t mangle -A TP_OUTPUT -m addrtype --src-type LOCAL ! --dst-type LOCAL -p udp -j TP_RULE

	$1 -t nat -A TP_PREROUTING -m addrtype ! --src-type LOCAL --dst-type LOCAL -p udp --dport 53 -j REDIRECT --to-ports 53

	is_true "$IPV4" && add_white_list4 $1 mangle TP_PREROUTING
	
	$1 -t mangle -A TP_PREROUTING -i $INTERFACE_LO -m mark ! --mark $TPROXY_MARK -j RETURN
	$1 -t mangle -A TP_PREROUTING -m addrtype ! --src-type LOCAL --dst-type LOCAL -p udp --dport 53 -j RETURN
	$1 -t mangle -A TP_PREROUTING -m addrtype --dst-type BROADCAST -j RETURN

	$1 -t mangle -A TP_PREROUTING -m addrtype ! --src-type LOCAL ! --dst-type LOCAL -p tcp -j TP_RULE
	$1 -t mangle -A TP_PREROUTING -m addrtype ! --src-type LOCAL ! --dst-type LOCAL -p udp -j TP_RULE

	$1 -t mangle -A TP_PREROUTING -p tcp -m mark --mark $TPROXY_MARK -j TPROXY --on-ip $(loopback_addr $1) --on-port $CLASH_TPROXY_PORT
	$1 -t mangle -A TP_PREROUTING -p udp -m mark --mark $TPROXY_MARK -j TPROXY --on-ip $(loopback_addr $1) --on-port $CLASH_TPROXY_PORT
}

start_iptables_redirect_mode() {
	######################### TP_RULE (for tcp) #########################
	$1 -t nat -N TP_RULE
	for privaddr in $(privaddr_array $1); do $1 -t nat -A TP_RULE -d $privaddr -j RETURN; done

	$1 -t nat -A TP_RULE -p tcp --syn -j DNAT --to $(loopback_addr $1):$CLASH_REDIR_PORT
	######################### TP_RULE (for udp) #########################
	is_support_tproxy && {
		$1 -t mangle -N TP_RULE
		$1 -t mangle -A TP_RULE -j CONNMARK --restore-mark
		$1 -t mangle -A TP_RULE -m mark --mark $TPROXY_MARK -j RETURN
		# $1 -t mangle -A TP_RULE -p udp --dport 53           -j RETURN
		for privaddr in $(privaddr_array $1); do $1 -t mangle -A TP_RULE -d $privaddr -j RETURN; done

		$1 -t mangle -A TP_RULE -p udp -m conntrack --ctstate NEW -j MARK --set-mark $TPROXY_MARK
		$1 -t mangle -A TP_RULE -j CONNMARK --save-mark
	}
	
	######################### TP_OUTPUT/TP_PREROUTING #########################
	$1 -t nat    -A TP_OUTPUT -m owner --uid-owner $PROXY_PROCUSER -j RETURN
	$1 -t nat    -A TP_OUTPUT -m addrtype --src-type LOCAL ! --dst-type LOCAL -p tcp -j TP_RULE

	$1 -t nat -A TP_PREROUTING -m addrtype ! --src-type LOCAL --dst-type LOCAL -p udp --dport 53 -j REDIRECT --to-ports 53
	is_true "$IPV4" && add_white_list4 $1 nat TP_PREROUTING
	$1 -t nat -A TP_PREROUTING -m addrtype ! --src-type LOCAL ! --dst-type LOCAL -p tcp -j TP_RULE

	is_support_tproxy && {
		$1 -t mangle -A TP_OUTPUT -m owner --uid-owner $PROXY_PROCUSER -j RETURN
		$1 -t mangle -A TP_OUTPUT -m addrtype --src-type LOCAL ! --dst-type LOCAL -p udp -j TP_RULE
		is_true "$IPV4" && add_white_list4 $1 mangle TP_PREROUTING
		$1 -t mangle -A TP_PREROUTING -i $INTERFACE_LO -m mark ! --mark $TPROXY_MARK -j RETURN
		$1 -t mangle -A TP_PREROUTING -m addrtype ! --src-type LOCAL --dst-type LOCAL -p udp --dport 53 -j RETURN
		$1 -t mangle -A TP_PREROUTING -m addrtype ! --src-type LOCAL ! --dst-type LOCAL -p udp -j TP_RULE

		$1 -t mangle -A TP_PREROUTING -p udp -m mark --mark $TPROXY_MARK -j TPROXY --on-ip $(loopback_addr $1) --on-port $CLASH_TPROXY_PORT
	}
}

start_iptables() {
	log_info "Setting pre iptables.."

	is_true "$IPV4" && start_iptables_pre_rules "iptables"
	is_true "$IPV6" && start_iptables_pre_rules "ip6tables"

	log_info "Setting rule iptables.."
	if is_true "$TCP_TPROXY"; then
		is_true "$IPV4" && start_iptables_tproxy_mode "iptables"
		is_true "$IPV6" && start_iptables_tproxy_mode "ip6tables"
	else
		is_true "$IPV4" && start_iptables_redirect_mode "iptables"
		is_true "$IPV6" && start_iptables_redirect_mode "ip6tables"
	fi

	log_info "Setting post iptables.."
	is_true "$IPV4" && start_iptables_post_rules "iptables"
	is_true "$IPV6" && start_iptables_post_rules "ip6tables"
}

start_iptables_pre_rules() {
	$1 -t mangle -N TP_PREROUTING
	$1 -t mangle -N TP_OUTPUT
	$1 -t nat    -N TP_PREROUTING
	$1 -t nat    -N TP_OUTPUT
	$1 -t nat    -N TP_POSTROUTING

	local iproute2_family
	is_ipv4_ipts $1 && iproute2_family="-4" || iproute2_family="-6"
	ip $iproute2_family route add local default dev $INTERFACE_LO table $ROUTE_TABLE
	if ip rule help 2>&1 | grep -Fwq protocol; then
		ip $iproute2_family rule add fwmark $TPROXY_MARK table $ROUTE_TABLE protocol kernel
	else
		ip $iproute2_family rule add fwmark $TPROXY_MARK table $ROUTE_TABLE
	fi
}

start_iptables_post_rules() {
	$1 -t mangle -A PREROUTING  -j TP_PREROUTING
	$1 -t mangle -A OUTPUT      -j TP_OUTPUT
	$1 -t nat    -A PREROUTING  -j TP_PREROUTING
	$1 -t nat    -A OUTPUT      -j TP_OUTPUT
	$1 -t nat    -A POSTROUTING -j TP_POSTROUTING
}

start_clash() {
	log_info "Starting clash.."
	kill -9 $(pidof clash) &> /dev/null
	echo "" > /var/log/clash.log && chown $PROXY_PROCUSER /var/log/clash.log && chown -R $PROXY_PROCUSER  /clash && \
	[ -f "${CLASH_CONFIG}" ] && {
		log_info "\t- Using custom config.."
		# capsh $PROXY_PROCUSER -s/bin/sh -c"${CLASH_PATH}/clash -f ${CLASH_PATH}/config.yaml -d ${CLASH_PATH} &> /var/log/clash.log &"
		capsh --user="$PROXY_PROCUSER" --addamb="cap_sys_resource,cap_dac_override,cap_net_raw,cap_net_bind_service,cap_net_admin" --shell="${CLASH_PATH}/clash" --  -f "${CLASH_CONFIG}" -d "${CLASH_PATH}"  &> /var/log/clash.log &
		# ${CLASH_PATH}/clash -f ${CLASH_CONFIG} -d ${CLASH_PATH} &> /var/log/clash.log &
	}
	sleep 3
	[ ! -n "$(pidof clash)" ] && {
		# custom config apply not success
		log_info "\t- ERROR: Use custom config failed, Using default config.."
		echo -e 'port: 7890\nmode: "direct"\nallow-lan: true\nredir-port: '${CLASH_REDIR_PORT}'\ntproxy-port: '${CLASH_TPROXY_PORT}'\nexternal-ui: "/clash/yacd/"\nexternal-controller: ":9090"\nsecret: "podclash"\ndns: { enhanced-mode: "redir-host", ipv6: false, fake-ip-range: "198.18.0.1/16", enable: true, fallback: [ "tls://dns.google", "https://cloudflare-dns.com/dns-query", "tls://1.1.1.1:853" ], fake-ip-filter: [ "*.lan", "localhost.ptlogin2.qq.com" ], listen: "0.0.0.0:53", default-nameserver: [ "114.114.114.114", "8.8.8.8" ], nameserver: [ "114.114.114.114", "223.5.5.5" ], fallback-filter: { geoip: true, ipcidr: [ "240.0.0.0/4" ] }, use-hosts: true }\nrules:\n  - MATCH,DIRECT' > ${CLASH_DEFAULT_CONFIG}
		kill -9 $(pidof clash) &> /dev/null
		# ${CLASH_PATH}/clash -f ${CLASH_DEFAULT_CONFIG} -d ${CLASH_PATH} &> /var/log/clash.log &
		capsh --user="$PROXY_PROCUSER" --addamb="cap_sys_resource,cap_dac_override,cap_net_raw,cap_net_bind_service,cap_net_admin" --shell="${CLASH_PATH}/clash" --  -f "${CLASH_DEFAULT_CONFIG}" -d "${CLASH_PATH}"  &> /var/log/clash.log &
	}
}

start_subconverter() {
	log_info "Starting subconverter.."
	kill -9 $(pidof subconverter) &> /dev/null
	${SUBCONVERTER_PATH}/subconverter &> /var/log/subconverter.log &
}

start_proxy_proc() {
	start_subconverter
	start_clash
}

stop_proxy_proc() {
	log_info "Stoping subconverter.."
	kill -9 $(pidof subconverter) &> /dev/null
	log_info "Stoping clash.."
	kill -9 $(pidof clash) &> /dev/null
}

flush() {
	log_info "Flushing iptables.."
	delete_iproute2
	# flush_postrule
	flush_iptables
}

start() {
	flush
	enable_ipforward
	enable_rtlocalnet
	start_proxy_proc
	start_iptables
	delete_unused_iptchains
}

stop() {
	flush
	stop_proxy_proc
	handle_dns_onstop
}

dns_redir() {
	$1 -t nat -N TP_PREROUTING
	$1 -t nat -N TP_OUTPUT
	$1 -t nat -N TP_POSTROUTING
	$1 -t nat -A TP_PREROUTING  -m addrtype ! --src-type LOCAL --dst-type LOCAL -p udp --dport 53 -j DNAT --to-destination $DNS_WHILE_STOPED
	# $1 -t nat -A TP_POSTROUTING -m addrtype ! --src-type LOCAL -p udp -d $DNS_WHILE_STOPED --dport 53 -j MASQUERADE
	$1 -t nat -A TP_OUTPUT -p udp --dport 53 -j DNAT --to-destination $DNS_WHILE_STOPED
	$1 -t nat -A TP_POSTROUTING -p udp -d $DNS_WHILE_STOPED --dport 53 -j MASQUERADE
	$1 -t nat -A OUTPUT  -j TP_OUTPUT
	$1 -t nat -A PREROUTING  -j TP_PREROUTING
	$1 -t nat -A POSTROUTING -j TP_POSTROUTING
}

handle_dns_onstop() {
	log_info 'Redir DNS request..'

	is_true "$IPV4" && dns_redir "iptables"
	is_true "$IPV6" && dns_redir "ip6tables"
}

update_clash() {
	echo "$(date +%Y-%m-%d\ %T) Updating clash.."
	mkdir -p ${CLASH_PATH}/rules
	mkdir -p ${CLASH_PATH}/proxies
	mkdir -p ${CLASH_PATH}/whitelist
	mkdir -p ${CLASH_PATH}/config
	touch ${CLASH_PATH}/whitelist/whitelist4
	arch=$(uname -m)
	clash_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/Dreamacro/clash/releases/latest | grep 'tag_name' | cut -d\" -f4)"
	if [ "$arch" = "x86_64" ]; then
		clash_arch="amd64"
	elif [ "$arch" = "aarch64" ]; then
		clash_arch="armv8"
	elif [ "$arch" = "armv7l" ]; then
		clash_arch="armv7"
	fi
	clash_url="https://github.com/Dreamacro/clash/releases/download/${clash_latest_ver}/clash-linux-${clash_arch}-${clash_latest_ver}.gz"
	rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
	wget ${clash_url} -O ${CLASH_PATH}/clash.gz && \
	cd ${CLASH_PATH}
	# rm -fr clash &> /dev/null
	gunzip -f clash.gz && chmod +x clash
	rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
}

update_clash_premium() {
	echo "$(date +%Y-%m-%d\ %T) Updating clash premium.."
	mkdir -p ${CLASH_PATH}/rules
	mkdir -p ${CLASH_PATH}/proxies
	mkdir -p ${CLASH_PATH}/whitelist
	mkdir -p ${CLASH_PATH}/config
	touch ${CLASH_PATH}/whitelist/whitelist4
	arch=$(uname -m)
	clash_premium_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/Dreamacro/clash/releases/tags/premium | grep '"name": "Premium ' | awk -F '[": ]' '{print $9}')"
	if [ "$arch" = "x86_64" ]; then
		clash_arch="amd64"
	elif [ "$arch" = "aarch64" ]; then
		clash_arch="armv8"
	elif [ "$arch" = "armv7l" ]; then
		clash_arch="armv7"
	fi
	clash_premium_url="https://github.com/Dreamacro/clash/releases/download/premium/clash-linux-${clash_arch}-${clash_premium_latest_ver}.gz"
	rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
	wget ${clash_premium_url} -O ${CLASH_PATH}/clash.gz && \
	cd ${CLASH_PATH}
	# rm -fr clash &> /dev/null
	gunzip -f clash.gz && chmod +x clash
	rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
}

update_geoip() {
	echo "$(date +%Y-%m-%d\ %T) Updating GEOIP.."
	geoip_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/Dreamacro/maxmind-geoip/releases/latest | grep 'tag_name' | cut -d\" -f4)"
	geoip_url="https://github.com/Dreamacro/maxmind-geoip/releases/download/${geoip_latest_ver}/Country.mmdb"
	# rm ${CLASH_PATH}/Country.mmdb &> /dev/null
	wget ${geoip_url} -O ${CLASH_PATH}/Country.mmdb
}

update_subconverter() {
	echo "$(date +%Y-%m-%d\ %T) Updating subconverter.."
	arch=$(uname -m)
	if [ "$arch" = "x86_64" ]; then
		subconverter_arch="linux64"
	elif [ "$arch" = "aarch64" ]; then
		subconverter_arch="aarch64"
	elif [ "$arch" = "armv7l" ]; then
		clash_arch="armv7"
	fi
	subconverter_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/tindy2013/subconverter/releases/latest | grep 'tag_name' | cut -d\" -f4)"
	subconverter_url="https://github.com/tindy2013/subconverter/releases/download/${subconverter_latest_ver}/subconverter_${subconverter_arch}.tar.gz"
	mkdir -p ${SUBCONVERTER_PATH}
	rm -fr /tmp/subconverter.tar.gz &> /dev/null
	wget ${subconverter_url} -O /tmp/subconverter.tar.gz
	# rm -fr ${SUBCONVERTER_PATH}/*
	tar zxf /tmp/subconverter.tar.gz --overwrite -C /
	rm -fr /tmp/subconverter.tar.gz &> /dev/null
}

update_yacd() {
	echo "$(date +%Y-%m-%d\ %T) Updating YACD.."
	ycad_url="https://github.com/haishanh/yacd/archive/gh-pages.zip"
	rm -fr /tmp/yacd.zip &> /dev/null
	wget ${ycad_url} -O /tmp/yacd.zip
	unzip -o /tmp/yacd.zip -d $CLASH_PATH
	# rm -fr ${YACD_PATH} &> /dev/null
	# mv -f $CLASH_PATH/yacd-gh-pages $YACD_PATH &> /dev/null
	ln -sf $CLASH_PATH/yacd-gh-pages $YACD_PATH
	# add default config
	sed -i "s|</body>|<script type=\"text/javascript\">localStorage[\"yacd.haishan.me\"] = \'{\"clashAPIConfigs\":[{\"baseURL\":\"http://\'+location.hostname+\':9090\",\"secret\":\"podclash\",\"addedAt\":0}]}\'</script></body>|" $YACD_PATH/index.html
	rm $YACD_PATH/CNAME &> /dev/null
}

case $1 in
	stop) stop;;
	daemon) start; tail -f /var/log/clash.log;;
	install) update_clash && update_geoip && update_subconverter && update_yacd;;
	install_premium) update_clash_premium && update_geoip && update_subconverter && update_yacd;;
	update) update_clash && update_geoip && update_subconverter && update_yacd; start;;
	update_yacd) update_yacd;;
	update_geoip) update_geoip;;
	update_bin) update_clash && update_subconverter;;
	update_premium) update_clash_premium && update_geoip && update_subconverter && update_yacd; start;;
	*) start;;
esac
