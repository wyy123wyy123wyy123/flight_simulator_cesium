// components/AttitudeIndicator/index.jsx

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

const AttitudeIndicator = ({ pitch, roll }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = 200;
        const centerX = size / 2;
        const centerY = size / 2;

        // 清空画布
        ctx.clearRect(0, 0, size, size);

        // 保存当前状态
        ctx.save();

        // 移动到中心并应用滚转角
        ctx.translate(centerX, centerY);
        ctx.rotate(-roll); // 负号因为canvas坐标系

        // 绘制天空和地面
        const pitchPixels = (Cesium.Math.toDegrees(pitch) / 90) * (size / 2);
        
        // 天空
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(-size, -size, size * 2, size + pitchPixels);
        
        // 地面
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-size, pitchPixels, size * 2, size * 2);

        // 绘制地平线
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size, pitchPixels);
        ctx.lineTo(size, pitchPixels);
        ctx.stroke();

        // 绘制俯仰刻度线
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        for (let angle = -90; angle <= 90; angle += 10) {
            if (angle === 0) continue;
            const y = pitchPixels - (angle / 90) * (size / 2);
            
            if (Math.abs(y) < size) {
                const lineLength = angle % 30 === 0 ? 40 : 20;
                ctx.beginPath();
                ctx.moveTo(-lineLength / 2, y);
                ctx.lineTo(lineLength / 2, y);
                ctx.stroke();

                if (angle % 30 === 0) {
                    const label = angle > 0 ? `${angle}` : `${-angle}`;
                    const labelX = lineLength / 2;
                    ctx.fillText(label, labelX, y);
                }
            }
        }

        // 恢复状态
        ctx.restore();

        // 绘制飞机标志（固定在中心）
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // 中心点
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        // 左翼
        ctx.moveTo(centerX - 60, centerY);
        ctx.lineTo(centerX - 10, centerY);
        // 右翼
        ctx.moveTo(centerX + 10, centerY);
        ctx.lineTo(centerX + 60, centerY);
        // 中心横线
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.stroke();

        // 绘制外框
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // 绘制滚转刻度
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // 外圈刻度
        const radius = size / 2 - 15;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        for (let angle = 0; angle < 360; angle += 30) {
            const rad = Cesium.Math.toRadians(angle);
            const x1 = Math.cos(rad - Math.PI / 2) * radius;
            const y1 = Math.sin(rad - Math.PI / 2) * radius;
            const length = angle % 90 === 0 ? 10 : 5;
            const x2 = Math.cos(rad - Math.PI / 2) * (radius - length);
            const y2 = Math.sin(rad - Math.PI / 2) * (radius - length);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // 滚转指示三角形
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.rotate(-roll);
        ctx.beginPath();
        ctx.moveTo(0, -radius + 5);
        ctx.lineTo(-8, -radius + 15);
        ctx.lineTo(8, -radius + 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();

    }, [pitch, roll]);

    return (
        <div style={containerStyle}>
            <div style={labelStyle}>人工地平仪</div>
            <canvas 
                ref={canvasRef} 
                width={200} 
                height={200}
                style={canvasStyle}
            />
            <div style={infoStyle}>
                <div>俯仰: {Math.round(Cesium.Math.toDegrees(pitch))}°</div>
                <div>滚转: {Math.round(Cesium.Math.toDegrees(roll))}°</div>
            </div>
        </div>
    );
};

const containerStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '10px',
    borderRadius: '10px',
    border: '2px solid #00ff00',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
};

const labelStyle = {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '5px',
    textAlign: 'center',
};

const canvasStyle = {
    display: 'block',
    border: '1px solid #00ff00',
    borderRadius: '5px',
};

const infoStyle = {
    marginTop: '5px',
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: '12px',
    textAlign: 'center',
};

export default AttitudeIndicator;