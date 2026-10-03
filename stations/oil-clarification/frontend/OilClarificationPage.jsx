import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./OilClarificationPage.css";
import SettingsPage from "./settings/OilClarificationSettingsPage.jsx";
import pompaKananSvg from "./assets/pompa_kanan.svg";
import valveAtasSvg from "./assets/valve_atas.svg";
import valveKiriSvg from "./assets/valve_kiri.svg";
import flowMeterKananSvg from "./assets/flow_meter_kanan.svg";
import flowMeterKiriSvg from "./assets/flow_meter_kiri.svg";
import oilClarificationRoomImg from "./assets/oil_clarification_room.webp";
import oilRecoveryImg from "./assets/oil_recovery.webp";
import waterGif from "./assets/water.gif";
import WaterBottomGif from "./assets/water_lapisan_bawah.gif";
import { LiquidFlowSVG } from "./components/OilClarificationComponents.jsx";

// Tab imports from tabs/
import OilClarificationOverviewTab from "./tabs/Overview/OilClarificationOverviewTab.jsx";
import OilRecoveryTab from "./tabs/OilRecovery/OilRecoveryTab.jsx";
import OilPurifyTab from "./tabs/OilPurify/OilPurifyTab.jsx";
import OilStorageDispatchTab from "./tabs/OilStorageDispatch/OilStorageDispatchTab.jsx";

// Application Modals
import CstAutoSkimmerModal from "./application/auto_skimmer/CstAutoSkimmerModal.jsx";

function OilClarificationPage({ user }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState("process");
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [svgSize, setSvgSize] = useState({ width: "100%", height: "100%" });

  // CST Auto Skimmer Modal state
  const [autoSkimmerModal, setAutoSkimmerModal] = useState({
    isOpen: false,
    tankNumber: 1
  });

  const svgRef = useRef(null);
  const imgRef = useRef(null);

  const generateRandomValues = () => ({
    sandTrapTemp: (75 + Math.random() * 2 - 1).toFixed(1),
    pressure: (20 + Math.random() * 1 - 0.5).toFixed(1),
    vibScreen: (100 + Math.random() * 5 - 2.5).toFixed(0),
    pumpAmp: (100 + Math.random() * 5 - 2.5).toFixed(0),
    sludgeTemp: (90 + Math.random() * 2 - 1).toFixed(1),
    sludgeLevel: (311 + Math.random() * 10 - 5).toFixed(0),
    steam: (30 + Math.random() * 2 - 1).toFixed(1),
    brushStrainerAmp: (4.2 + Math.random() * 0.5 - 0.25).toFixed(1),
    brushStrainerVib: (1.2 + Math.random() * 0.2 - 0.1).toFixed(1),
    decanterAmp: (32.4 + Math.random() * 2 - 1).toFixed(1),
    decanterVib: (1.8 + Math.random() * 0.2 - 0.1).toFixed(1),
    cstLevel: (90 + Math.random() * 2 - 1).toFixed(1)
  });

  const [simData, setSimData] = useState(generateRandomValues());

  useEffect(() => {
    const simTimer = setInterval(() => {
      setSimData(generateRandomValues());
    }, 3000);
    return () => clearInterval(simTimer);
  }, []);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const domW = entry.contentRect.width;
        const domH = entry.contentRect.height;
        const img = imgRef.current;

        if (!img.naturalWidth || !img.naturalHeight) {
          setSvgSize({ width: domW, height: domH });
          continue;
        }

        const natW = img.naturalWidth;
        const natH = img.naturalHeight;

        const domRatio = domW / domH;
        const natRatio = natW / natH;

        let renderW = domW;
        let renderH = domH;

        if (natRatio > domRatio) {
          renderH = domW / natRatio;
        } else {
          renderW = domH * natRatio;
        }

        setSvgSize({ width: renderW, height: renderH });
      }
    });

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) });
  };

  const handleEquipmentClick = (id) => console.log(`Equipment clicked: ${id}`);

  return (
    <div className={`som-clarification-page som-mode-${viewMode}`}>
      {/* Header & Sub-Nav Tabs */}
      <div className="som-station-header">
        <div className="som-header-left">
          <div className="som-oc-station-heading">
            <h2 className="som-station-title">Oil Clarification Room</h2>
          </div>

          <div className="som-station-tabs">
            <button
              data-tour="oc-tab-overview"
              className={`som-station-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("overview");
                if (viewMode === "setting") setViewMode("process");
              }}
            >
              Oil Clarification
            </button>
            <button
              data-tour="oc-tab-recovery"
              className={`som-station-tab ${activeTab === "recovery" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("recovery");
                if (viewMode === "setting") setViewMode("process");
              }}
            >
              Oil Recovery
            </button>
            <button
              data-tour="oc-tab-purify"
              className={`som-station-tab ${activeTab === "purify" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("purify");
                if (viewMode === "setting") setViewMode("process");
              }}
            >
              Oil Purify
            </button>
            <button
              data-tour="oc-tab-storage"
              className={`som-station-tab ${activeTab === "storage" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("storage");
                if (viewMode === "setting") setViewMode("process");
              }}
            >
              Oil Storage & Dispatch
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="som-view-toggle-container" style={{ marginLeft: "auto" }}>
          <div className="som-view-toggle-buttons">
            <button
              data-tour="oc-mode-process"
              className={`som-view-btn ${viewMode === "process" ? "active" : ""}`}
              onClick={() => setViewMode("process")}
            >
              PROCESS VIEW
            </button>
            <button
              data-tour="oc-mode-maintenance"
              className={`som-view-btn ${viewMode === "maintenance" ? "active" : ""}`}
              onClick={() => setViewMode("maintenance")}
            >
              MAINTENANCE VIEW
            </button>
            <button
              data-tour="oc-mode-setting"
              className={`som-view-btn ${viewMode === "setting" ? "active" : ""}`}
              onClick={() => setViewMode("setting")}
            >
              SETTING VIEW
            </button>
          </div>
          <select
            className="som-view-toggle-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="process">PROCESS VIEW</option>
            <option value="maintenance">MAINTENANCE VIEW</option>
            <option value="setting">SETTING VIEW</option>
          </select>
        </div>
      </div>

      {/* Main Canvas View */}
      <main className="som-oc-content-modern">
        {viewMode === "setting" ? (
          <SettingsPage setViewMode={setViewMode} />
        ) : (
          <div className="som-oc-scada-container">
            <div className="som-oc-image-wrapper">
              {(activeTab === "overview" || activeTab === "recovery") && (
                <img
                  ref={imgRef}
                  src={activeTab === "overview" ? oilClarificationRoomImg : oilRecoveryImg}
                  alt="Oil Clarification Process"
                  className="som-oc-scada-img"
                />
              )}

              {/* SVG Overlay */}
              <svg
                ref={svgRef}
                viewBox="0 0 1920 1080"
                className="station-svg-canvas"
                preserveAspectRatio="xMidYMid meet"
                style={{
                  width: svgSize.width,
                  height: svgSize.height,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                onMouseMove={handleMouseMove}
              >
                {viewMode === "maintenance" && (
                  <foreignObject x="650" y="20" width="600" height="60" style={{ overflow: "visible" }}>
                    <div className="som-diagnostic-banner">TECHNICAL DIAGNOSTIC ACTIVE</div>
                  </foreignObject>
                )}

                {/* Render Modular Tabs */}
                {activeTab === "overview" && (
                  <OilClarificationOverviewTab
                    viewMode={viewMode}
                    simData={simData}
                    handleEquipmentClick={handleEquipmentClick}
                    LiquidFlowSVG={LiquidFlowSVG}
                    waterGif={waterGif}
                    WaterBottomGif={WaterBottomGif}
                    pompaKananSvg={pompaKananSvg}
                    valveKiriSvg={valveKiriSvg}
                    valveAtasSvg={valveAtasSvg}
                    flowMeterKananSvg={flowMeterKananSvg}
                    flowMeterKiriSvg={flowMeterKiriSvg}
                    onOpenAutoSkimmerModal={(tankNum) =>
                      setAutoSkimmerModal({ isOpen: true, tankNumber: tankNum })
                    }
                  />
                )}

                {activeTab === "recovery" && (
                  <OilRecoveryTab
                    viewMode={viewMode}
                    simData={simData}
                    handleEquipmentClick={handleEquipmentClick}
                    LiquidFlowSVG={LiquidFlowSVG}
                  />
                )}

                {activeTab === "purify" && (
                  <OilPurifyTab
                    viewMode={viewMode}
                    simData={simData}
                    handleEquipmentClick={handleEquipmentClick}
                    LiquidFlowSVG={LiquidFlowSVG}
                  />
                )}

                {activeTab === "storage" && (
                  <OilStorageDispatchTab
                    viewMode={viewMode}
                    simData={simData}
                    handleEquipmentClick={handleEquipmentClick}
                    LiquidFlowSVG={LiquidFlowSVG}
                  />
                )}
              </svg>
            </div>
          </div>
        )}
      </main>

      {/* CST Automatic Oil Skimmer Popup Control Modal */}
      <CstAutoSkimmerModal
        isOpen={autoSkimmerModal.isOpen}
        onClose={() => setAutoSkimmerModal({ isOpen: false, tankNumber: 1 })}
        tankNumber={autoSkimmerModal.tankNumber}
        plcData={{
          float_a: 1250,
          float_b: 920,
          oil_thickness: 330,
          skimmer_pos: 45,
          temp: 90.5
        }}
      />
    </div>
  );
}

export default OilClarificationPage;
