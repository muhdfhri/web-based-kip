import { ModbusClientWrapper } from "./src/modbusClient.js";

async function testModbus() {
  console.log("=== TEST KONEKSI MODBUS TCP HAIWELL SIMULATOR ===");
  const client = new ModbusClientWrapper({
    ip_address: "127.0.0.1",
    port: 502,
    slave_id: 1,
  });

  try {
    await client.connect();
    console.log("✅ Terhubung ke Modbus TCP Server Port 502!");

    // Test Read Real (Float) Tag at Register 512
    const tagPressure = {
      id: "tag-1",
      tag_name: "CurrentPressure",
      node_id: "V",
      byte_offset: 512,
      data_type: "REAL",
    };
    const pressureVal = await client.readTag(tagPressure);
    console.log(`✅ Baca Tag CurrentPressure (V512 REAL): ${pressureVal} Bar`);

    // Test Read Coil Tag at Register 3072 (Door_in)
    const tagDoor = {
      id: "tag-3",
      tag_name: "Door_in[1]",
      node_id: "M",
      byte_offset: 3072,
      data_type: "BOOL",
    };
    const doorVal = await client.readTag(tagDoor);
    console.log(`✅ Baca Tag Door_in (M3072 BOOL): ${doorVal}`);

    // Test Write Tag
    console.log("🔄 Menguji Tulis Tag CurrentPressure = 3.15 Bar...");
    await client.writeTag(tagPressure, 3.15);
    const updatedPressure = await client.readTag(tagPressure);
    console.log(`✅ Verifikasi Nilai Setelah Ditulis: ${updatedPressure} Bar`);

    // Test Batch Read
    console.log("🔄 Menguji Batch Read...");
    const batchResults = await client.readMultipleTags([tagPressure, tagDoor]);
    console.log("✅ Batch Read Results:", Object.fromEntries(batchResults));

    console.log("🎉 SEMUA PENGUJIAN MODBUS TCP BERHASIL 100%!");
  } catch (err) {
    console.error("❌ Test Modbus Gagal:", err.message);
  } finally {
    client.disconnect();
  }
}

testModbus();
