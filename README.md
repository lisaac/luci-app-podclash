```
docker run -dit \
  --name luci_pod_clash \
  --privileged \
  --network mac4 \
  --ip 10.1.1.22 \
  lisaac/podclash
```