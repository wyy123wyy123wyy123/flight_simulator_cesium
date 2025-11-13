// src/helpers/CoordinateConverter.js

import * as Cesium from 'cesium';

/**
 * 坐标系转换工具
 * Cesium使用东方为0度 (East = 0°)
 * 航空导航使用北方为0度 (North = 0°)
 */
export class CoordinateConverter {
    /**
     * 将航空方位角（北方0度）转换为Cesium航向角（东方0度）
     * @param {number} bearing - 航空方位角（度）
     * @returns {number} Cesium航向角（度）
     */
    static bearingToCesiumHeading(bearing) {
        return (bearing + 270 + 360) % 360;
    }

    /**
     * 将Cesium航向角（东方0度）转换为航空方位角（北方0度）
     * @param {number} heading - Cesium航向角（度）
     * @returns {number} 航空方位角（度）
     */
    static cesiumHeadingToBearing(heading) {
        return (heading + 450) % 360;
    }

    /**
     * 计算两点之间的方位角（北方0度，顺时针）
     * @returns {number} 方位角（度）
     */
    static calculateBearing(lon1, lat1, lon2, lat2) {
        const φ1 = Cesium.Math.toRadians(lat1);
        const φ2 = Cesium.Math.toRadians(lat2);
        const Δλ = Cesium.Math.toRadians(lon2 - lon1);
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);
        return (Cesium.Math.toDegrees(θ) + 360) % 360;
    }
}