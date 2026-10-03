import { OCCardSVG, MaintenanceCardSVG, OCLabelSVG } from '../Overview/OilClarificationOverviewTab.jsx';

const OilStorageDispatchTab = ({
  viewMode,
  simData = {},
  handleEquipmentClick,
  LiquidFlowSVG
}) => {
  return (
    <g>
      <OCLabelSVG x={400} y={150} label={"CPO Storage Tank 1"} fontSize="20px" />
      <OCLabelSVG x={800} y={150} label={"CPO Storage Tank 2"} fontSize="20px" />
      <OCLabelSVG x={1200} y={150} label={"CPO Storage Tank 3"} fontSize="20px" />
      <OCLabelSVG x={1600} y={150} label={"Dispatch Station"} fontSize="20px" />

      {/* Flow Lines */}
      <LiquidFlowSVG d="M 200,300 L 1600,300" isRunning={true} color="#eab308" thickness={10} />

      {viewMode === "process" ? (
        <g>
          <OCCardSVG
            x={400}
            y={280}
            label="CPO Tank 1"
            values={[
              { label: "Level", value: "4850", unit: "mm" },
              { label: "Temp", value: "55.0", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("cpo_tank1")}
          />
          <OCCardSVG
            x={800}
            y={280}
            label="CPO Tank 2"
            values={[
              { label: "Level", value: "3200", unit: "mm" },
              { label: "Temp", value: "54.5", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("cpo_tank2")}
          />
          <OCCardSVG
            x={1200}
            y={280}
            label="CPO Tank 3"
            values={[
              { label: "Level", value: "1500", unit: "mm" },
              { label: "Temp", value: "54.0", unit: "°C", type: "temp" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("cpo_tank3")}
          />
          <OCCardSVG
            x={1600}
            y={280}
            label="Dispatch Pump 1"
            values={[
              { label: "Ampere", value: "18.5", unit: "A" },
              { label: "Flow", value: "45.0", unit: "m³/h" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("dispatch_pump1")}
          />
        </g>
      ) : viewMode === "maintenance" ? (
        <g>
          <MaintenanceCardSVG
            x={400}
            y={280}
            id="m-cpo_tank1"
            label="M-CPO_TANK1"
            params={[
              { label: "LEVEL", value: "4850", unit: "mm" },
              { label: "TEMP", value: "55.0", unit: "°C" },
            ]}
            onClick={handleEquipmentClick}
          />
          <MaintenanceCardSVG
            x={1600}
            y={280}
            id="m-dispatch_pump1"
            label="M-DISPATCH_PUMP1"
            params={[
              { label: "AMP", value: "18.5", unit: "A" },
              { label: "FLOW", value: "45.0", unit: "m³/h" },
            ]}
            onClick={handleEquipmentClick}
          />
        </g>
      ) : null}
    </g>
  );
};

export default OilStorageDispatchTab;
