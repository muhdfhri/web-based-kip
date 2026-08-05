import AiGradingPanel from "../AiGradingShared/AiGradingPanel.jsx";

const categories = [
  { key: "usb", label: "USB", color: "#ef4444" },
  { key: "psb", label: "PSB", color: "#f59e0b" },
  { key: "eb", label: "EB", color: "#10b981" },
];

export default function AiGradingEbcTab({ configMode }) {
  return (
    <AiGradingPanel
      service="EBC"
      servicePort={4206}
      apiPath="/api/threshing-ebc"
      storageKey="mewah_threshing_ebc_api_base"
      streamTitle="LIVE EBC CONVEYOR STREAM"
      analysisTitle="CATEGORY ANALYSIS"
      categories={categories}
      primaryCategory="eb"
      configMode={configMode}
    />
  );
}
