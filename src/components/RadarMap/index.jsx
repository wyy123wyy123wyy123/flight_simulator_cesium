// components/RadarMap/index.jsx

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

import { CoordinateConverter } from '../../helpers/CoordinateConverter';

const RadarMap = ({ position, heading, terrainData, landmarks, waypoints }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !position) return;

        const ctx = canvas.getContext('2d');
        const size = 200;
        const centerX = size / 2;
        const centerY = size / 2;
        const mapRadius = size / 2 - 20;
        const maxDisplayDistance = 50000;

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(0, 20, 0, 0.9)';
        ctx.fillRect(0, 0, size, size);

        // 绘制雷达圈和十字线
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (mapRadius / 3) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(centerX, centerY - mapRadius);
        ctx.lineTo(centerX, centerY + mapRadius);
        ctx.moveTo(centerX - mapRadius, centerY);
        ctx.lineTo(centerX + mapRadius, centerY);
        ctx.stroke();

        // 绘制方向标记
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 将Cesium heading转换为航空bearing用于显示
        const aircraftBearing = CoordinateConverter.cesiumHeadingToBearing(
            Cesium.Math.toDegrees(heading)
        );
        
        const directions = [
            { label: 'N', angle: 0 }, 
            { label: 'E', angle: 90 }, 
            { label: 'S', angle: 180 }, 
            { label: 'W', angle: 270 }
        ];
        
        directions.forEach(dir => {
            // 相对于飞机航向的角度差
            const relativeAngle = (dir.angle - aircraftBearing + 360) % 360;
            const angleRad = Cesium.Math.toRadians(relativeAngle);
            const x = centerX + Math.sin(angleRad) * (mapRadius + 10);
            const y = centerY - Math.cos(angleRad) * (mapRadius + 10);
            ctx.fillText(dir.label, x, y);
        });

        const cartographic = Cesium.Cartographic.fromCartesian(position);

        // 绘制航点
        if (waypoints && waypoints.length > 0) {
            const waypointScreenCoords = waypoints.map(wp => {
                const distance = Cesium.Cartesian3.distance(position, wp.position);
                if (distance >= maxDisplayDistance) return null;

                // 计算航空方位角
                const bearing = CoordinateConverter.calculateBearing(
                    Cesium.Math.toDegrees(cartographic.longitude),
                    Cesium.Math.toDegrees(cartographic.latitude),
                    wp.longitude,
                    wp.latitude
                );
                
                // 计算相对方位角（目标方位 - 飞机航向）
                const relativeBearing = (bearing - aircraftBearing + 360) % 360;
                const relativeBearingRad = Cesium.Math.toRadians(relativeBearing);
                const displayDistance = (distance / maxDisplayDistance) * mapRadius;
                
                return {
                    x: centerX + Math.sin(relativeBearingRad) * displayDistance,
                    y: centerY - Math.cos(relativeBearingRad) * displayDistance,
                    waypoint: wp
                };
            });

            // 绘制路径和航点标记
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            let firstPoint = true;
            waypointScreenCoords.forEach(coord => {
                if (coord) {
                    if (firstPoint) {
                        ctx.moveTo(coord.x, coord.y);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(coord.x, coord.y);
                    }
                }
            });
            ctx.stroke();
            ctx.setLineDash([]);

            waypointScreenCoords.forEach((coord, index) => {
                if (coord) {
                    const { x, y, waypoint } = coord;
                    ctx.fillStyle = waypoint.reached ? '#00ff00' : '#ffff00';
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.fillRect(x - 3, y - 3, 6, 6);
                    ctx.strokeRect(x - 3, y - 3, 6, 6);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText((index + 1).toString(), x, y - 5);
                }
            });
        }

        // 绘制地标
        if (landmarks && landmarks.length > 0) {
            landmarks.forEach(landmark => {
                const lmCartographic = Cesium.Cartographic.fromDegrees(landmark.longitude, landmark.latitude);
                const distance = Cesium.Cartesian3.distance(
                    position, 
                    Cesium.Cartesian3.fromRadians(lmCartographic.longitude, lmCartographic.latitude, cartographic.height)
                );
                
                if (distance < maxDisplayDistance) {
                    const bearing = CoordinateConverter.calculateBearing(
                        Cesium.Math.toDegrees(cartographic.longitude), 
                        Cesium.Math.toDegrees(cartographic.latitude), 
                        landmark.longitude, 
                        landmark.latitude
                    );
                    
                    const relativeBearing = (bearing - aircraftBearing + 360) % 360;
                    const relativeBearingRad = Cesium.Math.toRadians(relativeBearing);
                    const displayDistance = (distance / maxDisplayDistance) * mapRadius;
                    const x = centerX + Math.sin(relativeBearingRad) * displayDistance;
                    const y = centerY - Math.cos(relativeBearingRad) * displayDistance;
                    
                    ctx.fillStyle = landmark.color || '#ffff00';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = landmark.color || '#ffff00';
                    ctx.font = '10px monospace';
                    ctx.fillText(landmark.name, x + 8, y);
                }
            });
        }

        // 绘制飞机图标、扫描线、边框
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, -10); 
        ctx.lineTo(-6, 8); 
        ctx.lineTo(6, 8);
        ctx.closePath(); 
        ctx.fill();
        ctx.restore();

        const time = Date.now() % 2000;
        const scanAngle = (time / 2000) * Math.PI * 2;
        const gradient = ctx.createLinearGradient(
            centerX, centerY, 
            centerX + Math.cos(scanAngle) * mapRadius, 
            centerY + Math.sin(scanAngle) * mapRadius
        );
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(scanAngle) * mapRadius, 
            centerY + Math.sin(scanAngle) * mapRadius
        );
        ctx.stroke();

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size - 2, size - 2);

    }, [position, heading, terrainData, landmarks, waypoints]);

    return (
        <div style={containerStyle}>
            <div style={labelStyle}>雷达/小地图</div>
            <canvas 
                ref={canvasRef} 
                width={200} 
                height={200}
                style={canvasStyle}
            />
            <div style={scaleStyle}>
                <div>距离刻度</div>
                <div>外圈: ~50km</div>
            </div>
        </div>
    );
};

const containerStyle = { backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '10px', borderRadius: '10px', border: '2px solid #00ff00' };
const labelStyle = { color: '#00ff00', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' };
const canvasStyle = { display: 'block', border: '1px solid #00ff00', borderRadius: '5px' };
const scaleStyle = { marginTop: '5px', color: '#00ff00', fontFamily: 'monospace', fontSize: '10px', textAlign: 'center' };

export default RadarMap;