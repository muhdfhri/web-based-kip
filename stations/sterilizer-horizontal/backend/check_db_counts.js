import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: ""
  });

  const [commands] = await connection.query("SELECT * FROM mewah_kip_sterilizer.plc_commands ORDER BY id DESC LIMIT 10");
  console.log("Latest plc_commands in mewah_kip_sterilizer:", commands);

  await connection.end();
}

main().catch(err => console.error("Error:", err));
