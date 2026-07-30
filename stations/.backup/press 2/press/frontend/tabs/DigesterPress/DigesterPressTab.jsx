import React, { useRef } from 'react';
import digesterPressImgUrl from '../../assets/digester&press.webp';
import { LiquidFlowSVG } from "../../components/Flows.jsx";
import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";

export default function DigesterPressTab({
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
            viewBox="-350 -30 2000 1042"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
        >
            <image
                href={digesterPressImgUrl}
                width="2000"
                height="1042"
                x="-350"
                y="-30"
                className="som-station-bg-image"
            />

            {/* User requested flow graphic */}
            {parseFloat('0.1') > 0 && (
                <LiquidFlowSVG
                    d="M 1644,294 L 283,295 Q 258,295 233,295 L 33,292 Q 8,292 -17,292 L -275,294"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {/* Digester 1 Pipa Lurus (Sebelum Valve) */}
            <LiquidFlowSVG
                d="M -123,301 L -121,421"
                isRunning={parseFloat(lv('tc1', 'CV', '0')) > 0}
                color="#f59e0b"
                thickness={8}
            />
            {/* Digester 1 Steam Valve Flow (Sesudah Valve) */}
            {parseFloat(lv('tc1', 'CV', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M -121,421 L -121,575 Q -121,584 -115,591 L -109,597"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {/* Digester 2 Pipa Lurus (Sebelum Valve) */}
            <LiquidFlowSVG
                d="M 374,304 L 376,424"
                isRunning={parseFloat(lv('tc2', 'CV', '0')) > 0}
                color="#f59e0b"
                thickness={8}
            />
            {/* Digester 2 Steam Valve Flow (Sesudah Valve) */}
            {parseFloat(lv('tc2', 'CV', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 376,424 L 375,568 Q 375,580 381,590 L 387,600"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            <LiquidFlowSVG
                d="M 879,310 L 879,465"
                isRunning={parseFloat(lv('tc3', 'CV', '0')) > 0}
                color="#f59e0b"
                thickness={8}
            />
            <LiquidFlowSVG
                d="M 1377,310 L 1377,468"
                isRunning={parseFloat(lv('tc4', 'CV', '0')) > 0}
                color="#f59e0b"
                thickness={8}
            />

            {/* Digester 3 Steam Valve Flow */}
            {parseFloat(lv('tc3', 'CV', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 879,481 L 879,571 Q 879,583 887,593 "
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {/* Digester 4 Steam Valve Flow */}
            {parseFloat(lv('tc4', 'CV', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 1377,480 L 1375,562 Q 1375,575 1382,587 L 1388,598"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs2', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 501,675 L 504,855 Q 504,880 479,880 L -342,879"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs1', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 4,675 L 3,877"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs4', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 1500,671 L 1500,712"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs4', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 1498,760 L 1500,854 Q 1501,879 1476,879 L 1001,878"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs3', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 1003,675 L 1003,717"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs3', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 1003,767 L 1003,857 Q 1003,882 978,882 L 500,879"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs2', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 500,670 L 500,707"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}
            {parseFloat(lv('prs2', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 502,772 L 501,856 Q 501,881 476,881 L 3,880"
                    isRunning={true}
                    color="#f59e0b"
                    thickness={8}
                />
            )}

            {parseFloat(lv('prs1', 'AMP', '0')) > 0 && (
                <LiquidFlowSVG
                    d="M 3,766 L 3,856 Q 3,881 -22,881 L -343,880"
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
