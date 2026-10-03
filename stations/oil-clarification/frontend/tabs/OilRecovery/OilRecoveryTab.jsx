import { OCCardSVG, MaintenanceCardSVG, OCLabelSVG, EquipmentImageSVG } from '../Overview/OilClarificationOverviewTab.jsx';

const OilRecoveryTab = ({
  viewMode,
  simData = {},
  handleEquipmentClick,
  LiquidFlowSVG
}) => {
  return (
    <g>
      <OCLabelSVG x={650} y={150} label={"Decanter\nStation"} fontSize="22px" />
      <OCLabelSVG x={1400} y={150} label={"Sludge Separator\nStation"} fontSize="22px" />

      {/* Flow Lines */}
      <LiquidFlowSVG d="M -263,985 L -224,986" isRunning={true} color="#da8c62ff" thickness={7} />
      <LiquidFlowSVG d="M -187,934 L -190,613 Q -190,591 -168,591 L -146,590" isRunning={true} color="#da8c62ff" thickness={7} />

      {viewMode === "process" ? (
        <g>
          <OCCardSVG
            x={650}
            y={280}
            label="Decanter 1"
            values={[
              { label: "Ampere", value: simData.decanterAmp || "32.4", unit: "A" },
              { label: "Vib", value: simData.decanterVib || "1.8", unit: "mm/s" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("decanter1")}
          />
          <OCCardSVG
            x={1400}
            y={280}
            label="Sludge Separator 1"
            values={[
              { label: "Ampere", value: "45.0", unit: "A" },
              { label: "Temp", value: "92.0", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("separator1")}
          />
        </g>
      ) : viewMode === "maintenance" ? (
        <g>
          <MaintenanceCardSVG
            x={650}
            y={280}
            id="m-decanter1"
            label="M-DECANTER_1"
            params={[
              { label: "AMP", value: "32.4", unit: "A" },
              { label: "VIB", value: "1.8", unit: "mm/s" },
            ]}
            onClick={handleEquipmentClick}
          />
          <MaintenanceCardSVG
            x={1400}
            y={280}
            id="m-separator1"
            label="M-SEPARATOR_1"
            params={[
              { label: "AMP", value: "45.0", unit: "A" },
              { label: "TEMP", value: "92.0", unit: "°C" },
            ]}
            onClick={handleEquipmentClick}
          />
        </g>
      ) : null}
    </g>
  );
};

export default OilRecoveryTab;
