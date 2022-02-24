# apisix-acme

自动申请 acme 证书，自动添加 acme 验证路由，证书自动续期

目前只支持通过文本验证来申请单域名证书，暂不支持泛域名证书申请

## 步骤

1. 用户主动解析域名到 apisix 服务器

2. 后台调用服务 `/apisix_acme/task_create`

   ```
   POST { "domain": "example.com", "serviceList": [] }
   ```

   成功后会自动将证书添加到 apisix, 同时把域名加到指定的 service 中

3. 后台轮询 `/apisix_acme/task_status`

   ```
   GET ?id=xxxx
   ```

4. 每天凌晨会自动检查 7 天内过期证书自动重新申请

## 安装

```sh
chmod +x build.sh
./build.sh build
```

推荐使用 docker-compose， 方便和 apisix 服务部署在一个网络内

```yaml
services:
  # ...
  apisix-acme:
    image: apisix-acme:1.1.0
    container_name: apisix-acme
    restart: always
    depends_on:
      - apisix
    environment:
      - APISIX_HOST=http://${APISIX_HOST}:${APISIX_PORT}
      - APISIX_TOKEN=${APISIX_ADMIN_KEY}
      - ACME_EMAIL=${ACME_EMAIL}
      - ACME_PARAMS=${ACME_PARAMS}
      - CERT_EXPIRE_DAYS=${ACME_CERT_EXPIRE_DAYS}
      - Ali_Key=${ACME_ALI_KEY}
      - Ali_Secret=${ACME_ALI_SECRET}
    volumes:
      - ./volumes/apisix-acme/certs:/app/certs
    networks:
      apisix:
```

## Acknowledgments

[acme.sh](https://github.com/acmesh-official/acme.sh)
