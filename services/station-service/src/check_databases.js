import fs from 'fs';
try {
  const content = fs.readFileSync('d:\\Cari Kerja\\PT Premier engineering\\MEWAH-FIX\\MEWAH-SKL\\pm2_press.log', 'utf16le');
  console.log(content.substring(0, 2000));
} catch (e) {
  console.error(e);
}
