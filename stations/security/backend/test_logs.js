import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3013/api/security/patrol/logs');
  const data = await res.json();
  console.log(data.slice(0, 3));
}
run();
