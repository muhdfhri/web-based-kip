import ModbusRTU from "modbus-serial";
import net from "net";

/**
 * Modbus TCP Client Wrapper for Haiwell PLC & HMI Gateway (C10S-RW / T32S0R)
 * Drop-in replacement for Snap7ClientWrapper dengan antarmuka yang sama persis.
 */

const DATA_TYPE_SIZE = { BOOL: 1, INT: 1, WORD: 1, UINT: 1, DINT: 2, REAL: 2 };

class ModbusClientWrapper {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig || {};
    this.client = new ModbusRTU();
    this.connected = false;
    this.lastError = null;
    this.slaveId = parseInt(this.deviceConfig.slave_id || process.env.PLC_SLAVE_ID || "1", 10);
    this.timeoutMs = parseInt(process.env.PLC_TIMEOUT_MS || "2000", 10);
  }

  /**
   * Fast TCP socket probe untuk mendeteksi ketersediaan port Modbus
   */
  async isPortReachable(ip, port = 502, timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status = false;

      socket.setTimeout(timeout);
      socket.on("connect", () => {
        status = true;
        socket.destroy();
      });
      socket.on("timeout", () => {
        socket.destroy();
      });
      socket.on("error", () => {
        socket.destroy();
      });
      socket.on("close", () => {
        resolve(status);
      });

      socket.connect(port, ip);
    });
  }

  async connect() {
    const isRtu =
      (this.deviceConfig.connection_type && this.deviceConfig.connection_type.toUpperCase() === "RTU") ||
      (process.env.PLC_MODBUS_TYPE && process.env.PLC_MODBUS_TYPE.toUpperCase() === "RTU") ||
      (this.deviceConfig.ip_address && this.deviceConfig.ip_address.toUpperCase().startsWith("COM"));

    // ── OPSI A: MODBUS RTU (SERIAL RS485 / COM PORT) ──
    if (isRtu) {
      const comPort = this.deviceConfig.serial_port || this.deviceConfig.ip_address || process.env.PLC_SERIAL_PORT || "COM3";
      const baudRate = parseInt(this.deviceConfig.baud_rate || process.env.PLC_BAUD_RATE || "19200", 10);
      const dataBits = parseInt(this.deviceConfig.data_bits || "8", 10);
      const stopBits = parseInt(this.deviceConfig.stop_bits || "2", 10);
      const parity = this.deviceConfig.parity || "none";

      return new Promise((resolve, reject) => {
        this.client.setTimeout(this.timeoutMs);
        this.client.connectRTUBuffered(comPort, { baudRate, dataBits, stopBits, parity }, (err) => {
          if (err) {
            this.connected = false;
            this.lastError = `Modbus RTU connect error (${comPort}): ${err.message}`;
            console.error("[modbusClient] " + this.lastError);
            return reject(err);
          }
          this.client.setID(this.slaveId);
          this.connected = true;
          this.lastError = null;
          console.log(`[modbusClient] Connected via Modbus RTU (${comPort}, ${baudRate} bps, Slave ID: ${this.slaveId})`);
          resolve();
        });
      });
    }

    // ── OPSI B: MODBUS TCP (ETHERNET / LAN / WIFI PORT 502) ──
    const ip = this.deviceConfig.ip_address || process.env.PLC_IP || "127.0.0.1";
    const port = parseInt(this.deviceConfig.port || process.env.PLC_PORT || "502", 10);

    // 1. Fast TCP Probe
    const reachable = await this.isPortReachable(ip, port, 1000);
    if (!reachable) {
      this.connected = false;
      this.lastError = `Modbus TCP Endpoint unreachable (${ip}:${port} timeout)`;
      throw new Error(this.lastError);
    }

    // 2. Connect Modbus TCP
    return new Promise((resolve, reject) => {
      this.client.setTimeout(this.timeoutMs);
      this.client.connectTCP(ip, { port }, (err) => {
        if (err) {
          this.connected = false;
          this.lastError = err.message;
          console.error("[modbusClient] Modbus TCP connect error", { ip, port, error: err.message });
          return reject(err);
        }

        this.client.setID(this.slaveId);
        this.connected = true;
        this.lastError = null;
        console.log(`[modbusClient] Connected via Modbus TCP (${ip}:${port}, Slave ID: ${this.slaveId})`);
        resolve();
      });
    });
  }

  async ensureConnected() {
    if (!this.connected || !this.client.isOpen) {
      await this.connect();
    }
  }

  /**
   * Mengambil register address Modbus dari definisi tag
   * Mendukung byte_offset standar atau direct register
   */
  getRegisterAddress(tag) {
    if (tag.register_address !== undefined && tag.register_address !== null) {
      return parseInt(tag.register_address, 10);
    }
    // Kompatibilitas dengan skema lama (byte_offset)
    return parseInt(tag.byte_offset, 10) || 0;
  }

  /**
   * Helper: Parse buffer 16-bit register ke tipe data target
   */
  parseRegisterData(registers, dataType, bitOffset = 0) {
    const type = (dataType || "REAL").toUpperCase();

    switch (type) {
      case "BOOL": {
        // Jika pembacaan dari coil/discrete, registers bernilai array boolean
        if (typeof registers[0] === "boolean") return registers[0];
        // Jika pembacaan dari holding register bitmask
        const val = registers[0] || 0;
        const bit = bitOffset !== null && bitOffset !== undefined ? bitOffset : 0;
        return (val & (1 << bit)) !== 0;
      }
      case "INT": {
        const buf = Buffer.alloc(2);
        buf.writeUInt16BE(registers[0] || 0, 0);
        return buf.readInt16BE(0);
      }
      case "WORD":
      case "UINT": {
        return registers[0] || 0;
      }
      case "DINT": {
        const buf = Buffer.alloc(4);
        buf.writeUInt16BE(registers[0] || 0, 0);
        buf.writeUInt16BE(registers[1] || 0, 2);
        return buf.readInt32BE(0);
      }
      case "REAL":
      case "FLOAT": {
        const buf = Buffer.alloc(4);
        buf.writeUInt16BE(registers[0] || 0, 0);
        buf.writeUInt16BE(registers[1] || 0, 2);
        const floatVal = buf.readFloatBE(0);
        return isNaN(floatVal) ? 0.0 : parseFloat(floatVal.toFixed(2));
      }
      default:
        return registers[0] || 0;
    }
  }

  /**
   * Baca single tag
   */
  async readTag(tag) {
    await this.ensureConnected();
    const reg = this.getRegisterAddress(tag);
    const area = (tag.node_id || "V").toUpperCase();
    const dataType = (tag.data_type || "REAL").toUpperCase();

    try {
      if (area === "M" || area === "Y" || area === "COIL" || dataType === "BOOL") {
        const res = await this.client.readCoils(reg, 1);
        return res.data[0];
      } else if (area === "X" || area === "DISCRETE") {
        const res = await this.client.readDiscreteInputs(reg, 1);
        return res.data[0];
      } else if (area === "AI" || area === "INPUT_REG") {
        const qty = DATA_TYPE_SIZE[dataType] || 2;
        const res = await this.client.readInputRegisters(reg, qty);
        return this.parseRegisterData(res.data, dataType, tag.bit_offset);
      } else {
        // Holding Register (V Memory)
        const qty = DATA_TYPE_SIZE[dataType] || 2;
        const res = await this.client.readHoldingRegisters(reg, qty);
        return this.parseRegisterData(res.data, dataType, tag.bit_offset);
      }
    } catch (err) {
      this.lastError = err.message;
      this.connected = false;
      throw err;
    }
  }

  /**
   * Batch reading multiple tags untuk optimasi performa tinggi
   */
  async readMultipleTags(tags) {
    await this.ensureConnected();
    const results = new Map();

    // Pisahkan tags berdasarkan memory area
    const coilsGroup = [];
    const discreteGroup = [];
    const holdingGroup = [];

    for (const tag of tags) {
      const area = (tag.node_id || "V").toUpperCase();
      const dataType = (tag.data_type || "REAL").toUpperCase();
      if (area === "M" || area === "Y" || area === "COIL" || (dataType === "BOOL" && area !== "V")) {
        coilsGroup.push(tag);
      } else if (area === "X" || area === "DISCRETE") {
        discreteGroup.push(tag);
      } else {
        holdingGroup.push(tag);
      }
    }

    // 1. Baca Coils (Sequential / Batch)
    for (const tag of coilsGroup) {
      try {
        const reg = this.getRegisterAddress(tag);
        const res = await this.client.readCoils(reg, 1);
        results.set(tag.id, res.data[0]);
      } catch (err) {
        // fallback
      }
    }

    // 2. Baca Discrete Inputs
    for (const tag of discreteGroup) {
      try {
        const reg = this.getRegisterAddress(tag);
        const res = await this.client.readDiscreteInputs(reg, 1);
        results.set(tag.id, res.data[0]);
      } catch (err) { }
    }

    // 3. Baca Holding Registers (Batch contiguous chunks jika memungkinkan)
    if (holdingGroup.length > 0) {
      // Sort berdasarkan register address
      holdingGroup.sort((a, b) => this.getRegisterAddress(a) - this.getRegisterAddress(b));

      for (const tag of holdingGroup) {
        try {
          const reg = this.getRegisterAddress(tag);
          const qty = DATA_TYPE_SIZE[tag.data_type] || 2;
          const res = await this.client.readHoldingRegisters(reg, qty);
          const parsed = this.parseRegisterData(res.data, tag.data_type, tag.bit_offset);
          results.set(tag.id, parsed);
        } catch (e) {
          console.error(`[modbusClient] Read tag ${tag.tag_name || tag.id} error:`, e.message);
        }
      }
    }

    return results;
  }

  /**
   * Tulis nilai ke PLC / HMI
   */
  async writeTag(tag, value) {
    await this.ensureConnected();
    const reg = this.getRegisterAddress(tag);
    const area = (tag.node_id || "V").toUpperCase();
    const dataType = (tag.data_type || "REAL").toUpperCase();

    try {
      if (area === "M" || area === "Y" || area === "COIL" || dataType === "BOOL") {
        const boolVal = !!value;
        await this.client.writeCoil(reg, boolVal);
        console.debug(`[modbusClient] Write Coil [${reg}] = ${boolVal}`);
      } else {
        switch (dataType) {
          case "INT": {
            const buf = Buffer.alloc(2);
            buf.writeInt16BE(Math.round(Number(value)), 0);
            await this.client.writeRegister(reg, buf.readUInt16BE(0));
            break;
          }
          case "WORD":
          case "UINT": {
            await this.client.writeRegister(reg, Math.round(Number(value)));
            break;
          }
          case "DINT": {
            const buf = Buffer.alloc(4);
            buf.writeInt32BE(Math.round(Number(value)), 0);
            await this.client.writeRegisters(reg, [buf.readUInt16BE(0), buf.readUInt16BE(2)]);
            break;
          }
          case "REAL":
          case "FLOAT": {
            const buf = Buffer.alloc(4);
            buf.writeFloatBE(Number(value), 0);
            await this.client.writeRegisters(reg, [buf.readUInt16BE(0), buf.readUInt16BE(2)]);
            break;
          }
          default:
            await this.client.writeRegister(reg, Math.round(Number(value)));
        }
        console.debug(`[modbusClient] Write Reg [${reg}] (${dataType}) = ${value}`);
      }
    } catch (err) {
      this.lastError = err.message;
      this.connected = false;
      throw err;
    }
  }

  disconnect() {
    try {
      if (this.client && this.client.isOpen) {
        this.client.close(() => { });
      }
    } catch (e) { }
    this.connected = false;
  }
}

const isMock = false;
export { ModbusClientWrapper, isMock };
