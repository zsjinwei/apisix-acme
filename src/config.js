const APISIX_HOST = process.env.APISIX_HOST || 'http://apisix:9080'; // apisix host
const APISIX_TOKEN = process.env.APISIX_TOKEN || ''; // apisix token
const ACME_EMAIL = process.env.ACME_EMAIL || ''; // default acme mail
const ACME_PARAMS = process.env.ACME_PARAMS || ''; // default acme params
const CERT_EXPIRE_DAYS = process.env.CERT_EXPIRE_DAYS || '14'; // 离过期时间多少天开始刷新证书
const RENEW_CRONTAB = process.env.RENEW_CRONTAB || '0 0 3 * * *'; // renew crontab
const CHECK_DOMAIN_CRONTAB = process.env.CHECK_DOMAIN_CRONTAB || '*/1 * * * *'; // check domain crontab

module.exports = {
  APISIX_HOST,
  APISIX_TOKEN,
  ACME_EMAIL,
  ACME_PARAMS,
  CERT_EXPIRE_DAYS,
  RENEW_CRONTAB,
  CHECK_DOMAIN_CRONTAB
};
