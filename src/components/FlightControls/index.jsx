// src/components/FlightControls/index.jsx

import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { CoordinateConverter } from '../../helpers/CoordinateConverter';

const FlightControls = ({ flightData, isAutoFlying, isAutoFlightPaused }) => {
    if (!flightData) return null;

    const { speed, position, heading, pitch, roll, status } = flightData;
    const cartographic = position ? Cesium.Cartographic.fromCartesian(position) : null;
    const altitude = cartographic ? Math.round(cartographic.height) : 0;
    
    // 将Cesium heading（东方0度）转换为航空方位角（北方0度）
    const headingDeg = CoordinateConverter.cesiumHeadingToBearing(
        Cesium.Math.toDegrees(heading)
    );

    const [crashTextColor, setCrashTextColor] = useState('orange');

    useEffect(() => {
        if (status?.isCrashed) {
            const interval = setInterval(() => {
                setCrashTextColor(prev => prev === 'orange' ? 'purple' : 'orange');
            }, 500);

            return () => clearInterval(interval);
        }
    }, [status?.isCrashed]);

    
    return (
        <div style={containerStyle}>
            <h3 style={headerStyle}>飞行数据</h3>
            
            <div style={{ display: 'grid', gap: '10px' }}>
                <DataRow label="速度" value={`${Math.round(speed * 3.6)} km/h`} />
                <DataRow label="经度" value={`${(Cesium.Math.toDegrees(cartographic.longitude)).toFixed(6)}°`} />
                <DataRow label="纬度" value={`${(Cesium.Math.toDegrees(cartographic.latitude)).toFixed(6)}°`} />
                <DataRow label="高度" value={`${altitude} m`} />
                <DataRow label="航向" value={`${Math.round(headingDeg)}°`} />
                <DataRow label="俯仰" value={`${Math.round(Cesium.Math.toDegrees(pitch))}°`} />
                <DataRow label="翻滚" value={`${Math.round(Cesium.Math.toDegrees(roll))}°`} />
            </div>

            {(status && (status.isStalled || status.isSupersonic || status.isCrashed) || isAutoFlying) &&
                <div style={statusContainerStyle}>
                    {isAutoFlying && !isAutoFlightPaused && <div style={{ color: 'cyan', fontWeight: 'bold' }}>自动驾驶已启动</div>}
                    {isAutoFlying && isAutoFlightPaused && <div style={{ color: 'yellow', fontWeight: 'bold' }}>自动驾驶已暂停 (手动控制)</div>}
                    {status.isCrashed && <div style={{ color: crashTextColor, fontWeight: 'bold' }}>MAN! WHAT CAN I SAY?</div>}
                    {status.isStalled && <div style={{ color: 'red', fontWeight: 'bold' }}>失速警告!</div>}
                    {status.isSupersonic && <div style={{ color: 'cyan', fontWeight: 'bold' }}>音爆!</div>}
                </div>
            }
            
            {(!isAutoFlying || isAutoFlightPaused) && (
                <div style={controlsInfoStyle}>
                    <div><strong>控制说明:</strong></div>
                    <div>W/S: 俯冲/抬升 | A/D: 左滚/右滚</div>
                    <div>Q/E: 左转/右转 | Shift/Ctrl: 加速/减速</div>
                </div>
            )}
        </div>
    );
};

const containerStyle = {
    position: 'absolute', top: '20px', left: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#00ff00',
    padding: '20px', borderRadius: '10px', fontFamily: 'monospace',
    fontSize: '14px', zIndex: 1000, minWidth: '250px'
};
const headerStyle = {
    margin: '0 0 15px 0', color: '#00ff00',
    borderBottom: '2px solid #00ff00', paddingBottom: '10px'
};
const statusContainerStyle = {
    marginTop: '15px', paddingTop: '10px',
    borderTop: '1px dashed #555'
};
const controlsInfoStyle = {
    marginTop: '20px', paddingTop: '15px',
    borderTop: '1px solid #00ff00', fontSize: '12px', color: '#88ff88'
};

const DataRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#88ff88' }}>{label}:</span>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{value}</span>
    </div>
);


export default FlightControls;