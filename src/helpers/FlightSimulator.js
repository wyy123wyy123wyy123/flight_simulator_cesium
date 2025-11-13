// helpers/FlightSimulator.js

import * as Cesium from 'cesium';
import { InputController } from './InputController';
import { Aircraft } from './Aircraft';
import { CameraController } from './CameraController';
import { AudioManager } from './AudioManager';

class EventEmitter {
    constructor() { this.events = {}; }
    on(event, listener) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
    }
    emit(event, payload) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(payload));
        }
    }
}

export class FlightSimulator extends EventEmitter {
    constructor(viewer, waypointManager = null) {
        super();
        this.viewer = viewer;
        this.isRunning = false;
        this.viewMode = 'FLIGHT';
        this.audioUnlocked = false;

        this.inputController = new InputController();
        this.cameraController = new CameraController(viewer);
        this.audioManager = new AudioManager();
        this.waypointManager = waypointManager;
        
        this.currentAircraft = null;
        this.aircraftIcon = null;
        this._lastTime = null;
        this._updateLoop = this._updateLoop.bind(this);

        this.terrainProvider = viewer.terrainProvider; // 存储地形提供者以便重用

        this._loadAudioFiles();
    }

    /**
     * 为一组 Cartographic 坐标查询并更新其地形高度
     * @param {Cesium.Cartographic[]} cartographics - 待查询的坐标数组
     * @returns {Promise<Cesium.Cartographic[]>} - 返回带有精确地形高度的坐标数组
     */
    async getUpdatedCartographicsWithTerrainHeight(cartographics) {
        if (!this.terrainProvider || !Cesium.defined(this.terrainProvider.availability)) {
            console.warn("Terrain provider not available.");
            return cartographics;
        }
        try {
            return await Cesium.sampleTerrainMostDetailed(this.terrainProvider, cartographics);
        } catch (error) {
            console.error("Error sampling terrain height:", error);
            return cartographics;
        }
    }

    async _loadAudioFiles() {
        try {
            await this.audioManager.loadSound('engine', 'assets/engine.wav');
            await this.audioManager.loadSound('sonic-boom', 'assets/warning.wav');
            await this.audioManager.loadSound('stall-warning', 'assets/warning.wav');
            await this.audioManager.loadSound('crash', 'assets/man.wav');


            console.log('Audio files loaded successfully');
            
            this.emit('audioLoaded');
        } catch (error) {
            console.warn('Failed to load some audio files:', error);
        }
    }

    setViewMode(mode) {
        if (this.viewMode === mode) return;
        this.viewMode = mode;
        if (mode === 'GLOBAL') {
            this.currentAircraft.entity.show = false;
            this.aircraftIcon.show = true;
            this.cameraController.animateToGlobalView();
        } else {
            this.currentAircraft.entity.show = true;
            this.aircraftIcon.show = false;
            this.cameraController.exitGlobalView();
        }
    }

    async relocateAircraft(groundPosition) {
        if (!this.currentAircraft) return;

        const cartographic = Cesium.Cartographic.fromCartesian(groundPosition);
        
        const [updatedCartographic] = await this.getUpdatedCartographicsWithTerrainHeight([cartographic]);
        
        // 设置高度为地形上方1500米
        updatedCartographic.height += 1500;
        const newPosition = Cesium.Cartographic.toCartesian(updatedCartographic);

        this.currentAircraft.state.position = newPosition;
        const hpr = new Cesium.HeadingPitchRoll(this.currentAircraft.state.heading, 0, 0);
        this.currentAircraft.state.orientation = Cesium.Transforms.headingPitchRollQuaternion(newPosition, hpr);
        this.currentAircraft.state.speed = 150;
        this.currentAircraft.state.velocity = new Cesium.Cartesian3(0, 0, 0);
        this.setViewMode('FLIGHT');
    }

    loadAircraft(aircraftConfig, position, heading, orientation) {
        if (this.currentAircraft) {
            this.currentAircraft.destroy();
        }
        if (this.aircraftIcon) {
            this.viewer.entities.remove(this.aircraftIcon);
            this.aircraftIcon = null;
        }
        this.currentAircraft = new Aircraft(this.viewer, aircraftConfig, position, heading, orientation);
        this.cameraController.setTarget(this.currentAircraft);

        this.aircraftIcon = this.viewer.entities.add({
            position: new Cesium.CallbackProperty(() => {
                if (this.currentAircraft) {
                    return this.currentAircraft.state.position;
                }
            }, false),
            billboard: {
                image: aircraftConfig.iconUrl,
                width: 48,
                height: 48,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                color: Cesium.Color.WHITE.withAlpha(1.0)
            },
            show: (this.viewMode === 'GLOBAL')
        });

        this.currentAircraft.entity.show = (this.viewMode !== 'GLOBAL');
    }

    async unlockAudio() {
        if (this.audioUnlocked) return;
        const success = await this.audioManager.unlock();
        if (success) {
            this.audioUnlocked = true;
            this.emit('audioUnlocked');
        }
    }

    start() {
        if (this.isRunning) return;
        this.viewer.scene.preUpdate.addEventListener(this._updateLoop);
        this.isRunning = true;
        
        if (this.audioUnlocked) {
            this.audioManager.play('engine', { loop: true, volume: 1.0 });
        }
    }

    stop() {
        if (!this.isRunning) return;
        this.viewer.scene.preUpdate.removeEventListener(this._updateLoop);
        this.isRunning = false;
        
        this.audioManager.stopAll();
    }

    async _updateLoop() {
        const deltaTime = this.viewer.clock.multiplier / 60.0;
        if (!this.currentAircraft) return;

        // 0. 获取地形高度
        const aircraftCartographic = Cesium.Cartographic.fromCartesian(this.currentAircraft.state.position);
        const [updatedAircraftCartographic] = await this.getUpdatedCartographicsWithTerrainHeight([aircraftCartographic]);
        const terrainHeight = updatedAircraftCartographic?.height ?? 0;
        
        const prevStatus = { ...this.currentAircraft.state.status };

        // 1. 更新飞机物理，传入地形高度
        this.currentAircraft.update(this.inputController.controls, deltaTime, terrainHeight);

        // 1.5. 更新航点导航
        let navData = null;
        if (this.waypointManager && this.waypointManager.isNavigating) {
            navData = this.waypointManager.update(this.currentAircraft.state.position);
        }
        
        const currentStatus = this.currentAircraft.state.status;
        const { speed } = this.currentAircraft.state;
        const { maxSpeed, stallSpeed } = this.currentAircraft.config.physics;

        // 2. 更新音效
        this._updateAudio(prevStatus, currentStatus, speed, maxSpeed, stallSpeed);

        // 3. 更新相机 (仅在飞行模式下)
        if (this.viewMode === 'FLIGHT') {
            this.cameraController.update();
        }

        // 4. 发射数据更新事件
        this.emit('flightDataUpdate', {
            ...this.currentAircraft.state,
            navigationData: navData,
        });
    }

    _updateAudio(prevStatus, currentStatus, speed, maxSpeed, stallSpeed) {
        if (currentStatus.isCrashed && !prevStatus.isCrashed) {
            this.audioManager.stopAll();
            this.audioManager.playOneShot('crash', { volume: 1.0 });
            return;
        }

        if (!currentStatus.isCrashed && prevStatus.isCrashed) {
            if (this.audioUnlocked) {
                this.audioManager.play('engine', { loop: true, volume: 1.0 });
            }
        }

        if (currentStatus.isCrashed) return;

        if (this.audioUnlocked) {
            this.audioManager.updateEngineSound(speed, maxSpeed, stallSpeed);
        }

        if (currentStatus.isStalled && !prevStatus.isStalled) {
            this.audioManager.play('stall-warning', { loop: true, volume: 0.3 });
        } else if (!currentStatus.isStalled && prevStatus.isStalled) {
            this.audioManager.stop('stall-warning');
        }

        if (currentStatus.isSupersonic && !prevStatus.isSupersonic) {
            this.audioManager.playOneShot('sonic-boom', { volume: 0.3 });
        }
    }

    destroy() {
        this.stop();
        this.inputController.destroy();
        this.cameraController.destroy();
        this.audioManager.destroy();
        if (this.currentAircraft) {
            this.currentAircraft.destroy();
        }
        if (this.aircraftIcon) {
            this.viewer.entities.remove(this.aircraftIcon);
            this.aircraftIcon = null;
        }
    }
}