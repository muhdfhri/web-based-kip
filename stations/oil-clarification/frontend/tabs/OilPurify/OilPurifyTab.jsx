import { OCCardSVG, MaintenanceCardSVG, OCLabelSVG } from '../Overview/OilClarificationOverviewTab.jsx';

const OilPurifyTab = ({
  viewMode,
  simData = {},
  handleEquipmentClick,
  LiquidFlowSVG
}) => {
  return (
    <g>
      <OCLabelSVG x={500} y={150} label={"Oil Purifier\nStation"} fontSize="22px" />
      <OCLabelSVG x={1200} y={150} label={"Vacuum Dryer\nStation"} fontSize="22px" />

      {/* Flow Lines */}
      <LiquidFlowSVG d="M 100,300 L 400,300" isRunning={true} color="#eab308" thickness={8} />
      <LiquidFlowSVG d="M 600,300 L 1100,300" isRunning={true} color="#eab308" thickness={8} />

      {viewMode === "process" ? (
        <g>
          <OCCardSVG
            x={500}
            y={280}
            label="Oil Purifier 1"
            values={[
              { label: "Ampere", value: "28.5", unit: "A" },
              { label: "Temp", value: "95.0", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("purifier1")}
          />
          <OCCardSVG
            x={800}
            y={280}
            label="Oil Purifier 2"
            values={[
              { label: "Ampere", value: "27.8", unit: "A" },
              { label: "Temp", value: "94.5", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("purifier2")}
          />
          <OCCardSVG
            x={1200}
            y={280}
            label="Vacuum Dryer"
            values={[
              { label: "Vacuum", value: "-0.8", unit: "bar" },
              { label: "Temp", value: "98.0", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("vacuum_dryer")}
          />
        </g>
      ) : viewMode === "maintenance" ? (
        <g>
          <MaintenanceCardSVG
            x={500}
            y={280}
            id="m-purifier1"
            label="M-PURIFIER_1"
            params={[
              { label: "AMP", value: "28.5", unit: "A" },
              { label: "TEMP", value: "95.0", unit: "°C" },
            ]}
            onClick={handleEquipmentClick}
          />
          <MaintenanceCardSVG
            x={1200}
            y={280}
            id="m-vacuum_dryer"
            label="M-VAC_DRYER"
            params={[
              { label: "VAC", value: "-0.8", unit: "bar" },
              { label: "TEMP", value: "98.0", unit: "°C" },
            ]}
            onClick={handleEquipmentClick}
          />
        </g>
      ) : null}
    </g>
  );
};

export default OilPurifyTab;
