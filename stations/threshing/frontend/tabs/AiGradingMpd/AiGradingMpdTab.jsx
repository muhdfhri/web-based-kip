import AiGradingPanel from "../AiGradingShared/AiGradingPanel.jsx";

const categories = [
  { key: "normal_cook", label: "NORMAL COOK", color: "#10b981" },
  { key: "under_cook", label: "UNDER COOK", color: "#f59e0b" },
  { key: "over_cook", label: "OVER COOK", color: "#f97316" },
];

export default function AiGradingMpdTab({ configMode }) {
  return (
    <AiGradingPanel
      service="MPD"
      servicePort={4106}
      apiPath="/api/threshing-mpd"
      storageKey="mewah_threshing_mpd_api_base"
      streamTitle="LIVE MPD CONVEYOR STREAM"
      analysisTitle="CATEGORY ANALYSIS"
      categories={categories}
      primaryCategory="normal_cook"
      configMode={configMode}
    />
  );
}
