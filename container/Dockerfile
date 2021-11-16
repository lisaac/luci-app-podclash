FROM alpine

ENV TZ=Asia/Shanghai

COPY container/init.sh /

#sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# sed -i -e '/^http:\/\/.*\/main/h' -e'$G' -e '${s|\(^http://.*/\)main|\1testing|}' /etc/apk/repositories && \
RUN apk --no-cache update && \
    apk --no-cache add tini iptables ip6tables tzdata curl && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && \
    chmod +x /init.sh && /init.sh update

CMD [ "/sbin/tini", "--", "/init.sh", "daemon" ]