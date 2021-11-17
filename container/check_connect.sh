#!/bin/sh
get_data() {
	{
		ip_from_ipip=$(curl --connect-timeout 5 -s http://myip.ipip.net/ | grep -E -o '\d+\.\d+.\d+.\d+' 2>/dev/null )
		echo -n \"ip_from_ipip\":\"$ip_from_ipip\",
	} &
	{
		ip_from_taobao=$(curl --connect-timeout 5 -s https://www.taobao.com/help/getip.php | grep -E -o '\d+\.\d+.\d+.\d+' 2>/dev/null)
		echo -n \"ip_from_taobao\":\"$ip_from_taobao\",
	} &
	{
		ip_from_sb=$(curl --connect-timeout 5 -s http://ip.sb | grep -E -o '\d+\.\d+.\d+.\d+' 2>/dev/null)
		echo -n \"ip_from_sb\":\"$ip_from_sb\",
	} &
	{
		ip_from_google=$(curl --connect-timeout 5 -s http://sspanel.net/ip.php | grep -E -o '\d+\.\d+.\d+.\d+' 2>/dev/null)
		echo -n \"ip_from_google\":\"$ip_from_google\",
	} &

	{
		curl -sIL --connect-timeout 5 -w "\"access_google_code\":\"%{http_code}\",\"access_google_timeout\":%{time_total}," -o /dev/null http://www.google.com/generate_204 2>/dev/null
	} &
	{
		curl -sIL --connect-timeout 5 -w "\"access_github_code\":\"%{http_code}\",\"access_github_timeout\":%{time_total}," -o /dev/null http://github.com 2>/dev/null
	} &
	{
		curl -sIL --connect-timeout 5 -w "\"access_baidu_code\":\"%{http_code}\",\"access_baidu_timeout\":%{time_total}," -o /dev/null http://baidu.com 2>/dev/null
	} &
	{
		curl -sIL --connect-timeout 5 -w "\"access_taobao_code\":\"%{http_code}\",\"access_taobao_timeout\":%{time_total}," -o /dev/null http://taobao.com 2>/dev/null
	} &
}

echo \{$(get_data)