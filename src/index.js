const task = require('./task');

async function start() {
  task.scheduleTask();
  console.log('apisix-acme 已启动');
}

start();
