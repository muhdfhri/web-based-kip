// Local CCTV-only visual QA. Uses the production transport and real gateway.
import http from 'node:http';
import { readFileSync } from 'node:fs';
const port = Number(process.argv[2] || 5189);
const html = `<!doctype html><html lang="id"><meta charset="utf-8">
<title>MEWAH CCTV Verification</title><style>
body{margin:0;font:14px Arial;background:#f8fafc;color:#172554}header{position:sticky;top:0;padding:16px;background:#ffe13b;z-index:2}
#grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;background:#cbd5e1;margin:16px}
article{background:white;min-width:0}h3{font-size:12px;margin:0;padding:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.screen{height:155px;position:relative;background:#020617}canvas{width:100%;height:100%;display:block}.state{position:absolute;top:5px;right:5px;background:#fff;color:#172554;padding:2px;font-size:10px}
button{padding:6px;border:0;cursor:pointer}dialog{width:92vw;height:85vh;background:#020617;color:white}dialog .screen{height:calc(100% - 36px)}dialog::backdrop{background:#000b}
</style><header>MEWAH · Verifikasi CCTV <strong id="summary"></strong></header><main id="grid"></main>
<dialog id="modal"><button id="close">Tutup</button><div class="screen"><canvas data-fit="contain" id="detail"></canvas><span class="state" id="detail-state"></span></div></dialog>
<script type="module">
import {subscribeCctv} from '/cctvTransport.js';
const cameras=(await(await fetch('/api/security/cctv')).json()).data;
const states=new Map();const stops=[];let closeDetail;
for(const camera of cameras){
 const card=document.createElement('article');const title=document.createElement('h3');title.textContent=camera.camera_code+' · '+camera.camera_name;
 const screen=document.createElement('div');screen.className='screen';const canvas=document.createElement('canvas');canvas.dataset.fit='cover';canvas.setAttribute('aria-label',camera.camera_name);
 const badge=document.createElement('span');badge.className='state';const zoom=document.createElement('button');zoom.textContent='Perbesar';
 screen.append(canvas,badge);card.append(title,screen,zoom);document.querySelector('#grid').append(card);
 stops.push(subscribeCctv(camera.stream_url,canvas,status=>{badge.textContent=status;states.set(camera.id,status);document.querySelector('#summary').textContent=[...states.values()].filter(s=>s==='live').length+'/'+cameras.length+' LIVE';}));
 zoom.addEventListener('click',()=>{closeDetail?.();document.querySelector('#modal').showModal();closeDetail=subscribeCctv(camera.stream_url,document.querySelector('#detail'),s=>document.querySelector('#detail-state').textContent=s);});
}
document.querySelector('#close').addEventListener('click',()=>{closeDetail?.();closeDetail=null;document.querySelector('#modal').close();});
window.addEventListener('pagehide',()=>{closeDetail?.();stops.forEach(stop=>stop());});
</script></html>`;

http.createServer((req, res) => {
  if (req.url.startsWith('/api/security/cctv')) {
    const upstream = http.get({ hostname: '127.0.0.1', port: 3101, path: req.url }, incoming => {
      res.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(res);
      incoming.on('error', () => res.destroy());
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    res.on('close', () => upstream.destroy());
    return;
  }
  if (req.url === '/cctvTransport.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    res.end(readFileSync(new URL('../frontend/components/cctvTransport.js', import.meta.url)));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
}).listen(port, '127.0.0.1', () => console.log('CCTV-only QA ready at http://127.0.0.1:' + port));
