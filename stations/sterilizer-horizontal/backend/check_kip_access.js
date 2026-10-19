import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: ""
  });

  const [rows] = await connection.query("SELECT * FROM mewah_kip_sterilizer.plc_tags WHERE tag_name = 'Main_steam_premit'");
  console.log("KIP Main_steam_premit config:", rows);

  await connection.end();
}

main().catch(err => console.error("Error:", err));
