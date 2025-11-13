// src/helpers/Aircraft.js

import * as Cesium from 'cesium';
import { Physics } from './Physics';

const _orientationFixResult = new Cesium.Quaternion();

export class Aircraft {
    constructor(viewer, config, initialPosition, initialHeading = 0, initialOrientation = null) {
        this.viewer = viewer;
        this.config = config;

        const initOrientation = initialOrientation
        ? Cesium.Quaternion.clone(initialOrientation)
        : Cesium.Transforms.headingPitchRollQuaternion(
            initialPosition,
            new Cesium.HeadingPitchRoll(initialHeading, 0, 0)
            );

        this.state = {
        position: initialPosition,
        velocity: new Cesium.Cartesian3(0, 0, 0),
        orientation: initOrientation,
        heading: initialHeading,
        pitch: 0,
        roll: 0,
        speed: 50,
        throttle: 0.5,
        status: { isStalled: false, isSupersonic: false, crashed: false },
        };

        this.entity = this._createEntity();
    }

    _createEntity() {
        return this.viewer.entities.add({
            position: new Cesium.CallbackProperty(() => this.state.position, false),
            
            orientation: new Cesium.CallbackProperty(() => {
                if (this.config.orientationFix) {
                    return Cesium.Quaternion.multiply(
                        this.state.orientation, 
                        this.config.orientationFix, 
                        _orientationFixResult
                    );
                }
                return this.state.orientation;
            }, false),

            model: {
                uri: this.config.uri,
                scale: this.config.scale,
                minimumPixelSize: this.config.minimumPixelSize,
                // 使用展开运算符(...)将modelOptions中的所有属性应用到这里
                ...this.config.modelOptions 
            }
        });
    }

    // 添加 terrainHeight 参数
    update(controls, deltaTime, terrainHeight) {
        if (this.state.status.crashed) return;
        
        // 将 terrainHeight 传递给 Physics.update
        const newState = Physics.update(this.state, controls, this.config.physics, deltaTime, terrainHeight);
        this.state = newState;
    }

    destroy() {
        if (this.entity) {
            this.viewer.entities.remove(this.entity);
            this.entity = null;
        }
    }
}