// components/WaypointNavigation/index.jsx

import { useState } from 'react';
import * as Cesium from 'cesium';

import { CoordinateConverter } from '../../helpers/CoordinateConverter';

const WaypointNavigation = ({ waypointManager, navigationData, flightData }) => {
    const [showPanel, setShowPanel] = useState(true);

    if (!navigationData && !waypointManager) return null;

    const { currentWaypoint, distance, bearing, elevationDiff, eta, currentIndex, totalWaypoints } = navigationData || {};

    // 计算相对航向（目标方位 - 当前航向）
    const getRelativeHeading = () => {
        if (!bearing || !flightData) return 0;
        
        // 将Cesium heading转换为航空bearing
        const aircraftBearing = CoordinateConverter.cesiumHeadingToBearing(
            Cesium.Math.toDegrees(flightData.heading)
        );
        
        // 计算差值
        const diff = bearing - aircraftBearing;
        
        // 归一化到 -180 到 180
        return ((diff + 180) % 360) - 180;
    };

    const relativeHeading = getRelativeHeading();

    return (
        <div style={containerStyle}>
            {showPanel && navigationData && (
                <div style={navPanelStyle}>
                    <div style={headerStyle}>
                        <span>🎯 航点导航</span>
                        <button 
                            style={toggleButtonStyle}
                            onClick={() => setShowPanel(false)}
                        >
                            ─
                        </button>
                    </div>

                    <div style={waypointInfoStyle}>
                        <div style={waypointNameStyle}>
                            {currentWaypoint?.name}
                        </div>
                        <div style={progressStyle}>
                            航点 {currentIndex + 1} / {totalWaypoints}
                        </div>
                    </div>

                    <div style={directionIndicatorContainerStyle}>
                        <DirectionIndicator 
                            relativeHeading={relativeHeading}
                            distance={distance}
                        />
                    </div>

                    <div style={dataGridStyle}>
                        <DataItem 
                            label="距离" 
                            value={`${(distance / 1000).toFixed(2)} km`}
                            color="#00ff00"
                        />
                        <DataItem 
                            label="方位" 
                            value={`${Math.round(bearing)}°`}
                            color="#00ffff"
                        />
                        <DataItem 
                            label="高度差" 
                            value={`${elevationDiff > 0 ? '+' : ''}${Math.round(elevationDiff)} m`}
                            color={elevationDiff > 0 ? '#ffff00' : '#ff8800'}
                        />
                        <DataItem 
                            label="预计" 
                            value={`${Math.round(eta)} 秒`}
                            color="#ff00ff"
                        />
                    </div>

                    {Math.abs(relativeHeading) > 5 && (
                        <div style={turnAdviceStyle}>
                            {relativeHeading > 0 ? '→ 右转' : '← 左转'} {Math.abs(Math.round(relativeHeading))}°
                        </div>
                    )}

                    {Math.abs(elevationDiff) > 100 && (
                        <div style={altitudeAdviceStyle}>
                            {elevationDiff > 0 ? '↑ 爬升' : '↓ 下降'} {Math.abs(Math.round(elevationDiff))} m
                        </div>
                    )}
                </div>
            )}

            {!showPanel && navigationData && (
                <button 
                    style={minimizedButtonStyle}
                    onClick={() => setShowPanel(true)}
                >
                    🎯 导航
                </button>
            )}
        </div>
    );
};

// 方向指示器子组件
const DirectionIndicator = ({ relativeHeading, distance }) => {
    return (
        <div style={indicatorStyle}>
            <svg width="120" height="120">
                {/* 外圈 */}
                <circle 
                    cx="60" 
                    cy="60" 
                    r="55" 
                    fill="none" 
                    stroke="#00ff00" 
                    strokeWidth="2"
                />
                
                {/* 刻度 */}
                {[0, 90, 180, 270].map(angle => {
                    const rad = (angle * Math.PI) / 180;
                    const x1 = 60 + Math.cos(rad) * 50;
                    const y1 = 60 + Math.sin(rad) * 50;
                    const x2 = 60 + Math.cos(rad) * 55;
                    const y2 = 60 + Math.sin(rad) * 55;
                    
                    return (
                        <line 
                            key={angle}
                            x1={x1} 
                            y1={y1} 
                            x2={x2} 
                            y2={y2} 
                            stroke="#00ff00" 
                            strokeWidth="2"
                        />
                    );
                })}

                {/* 飞机符号（始终朝上） */}
                <g transform="translate(60, 60)">
                    <path 
                        d="M 0,-15 L -8,10 L 8,10 Z" 
                        fill="#ff0000" 
                        stroke="#ffffff" 
                        strokeWidth="2"
                    />
                </g>

                {/* 目标箭头 */}
                <g transform={`translate(60, 60) rotate(${relativeHeading})`}>
                    <line 
                        x1="0" 
                        y1="0" 
                        x2="0" 
                        y2="-45" 
                        stroke="#ffff00" 
                        strokeWidth="3"
                        markerEnd="url(#arrowhead)"
                    />
                </g>

                <defs>
                    <marker 
                        id="arrowhead" 
                        markerWidth="10" 
                        markerHeight="10" 
                        refX="5" 
                        refY="3" 
                        orient="auto"
                    >
                        <polygon 
                            points="0 0, 10 3, 0 6" 
                            fill="#ffff00" 
                        />
                    </marker>
                </defs>
            </svg>
            
            <div style={distanceDisplayStyle}>
                {(distance / 1000).toFixed(1)} km
            </div>
        </div>
    );
};

// 数据项子组件
const DataItem = ({ label, value, color }) => (
    <div style={dataItemStyle}>
        <div style={{ color: '#888', fontSize: '11px' }}>{label}</div>
        <div style={{ color, fontSize: '16px', fontWeight: 'bold' }}>{value}</div>
    </div>
);

const containerStyle = {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
};

const navPanelStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid #00ff00',
    borderRadius: '10px',
    padding: '15px',
    minWidth: '320px',
    fontFamily: 'monospace',
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#00ff00',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #00ff00',
};

const toggleButtonStyle = {
    background: 'none',
    border: '1px solid #00ff00',
    color: '#00ff00',
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '14px',
};

const waypointInfoStyle = {
    marginBottom: '15px',
    textAlign: 'center',
};

const waypointNameStyle = {
    color: '#ffff00',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '5px',
};

const progressStyle = {
    color: '#00ffff',
    fontSize: '12px',
};

const directionIndicatorContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '15px',
};

const indicatorStyle = {
    position: 'relative',
};

const distanceDisplayStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffff00',
    fontSize: '14px',
    fontWeight: 'bold',
    textShadow: '0 0 5px #000',
};

const dataGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '10px',
};

const dataItemStyle = {
    backgroundColor: 'rgba(0, 50, 0, 0.5)',
    padding: '8px',
    borderRadius: '5px',
    textAlign: 'center',
};

const turnAdviceStyle = {
    backgroundColor: 'rgba(255, 255, 0, 0.2)',
    border: '1px solid #ffff00',
    color: '#ffff00',
    padding: '8px',
    borderRadius: '5px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '10px',
};

const altitudeAdviceStyle = {
    backgroundColor: 'rgba(255, 136, 0, 0.2)',
    border: '1px solid #ff8800',
    color: '#ff8800',
    padding: '8px',
    borderRadius: '5px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '5px',
};

const minimizedButtonStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid #00ff00',
    color: '#00ff00',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
};

export default WaypointNavigation;