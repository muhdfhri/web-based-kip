import React, { useRef } from 'react';
import waterDilutionImgUrl from '../../assets/waterdilution.webp';
import { LiquidFlowSVG } from "../../components/Flows.jsx";
import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";

export default function WaterDilutionTab({
    viewMode,
    pressStatus,
    configMode,
    handleEquipmentClick,
    lv,
    getTag,
    flowBuilder
}) {
    const svgRef = useRef(null);

    return (
        <svg
            ref={svgRef}
            viewBox="1550 -30 720 375"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
        >
            <image
                href={waterDilutionImgUrl}
                width="720"
                height="375"
                x="1550"
                y="-30"
                className="som-station-bg-image"
            />

            {/* User requested flow graphic */}
            {parseFloat(lv('flow', 'FLOW', '15.5')) > 0 && (
                <LiquidFlowSVG
                    d="M 1618,85 L 1555,85"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('flow', 'FLOW', '15.5')) > 0 && (
                <LiquidFlowSVG
                    d="M 1963,304 L 1778,304 Q 1756,304 1735,304 L 1735,304 Q 1713,304 1713,283 L 1717,108 Q 1718,83 1693,84 L 1649,86"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('vcv', 'CV', '65.0')) > 0 && (
                <LiquidFlowSVG
                    d="M 2210,70 L 2220,71 Q 2229,74 2229,84 L 2228,264 Q 2228,275 2223,280 L 2209,283"
                    isRunning={true}
                    color="#38bdf8"
                    thickness={8}
                />
            )}
            {parseFloat(lv('flow', 'FLOW', '15.5')) > 0 && (
                <LiquidFlowSVG
                    d="M 1964,304 L 1870,304"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {flowBuilder && (
                <WTFlowOverlay
                    flows={flowBuilder.flows}
                    activeFlowIdx={flowBuilder.activeFlowIdx}
                    isActive={flowBuilder.isActive}
                    isPlacing={flowBuilder.isPlacing}
                    onPointDrag={flowBuilder.updatePoint}
                    onInsertPoint={flowBuilder.insertPoint}
                    onDeletePoint={flowBuilder.deletePoint}
                    onSelectFlow={flowBuilder.setActiveFlowIdx}
                    onCanvasClick={flowBuilder.addPointToActiveFlow}
                />
            )}
        </svg>
    );
}
