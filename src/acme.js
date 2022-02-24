const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const child_process = require('child_process');

const config = require('./config');

const apisix_host = config.APISIX_HOST;
const token = config.APISIX_TOKEN;
const email = config.ACME_EMAIL;

async function execShell(cmd, options) {
  const arr = cmd.split(' ').filter(item => item != '');
  const [bin, ...args] = arr;
  return new Promise((resolve, reject) => {
    const task = child_process.spawn(bin, args, options);
    task.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} failed with code ${code}`));
      }
    });
    task.on('error', err => {
      reject(err);
    });
  });
}

async function listService() {
  const resp = await axios.request({
    method: 'GET',
    headers: {
      'X-API-KEY': token
    },
    url: `${apisix_host}/apisix/admin/services`
  });
  const nodes = resp.data.node.nodes || [];
  return nodes;
}

async function listRoute() {
  const resp = await axios.request({
    method: 'GET',
    headers: {
      'X-API-KEY': token
    },
    url: `${apisix_host}/apisix/admin/routes`
  });
  const nodes = resp.data.node.nodes || [];
  return nodes;
}

async function listSsl() {
  const resp = await axios.request({
    method: 'GET',
    headers: {
      'X-API-KEY': token
    },
    url: `${apisix_host}/apisix/admin/ssl`
  });
  const { data } = resp;
  if (!data.count) {
    return [];
  }
  const nodes = data.node.nodes;
  const list = nodes.map(node => {
    const item = node.value || {};
    return {
      id: item.id,
      snis: item.snis || [],
      validity_start: item.validity_start,
      validity_end: item.validity_end
    };
  });
  return list;
}

// 检查证书过期时间，若不存在 id 为空
async function checkSsl(domain) {
  let result = {
    id: '',
    validity_end: 0
  };
  const list = await listSsl(apisix_host, token);
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.snis.includes(domain)) {
      result.id = item.id;
      result.validity_end = item.validity_end;
      break;
    }
  }
  return result;
}

// 导入证书
async function applySsl(sslInfo) {
  const id = 'acme_' + (sslInfo.domain || sslInfo.snis.join('_'));
  await axios.request({
    method: 'PUT',
    headers: {
      'X-API-KEY': token
    },
    url: `${apisix_host}/apisix/admin/ssl/${id}`,
    data: sslInfo
  });
}

async function createSsl(domain, wildcard = false) {
  const options = {
    cwd: path.join(__dirname, 'acme.sh'),
    stdio: 'inherit'
  };

  const ssl_key = path.join(__dirname, 'certs', `${domain}.key`);
  const ssl_cer = path.join(__dirname, 'certs', `${domain}.cer`);

  let acmeCmd = `sh acme.sh --issue -m ${email} -d ${domain} ${
    wildcard ? `-d *.${domain}` : ''
  } ${config.ACME_PARAMS}`;

  console.log('acmeCmd:', acmeCmd);
  await execShell(acmeCmd, options);
  await execShell(
    `sh acme.sh --install-cert -d ${domain} --key-file ${ssl_key} --fullchain-file ${ssl_cer}`,
    options
  );

  const data = child_process.execSync(
    `openssl x509 -text -noout -in ${ssl_cer}`,
    { encoding: 'utf8' }
  );
  const snis = /DNS:.+/
    .exec(data)[0]
    .split(',')
    .map(item => item.trim().replace('DNS:', ''))
    .filter(item => item != '');
  const start_time = /Not\sBefore.*:\s(.+)/
    .exec(data)[1]
    .replace('GMT', '')
    .trim();
  const end_time = /Not\sAfter.*:\s(.+)/
    .exec(data)[1]
    .replace('GMT', '')
    .trim();

  return {
    snis,
    domain: domain,
    cert: fs.readFileSync(ssl_cer, 'utf8'),
    key: fs.readFileSync(ssl_key, 'utf8'),
    validity_start: moment.utc(start_time, 'MMM DD HH:mm:ss YYYY').unix(),
    validity_end: moment.utc(end_time, 'MMM DD HH:mm:ss YYYY').unix()
  };
}

module.exports = {
  execShell,
  listRoute,
  listService,
  listSsl,
  checkSsl,
  applySsl,
  createSsl
};
