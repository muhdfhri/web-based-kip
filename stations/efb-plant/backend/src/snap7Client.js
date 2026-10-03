import net from "net";

/**
 * Snap7 Client Wrapper for Siemens S7 PLC - Station EFB Plant
 */

let S7ClientClass;
let isMock = false;

try {
  const snap7 = await import("node-snap7");
  S7ClientClass = snap7.default.S7Client;
  console.log("[snap7Client] node-snap7 successfully loaded.");
} catch (e) {
  isMock = true;
  console.warn(
    "[snap7Client] node-snap7 not found — PLC connection disabled. Install: npm install node-snap7",
  );
}

const DATA_TYPE_SIZE = { BOOL: 1, INT: 2, DINT: 4, REAL: 4 };

class Snap7ClientWrapper {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig;
    if (isMock || !S7ClientClass) {
      this.client = null;
      this.connected = false;
      this.lastError =
        "node-snap7 not installed. Install: npm install node-snap7";
    } else {
      this.client = new S7ClientClass();

      // Support port embedded in ip_address (e.g. 127.0.0.1:1102) or deviceConfig.port or PLC_PORT
      let remoteHost = deviceConfig?.ip_address || "127.0.0.1";
      let remotePort = parseInt(deviceConfig?.port || process.env.PLC_PORT || "1102", 10);
      if (remoteHost.includes(":")) {
        const parts = remoteHost.split(":");
        remoteHost = parts[0];
        remotePort = parseInt(parts[1], 10) || remotePort;
      }
      this.host = remoteHost;
      this.port = remotePort;

      this.client.SetParam(2, remotePort);

      // Set timeout socket agar cepat mendeteksi disconnect fisik
      this.client.SetParam(3, 1000); // p_i32_PingTimeout = 3
      this.client.SetParam(4, 1500); // p_i32_SendTimeout = 4
      this.client.SetParam(5, 1500); // p_i32_RecvTimeout = 5

      this.connected = false;
      this.lastError = null;
    }
  }

  /**
   * Fast TCP socket probe to avoid blocking Winsock ConnectTo 25-second OS timeout
   */
  async isPortReachable(ip, port, timeout = 1000) {
    const targetPort = port || this.port || parseInt(process.env.PLC_PORT || "1102", 10);
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

      socket.connect(targetPort, ip);
    });
  }

  async connect() {
    if (!this.client) return;
    const { rack, slot } = this.deviceConfig;
    let ip = this.host || this.deviceConfig.ip_address || "127.0.0.1";
    let remotePort = this.port || parseInt(process.env.PLC_PORT || "1102", 10);

    if (ip.includes(":")) {
      const parts = ip.split(":");
      ip = parts[0];
      remotePort = parseInt(parts[1], 10) || remotePort;
    }

    this.client.SetParam(2, remotePort);

    // Fast TCP Probe (1.0s timeout): Avoid 25s blocking Winsock ConnectTo delay when endpoint is dead
    const reachable = await this.isPortReachable(ip, remotePort, 1000);
    if (!reachable) {
      this.connected = false;
      this.lastError = `PLC TCP Endpoint unreachable (${ip}:${remotePort} timeout)`;
      throw new Error(this.lastError);
    }

    await new Promise((resolve, reject) => {
      this.client.ConnectTo(ip, rack, slot, (err) => {
        if (err) {
          const text = this.client.ErrorText(err);
          this.connected = false;
          this.lastError = text;
          console.error("[snap7Client] PLC connect error", {
            ip,
            port: remotePort,
            rack,
            slot,
            error: text,
          });
          return reject(new Error(text));
        }
        this.connected = true;
        this.lastError = null;
        console.log("[snap7Client] PLC connected", { ip, port: remotePort, rack, slot });
        resolve();
      });
    });
  }

  async ensureConnected() {
    if (!this.connected) {
      await this.connect();
    }
  }

  async readTag(tag) {
    await this.ensureConnected();
    const { db_number, byte_offset, bit_offset, data_type, node_id } = tag;
    const area =
      node_id && ["M", "I", "Q", "DB"].includes(node_id.toUpperCase())
        ? node_id.toUpperCase()
        : "DB";
    const dbNum = area === "DB" ? db_number : 0;

    return new Promise((resolve, reject) => {
      const size = DATA_TYPE_SIZE[data_type] || 4;
      if (area === "DB") {
        this.client.DBRead(dbNum, byte_offset, size, (err, res) => {
          if (err) {
            const text = this.handleReadError(err);
            this.connected = false;
            return reject(new Error(text));
          }
          if (!res) {
            this.lastError = "PLC read returned null";
            return reject(new Error(this.lastError));
          }
          try {
            const value = this.parseBuffer(res, data_type, bit_offset, 0);
            resolve(value);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        let s7Area = this.client.S7AreaMK;
        if (area === "I") s7Area = this.client.S7AreaPE;
        else if (area === "Q") s7Area = this.client.S7AreaPA;

        this.client.ReadArea(s7Area, 0, byte_offset, size, this.client.S7WLByte, (err, res) => {
          if (err) {
            const text = this.handleReadError(err);
            this.connected = false;
            return reject(new Error(text));
          }
          if (!res) {
            this.lastError = "PLC read returned null";
            return reject(new Error(this.lastError));
          }
          try {
            const value = this.parseBuffer(res, data_type, bit_offset, 0);
            resolve(value);
          } catch (e) {
            reject(e);
          }
        });
      }
    });
  }

  async readMultipleTags(tags) {
    await this.ensureConnected();
    const grouped = {};
    for (const tag of tags) {
      const area =
        tag.node_id && ["M", "I", "Q", "DB"].includes(tag.node_id.toUpperCase())
          ? tag.node_id.toUpperCase()
          : "DB";
      const dbNum = area === "DB" ? tag.db_number : 0;
      const key = `${area}_${dbNum}`;
      if (!grouped[key]) grouped[key] = { area, dbNum, tags: [] };
      grouped[key].tags.push(tag);
    }

    const results = new Map();

    for (const [key, group] of Object.entries(grouped)) {
      const { area, dbNum, tags: dbTags } = group;
      const sortedTags = [...dbTags].sort((a, b) => a.byte_offset - b.byte_offset);
      
      const chunks = [];
      let currentChunk = [];
      let chunkMin = null;
      let chunkMax = null;

      for (const tag of sortedTags) {
        const size = DATA_TYPE_SIZE[tag.data_type] || 4;
        const tagEnd = tag.byte_offset + size;
        
        if (currentChunk.length === 0) {
          currentChunk.push(tag);
          chunkMin = tag.byte_offset;
          chunkMax = tagEnd;
        } else {
          if (tagEnd - chunkMin <= 2048 && (tag.byte_offset - chunkMax) <= 600) {
            currentChunk.push(tag);
            chunkMax = Math.max(chunkMax, tagEnd);
          } else {
            chunks.push({ tags: currentChunk, minOffset: chunkMin, totalBytes: chunkMax - chunkMin });
            currentChunk = [tag];
            chunkMin = tag.byte_offset;
            chunkMax = tagEnd;
          }
        }
      }
      if (currentChunk.length > 0) {
        chunks.push({ tags: currentChunk, minOffset: chunkMin, totalBytes: chunkMax - chunkMin });
      }

      for (const chunk of chunks) {
        const { tags: chunkTags, minOffset, totalBytes } = chunk;
        try {
          const buffer = await new Promise((resolve, reject) => {
            if (area === "DB") {
              this.client.DBRead(dbNum, minOffset, totalBytes, (err, res) => {
                if (err) return reject(new Error(this.handleReadError(err)));
                if (!res)
                  return reject(new Error("PLC batch DBRead returned null"));
                resolve(res);
              });
            } else {
              let s7Area;
              if (area === "I") s7Area = this.client.S7AreaPE;
              else if (area === "Q") s7Area = this.client.S7AreaPA;
              else if (area === "M") s7Area = this.client.S7AreaMK;

              this.client.ReadArea(
                s7Area,
                0,
                minOffset,
                totalBytes,
                this.client.S7WLByte,
                (err, res) => {
                  if (err) return reject(new Error(this.handleReadError(err)));
                  if (!res)
                    return reject(new Error("PLC batch ReadArea returned null"));
                  resolve(res);
                },
              );
            }
          });

          for (const tag of chunkTags) {
            try {
              const localOffset = tag.byte_offset - minOffset;
              const value = this.parseBuffer(
                buffer,
                tag.data_type,
                tag.bit_offset,
                localOffset,
              );
              results.set(tag.id, value);
            } catch (e) {
              console.error(`[snap7Client] Batch parse error: ${tag.tag_name}`, {
                error: e.message,
              });
            }
          }
        } catch (e) {
          console.error(`[snap7Client] Batch read ${area}${dbNum} [${minOffset}..${minOffset + totalBytes}] failed (${e.message})`);
          const isNetworkErr = e.message && (
            e.message.toLowerCase().includes("tcp") || 
            e.message.toLowerCase().includes("timeout") || 
            e.message.toLowerCase().includes("connection")
          );
          if (isNetworkErr) {
            this.connected = false;
            throw e;
          }
        }
      }
    }

    return results;
  }

  parseBuffer(buffer, dataType, bitOffset, localOffset) {
    switch (dataType) {
      case "BOOL": {
        const byte = buffer.readUInt8(localOffset);
        const bit =
          bitOffset !== null && bitOffset !== undefined ? bitOffset : 0;
        return (byte & (1 << bit)) !== 0;
      }
      case "INT":
        return buffer.readInt16BE(localOffset);
      case "DINT":
        return buffer.readInt32BE(localOffset);
      case "REAL":
        return buffer.readFloatBE(localOffset);
      default:
        throw new Error(`Unsupported data_type: ${dataType}`);
    }
  }

  async writeTag(tag, value) {
    await this.ensureConnected();
    const { db_number, byte_offset, bit_offset, data_type, node_id } = tag;
    const areaStr =
      node_id && ["M", "I", "Q", "DB"].includes(node_id.toUpperCase())
        ? node_id.toUpperCase()
        : "DB";
    const dbNum = areaStr === "DB" ? db_number : 0;

    let s7Area = this.client.S7AreaDB;
    if (areaStr === "I") s7Area = this.client.S7AreaPE;
    else if (areaStr === "Q") s7Area = this.client.S7AreaPA;
    else if (areaStr === "M") s7Area = this.client.S7AreaMK;

    const performRead = (amount) => {
      return new Promise((resolve, reject) => {
        if (areaStr === "DB") {
          this.client.DBRead(dbNum, byte_offset, amount, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
        } else {
          this.client.ReadArea(
            s7Area,
            dbNum,
            byte_offset,
            amount,
            this.client.S7WLByte,
            (err, res) => {
              if (err) return reject(err);
              resolve(res);
            },
          );
        }
      });
    };

    const performWrite = (amount, buf) => {
      return new Promise((resolve, reject) => {
        if (areaStr === "DB") {
          this.client.DBWrite(dbNum, byte_offset, amount, buf, (err) => {
            if (err) return reject(err);
            resolve();
          });
        } else {
          this.client.WriteArea(
            s7Area,
            dbNum,
            byte_offset,
            amount,
            this.client.S7WLByte,
            buf,
            (err) => {
              if (err) return reject(err);
              resolve();
            },
          );
        }
      });
    };

    return new Promise(async (resolve, reject) => {
      if (
        data_type === "BOOL" &&
        bit_offset !== null &&
        bit_offset !== undefined
      ) {
        const bitAddress = (byte_offset * 8) + Number(bit_offset);
        const buf = Buffer.from([value ? 0x01 : 0x00]);
        this.client.WriteArea(
          s7Area,
          dbNum,
          bitAddress,
          1,
          this.client.S7WLBit,
          buf,
          (err) => {
            if (err) {
              const text = this.client.ErrorText(err);
              this.lastError = text;
              this.connected = false;
              return reject(new Error(text));
            }
            console.log(
              `[snap7Client] Write ${areaStr}${dbNum}.${byte_offset}.${bit_offset} = ${value}`,
            );
            resolve();
          }
        );
      } else {
        const size = DATA_TYPE_SIZE[data_type] || 4;
        const buf = Buffer.alloc(size);
        switch (data_type) {
          case "INT":
            buf.writeInt16BE(Number(value), 0);
            break;
          case "DINT":
            buf.writeInt32BE(Number(value), 0);
            break;
          case "REAL":
            buf.writeFloatBE(Number(value), 0);
            break;
          default:
            return reject(
              new Error(`Unsupported write data_type: ${data_type}`),
            );
        }

        try {
          await performWrite(size, buf);
          resolve();
        } catch (err) {
          const text = this.client.ErrorText(err);
          this.lastError = text;
          this.connected = false;
          return reject(new Error(text));
        }
      }
    });
  }

  isNetworkError(errorText) {
    if (!errorText) return false;
    const lower = errorText.toLowerCase();
    return (
      lower.includes("connection") ||
      lower.includes("socket") ||
      lower.includes("timeout") ||
      lower.includes("unreachable") ||
      lower.includes("iso on tcp")
    );
  }

  handleReadError(err) {
    const text = this.client.ErrorText(err);
    this.lastError = text;
    if (this.isNetworkError(text)) this.connected = false;
    return text;
  }

  disconnect() {
    try {
      this.client.Disconnect();
    } catch (e) {
      /* ignore */
    }
    this.connected = false;
  }
}

export { Snap7ClientWrapper, isMock };
