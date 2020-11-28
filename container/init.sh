#!/bin/sh

CLASH_PATH="/clash"
CLASH_CONFIG="$CLASH_PATH/config.yaml"
CLASH_PORT=7892
CLASH_DNS_PORT=53
SUBCONVERTER_PATH="/subconverter"
YACD_PATH="$CLASH_PATH/yacd"
[ -f "$CLASH_CONFIG" ] && CLASH_FAKE_IP=$(grep fake-ip-range: ${CLASH_CONFIG} | awk -F'[:",]' '{ for(i=1; i<=NF; i++) if($i ~ /fake-ip-range/) print $(i+2)}')

function update_clash(){
  echo "$(date +%Y-%m-%d\ %T) Updating clash.."
  mkdir -p ${CLASH_PATH}/rules
  mkdir -p ${CLASH_PATH}/proxies
  arch=$(uname -m)
  clash_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/Dreamacro/clash/releases/latest | grep 'tag_name' | cut -d\" -f4)"
  if [ "$arch" = "x86_64" ]; then
    clash_arch="amd64"
  elif [ "$arch" = "aarch64" ]; then
    clash_arch="armv8"
  fi
  clash_url="https://github.com/Dreamacro/clash/releases/download/${clash_latest_ver}/clash-linux-${clash_arch}-${clash_latest_ver}.gz"
  rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
  wget ${clash_url} -O ${CLASH_PATH}/clash.gz && \
  cd ${CLASH_PATH} && rm -fr clash &> /dev/null
  gunzip clash.gz && chmod +x clash
  rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
}

function update_clash_premium(){
  echo "$(date +%Y-%m-%d\ %T) Updating clash premium.."
  mkdir -p ${CLASH_PATH}/rules
  mkdir -p ${CLASH_PATH}/proxies
  arch=$(uname -m)
  clash_premium_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/Dreamacro/clash/releases/tags/premium | grep '"name": "Premium ' | awk -F '[": ]' '{print $9}')"
  if [ "$arch" = "x86_64" ]; then
    clash_arch="amd64"
  elif [ "$arch" = "aarch64" ]; then
    clash_arch="armv8"
  fi
  clash_premium_url="https://github.com/Dreamacro/clash/releases/download/premium/clash-linux-${clash_arch}-${clash_premium_latest_ver}.gz"
  rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
  wget ${clash_premium_url} -O ${CLASH_PATH}/clash.gz && \
  cd ${CLASH_PATH} && rm -fr clash &> /dev/null
  gunzip clash.gz && chmod +x clash
  rm -fr ${CLASH_PATH}/clash.gz &> /dev/null
}

function update_geoip(){
  echo "$(date +%Y-%m-%d\ %T) Updating GEOIP.."
  geoip_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/Dreamacro/maxmind-geoip/releases/latest | grep 'tag_name' | cut -d\" -f4)"
  geoip_url="https://github.com/Dreamacro/maxmind-geoip/releases/download/${geoip_latest_ver}/Country.mmdb"
  rm ${CLASH_PATH}/Country.mmdb &> /dev/null
  wget ${geoip_url} -O ${CLASH_PATH}/Country.mmdb
}

function update_subconverter(){
  echo "$(date +%Y-%m-%d\ %T) Updating subconverter.."
  arch=$(uname -m)
  if [ "$arch" = "x86_64" ]; then
    subconverter_arch="linux64"
  elif [ "$arch" = "aarch64" ]; then
    subconverter_arch="aarch64"
  fi
  subconverter_latest_ver="$(curl -H 'Cache-Control: no-cache' -s https://api.github.com/repos/tindy2013/subconverter/releases/latest | grep 'tag_name' | cut -d\" -f4)"
  subconverter_url="https://github.com/tindy2013/subconverter/releases/download/${subconverter_latest_ver}/subconverter_${subconverter_arch}.tar.gz"
  mkdir -p ${SUBCONVERTER_PATH}
  rm -fr /tmp/subconverter.tar.gz &> /dev/null
  wget ${subconverter_url} -O /tmp/subconverter.tar.gz
  rm -fr ${SUBCONVERTER_PATH}/*
  tar zxf /tmp/subconverter.tar.gz -C /
  rm -fr /tmp/subconverter.tar.gz &> /dev/null
}

function update_yacd(){
  echo "$(date +%Y-%m-%d\ %T) Updating YACD.."
  ycad_url="https://github.com/haishanh/yacd/archive/gh-pages.zip"
  rm -fr /tmp/yacd.zip &> /dev/null
  wget ${ycad_url} -O /tmp/yacd.zip
  rm -fr ${YACD_PATH} &> /dev/null
  unzip /tmp/yacd.zip -d $CLASH_PATH
  mv $CLASH_PATH/yacd-gh-pages $YACD_PATH &> /dev/null
  rm $YACD_PATH/CNAME &> /dev/null
}

function set_iptables {
  echo "$(date +%Y-%m-%d\ %T) Setting iptables.."
  # 建立自定义chian
  iptables -t nat -N HANDLE_DNS
  iptables -t nat -N NEED_ACCEPT
  iptables -t nat -N CLASH
  iptables -t nat -N S_NAT

  # handle dns
  iptables -t nat -A HANDLE_DNS -p udp --dport 53 -j REDIRECT --to-ports $CLASH_DNS_PORT

  #local network need accept
  iptables -t nat -A NEED_ACCEPT -d 0.0.0.0/8          -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 127.0.0.0/8        -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 10.0.0.0/8         -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 169.254.0.0/16     -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 172.16.0.0/12      -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 192.0.0.0/24       -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 192.0.2.0/24       -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 192.88.99.0/24     -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 172.16.0.0/12      -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 192.168.0.0/16     -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 198.18.0.0/15      -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 198.51.100.0/24    -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 203.0.113.0/24     -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 224.0.0.0/4        -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 240.0.0.0/4        -j ACCEPT
  iptables -t nat -A NEED_ACCEPT -d 255.255.255.255/32 -j ACCEPT

  local local_ips=$(ip addr | grep 'inet ' | awk '{print $2}')
  if [ -n "$local_ips" ]; then
    for local_ip in $local_ips; do
      iptables -t nat -A NEED_ACCEPT -d "$local_ip" -j ACCEPT
    done
  fi

  # 转发至 clash
  iptables -t nat -A CLASH -p tcp -j REDIRECT --to-ports $CLASH_PORT

  # 包转入自定义 chian
  iptables -t nat -A PREROUTING -p udp -j HANDLE_DNS
  iptables -t nat -A PREROUTING -p tcp -j NEED_ACCEPT
  iptables -t nat -A PREROUTING -p tcp -j CLASH
  iptables -t nat -A POSTROUTING -j S_NAT

  [ -n "$CLASH_FAKE_IP" ] && \
  iptables -t nat -N FAKE_IP && \
  iptables -t nat -A FAKE_IP -p tcp -d "$CLASH_FAKE_IP" -j REDIRECT --to-port "$CLASH_PORT" && \
  iptables -t nat -A OUTPUT -p tcp -j FAKE_IP

  # udp
  iptables -t mangle -N NEED_ACCEPT
  iptables -t mangle -N CLASH

  ip rule add fwmark 1 table 100
  ip route add local default dev lo table 100

  iptables -t mangle -A NEED_ACCEPT -d 0.0.0.0/8          -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 127.0.0.0/8        -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 10.0.0.0/8         -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 169.254.0.0/16     -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 172.16.0.0/12      -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 192.0.0.0/24       -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 192.0.2.0/24       -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 192.88.99.0/24     -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 172.16.0.0/12      -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 192.168.0.0/16     -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 198.18.0.0/15      -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 198.51.100.0/24    -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 203.0.113.0/24     -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 224.0.0.0/4        -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 240.0.0.0/4        -j ACCEPT
  iptables -t mangle -A NEED_ACCEPT -d 255.255.255.255/32 -j ACCEPT

  iptables -t mangle -A CLASH -p udp -j TPROXY --on-port "$CLASH_PORT" --tproxy-mark 1
  iptables -t mangle -A PREROUTING -p udp -j NEED_ACCEPT
  iptables -t mangle -A PREROUTING -p udp -j CLASH

  [ -n "$CLASH_FAKE_IP" ] && \
  iptables -t mangle -N FAKE_IP && \
  iptables -t mangle -A FAKE_IP -p udp -d "$CLASH_FAKE_IP" -j MARK --set-mark 1 && \
  iptables -t mangle -A OUTPUT -p udp -j FAKE_IP
}

function flush_iptables {
  echo "$(date +%Y-%m-%d\ %T) flush iptables.."
  iptables -t nat -D PREROUTING -p udp -j HANDLE_DNS &>/dev/null
  iptables -t nat -D PREROUTING -p tcp -j NEED_ACCEPT &>/dev/null
  iptables -t nat -D PREROUTING -p tcp -j CLASH &>/dev/null
  iptables -t nat -D POSTROUTING -j S_NAT &>/dev/null

  iptables -t mangle -D PREROUTING -p udp -j NEED_ACCEPT &>/dev/null
  iptables -t mangle -D PREROUTING -p udp -j CLASH &>/dev/null

  [ -n "$CLASH_FAKE_IP" ] && {
    iptables -t mangle -D OUTPUT -p udp -j FAKE_IP &>/dev/null
    iptables -t nat -D OUTPUT -p tcp -j FAKE_IP &>/dev/null
    iptables -t nat -F FAKE_IP &>/dev/null
    iptables -t nat -X FAKE_IP &>/dev/null
    iptables -t mangle -F FAKE_IP &>/dev/null
    iptables -t mangle -X FAKE_IP &>/dev/null
  }

  iptables -t nat -F CLASH &>/dev/null
  iptables -t nat -X CLASH &>/dev/null
  iptables -t nat -F HANDLE_DNS &>/dev/null
  iptables -t nat -F HANDLE_DNS &>/dev/null
  iptables -t nat -F NEED_ACCEPT &>/dev/null
  iptables -t nat -X NEED_ACCEPT &>/dev/null
  iptables -t nat -F S_NAT &>/dev/null
  iptables -t nat -X S_NAT &>/dev/null

  iptables -t mangle -F CLASH &>/dev/null
  iptables -t mangle -X CLASH &>/dev/null
  iptables -t mangle -F NEED_ACCEPT &>/dev/null
  iptables -t mangle -X NEED_ACCEPT &>/dev/null

  iptables -t raw -F
  iptables -t raw -X
  iptables -t mangle -F
  iptables -t mangle -X
  iptables -t nat -F
  iptables -t nat -X
  iptables -t filter -F
  iptables -t filter -X

  ip -4 rule de table 100
  ip -4 route flush table 100
}

function start_clash(){
  echo "$(date +%Y-%m-%d\ %T) Starting clash.."
  [ -f "${CLASH_CONFIG}" ] && {
    echo "$(date +%Y-%m-%d\ %T)   - Using custom config.."
    kill -9 $(pidof clash) &> /dev/null
    ${CLASH_PATH}/clash -f ${CLASH_CONFIG} -d ${CLASH_PATH} &> /var/log/clash.log &
    sleep 3
  }
  [ ! -n "$(pidof clash)" ] && {
    # custom config apply not success
    echo "$(date +%Y-%m-%d\ %T)   - ERROR: Use custom config failed, Using default config.."
    echo -e 'port: 7890\nmode: "direct"\nallow-lan: true\nredir-port: '${CLASH_PORT}'\nexternal-ui: "/clash/yacd/"\nexternal-controller: ":9090"\nsecret: "podclash"\ndns: { enhanced-mode: "redir-host", ipv6: false, fake-ip-range: "198.18.0.1/16", enable: true, fallback: [ "tls://dns.google", "https://cloudflare-dns.com/dns-query", "tls://1.1.1.1:853" ], fake-ip-filter: [ "*.lan", "localhost.ptlogin2.qq.com" ], listen: "0.0.0.0:53", default-nameserver: [ "114.114.114.114", "8.8.8.8" ], nameserver: [ "114.114.114.114", "223.5.5.5" ], fallback-filter: { geoip: true, ipcidr: [ "240.0.0.0/4" ] }, use-hosts: true }\nrules:\n  - MATCH,DIRECT' > /clash/default.yaml
    kill -9 $(pidof clash) &> /dev/null
    ${CLASH_PATH}/clash -f ${CLASH_PATH}/default.yaml -d ${CLASH_PATH} &> /var/log/clash.log &
  }
}

function start_subconverter(){
  echo "$(date +%Y-%m-%d\ %T) Starting subconverter.."
  kill -9 $(pidof subconverter) &> /dev/null
  ${SUBCONVERTER_PATH}/subconverter &> /var/log/subconverter.log &
}

function start(){
  sysctl -w net.ipv4.ip_forward=1 &>/dev/null
  for dir in $(ls /proc/sys/net/ipv4/conf); do
      sysctl -w net.ipv4.conf.$dir.send_redirects=0 &>/dev/null
  done
  set_iptables
  start_subconverter
  start_clash
}

function stop(){
  flush_iptables
  echo "$(date +%Y-%m-%d\ %T) Stoping clash.."
  kill -9 $(pidof clash) &> /dev/null
  echo "$(date +%Y-%m-%d\ %T) Stoping subconverter.."
  kill -9 $(pidof subconverter) &> /dev/null
}

case $1 in
  daemon) update_clash && update_geoip && start && tail -f /var/log/clash.log;;
  update) update_clash && update_geoip && update_subconverter && update_yacd;;
  update_yacd) update_yacd;;
  update_geoip) update_geoip;;
  update_bin) update_clash && update_subconverter;;
  update_premium) update_clash_premium && update_geoip && update_subconverter && update_yacd;;
  stop) stop;;
  *) stop ; start;;
esac
