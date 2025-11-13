// src/config/aircraftConfig.js

import * as Cesium from 'cesium';

const DEFAULT_ICON = 'assets/plane.png';

export const AIRCRAFT = {
    CESIUM_AIR: {
        id: 'CESIUM_AIR',
        name: 'Cesium Air (通用)',
        uri: 'assets/Cesium_Air.glb',
        iconUrl: DEFAULT_ICON,
        scale: 1.0,
        physics: {
            maxSpeed: 300, // m/s (约 1080 km/h)
            pitchRate: 1.5, // 俯仰速率
            rollRate: 3.0,  // 滚转速率
            yawRate: 1.0,   // 偏航速率
            stallSpeed: 40, // 失速速度 m/s
        },
    },
    F22: {
        id: 'F-22 Raptor',
        name: 'F-22 Raptor (战斗机)',
        uri: 'assets/f22.glb',
        iconUrl: DEFAULT_ICON,
        scale: 10.0,
        physics: {
            maxSpeed: 650,
            pitchRate: 9.0,
            rollRate: 25.0,
            yawRate: 5.0,
            stallSpeed: 80,
        },
    },
    TIE: {
        id: 'TIE',
        name: 'TIE Fighter (星际战斗机)',
        uri: 'assets/tie.glb',
        iconUrl: DEFAULT_ICON,
        scale: 1.0,
        modelOptions: {
            silhouetteColor : Cesium.Color.WHITE,
            silhouetteSize : 0,
            colorBlendMode:Cesium.ColorBlendMode.MIX,
            colorBlendAmount: 0.1
        },
        physics: {
            maxSpeed: 999,
            pitchRate: 20.0,
            rollRate: 50.0,
            yawRate: 12.0,
            stallSpeed: 75,
        },
    },
};

export const AIRCRAFT_LIST = Object.values(AIRCRAFT);
