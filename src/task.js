const schedule = require('node-schedule');
const acme = require('./acme');
const config = require('./config');

const taskList = []; // id, domain, running, error

async function removeTask(task) {
  if (!task || !task.id) {
    return;
  }
  for (let i = taskList.length - 1; i >= 0; i--) {
    if (taskList[i].id === task.id) {
      taskList.splice(i, 1);
    }
  }
}

function getDomainByHost(host) {
  if (!host) {
    return '';
  }

  const dArr = host.split('.');
  if (dArr && dArr.length >= 3) {
    return dArr.slice(1).join('.');
  }
  return '';
}

async function getDomains(wildcard = true) {
  let domains = [];
  let hosts = [];

  const services = await acme.listService();
  for (const i in services) {
    const service = services[i];
    if (service.value && service.value.host) {
      hosts.push(service.value.host);
    }
    if (service.value && service.value.hosts) {
      hosts = hosts.concat(service.value.hosts);
    }
  }

  const routes = await acme.listRoute();
  for (const i in routes) {
    const route = routes[i];
    if (route.value && route.value.host) {
      hosts.push(route.value.host);
    }
    if (route.value && route.value.hosts) {
      hosts = hosts.concat(route.value.hosts);
    }
  }

  if (wildcard === false) {
    return [...new Set(hosts)];
  }

  domains = hosts
    .map(host => {
      return getDomainByHost(host);
    })
    .filter(d => !!d);

  return [...new Set(domains)];
}

// renew已存在的证书
async function renewSsl() {
  const ssls = await acme.listSsl();
  for (const i in ssls) {
    const ssl = ssls[i];
    console.log(ssl);
    if (String(ssl.id).match(/^acme_/)) {
      let domain = '';
      for (let j in ssl.snis) {
        if (ssl.snis[j].match(/^\*\./)) {
          continue;
        }
        domain = ssl.snis[j];
        break;
      }

      if (domain) {
        await renewDomainSsl(domain);
      }
    }
  }
}

// 检查service和route填写的域名证书是否存在，不存在则创建
async function checkDomains() {
  const domains = await getDomains();

  for (const i in domains) {
    const domain = domains[i];
    await renewDomainSsl(domain, true);
  }
}

async function renewDomainSsl(domain, skipValidCheck = false) {
  const result = await acme.checkSsl(domain);

  if (skipValidCheck === true && result && result.id) {
    console.log(`域名(${domain})证书已存在，跳过操作`);
    return;
  }

  const left_seconds = result.validity_end - parseInt(Date.now() / 1000);
  if (left_seconds > parseInt(config.CERT_EXPIRE_DAYS) * 24 * 60 * 60) {
    console.log(`域名(${domain})证书已存在且未过期，跳过操作`);
    return;
  }

  let task = taskList.find(item => item.domain === domain && item.running); // 正在运行中的任务
  if (task) {
    console.log(`域名(${domain})任务执行中，请等待`);
    return;
  }

  console.log(`域名(${domain})证书不存在或已过期，开始更新`);

  task = {
    id: Date.now(),
    running: true,
    domain: domain
  };
  taskList.push(task);

  try {
    const sslInfo = await acme.createSsl(domain, true);
    await acme.applySsl(sslInfo);
  } catch (error) {
    console.log(`域名(${domain})任务执行失败:`, error);
  } finally {
    task.running = false;
    removeTask(task);
  }
}

async function scheduleTask() {
  schedule.scheduleJob('renewSsl', config.RENEW_CRONTAB, () => {
    renewSsl();
  });

  schedule.scheduleJob('checkDomains', config.CHECK_DOMAIN_CRONTAB, () => {
    checkDomains();
  });
}

module.exports = {
  scheduleTask,
  renewSsl,
  checkDomains
};
