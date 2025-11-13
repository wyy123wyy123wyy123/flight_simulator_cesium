// src/helpers/CameraController.js

import * as Cesium from 'cesium';

export class CameraController {
    constructor(viewer) {
        this.viewer = viewer;
        this.aircraft = null; 
        
        // FLIGHT 模式相机控制相关
        this.isUserControlling = false;
        this.userCameraOffset = { heading: 0, pitch: 0, distance: 50 };
        this.defaultCameraOffset = { heading: 0, pitch: 0, distance: 10, height: 2 };
        this.resetTimer = null;
        this.resetDelay = 2000; // 2秒无操作后自动回正
        this.isResetting = false;
        this.resetDuration = 1000; // 回正动画时长(毫秒)
        this.resetStartTime = null;
        this.resetStartOffset = null;
        
        // 鼠标拖拽状态
        this.isDragging = false;
        this.lastMousePosition = null;
        
        this._setupFlightModeControls();
        this.exitGlobalView();
    }

    setTarget(aircraftInstance) {
        this.aircraft = aircraftInstance;
    }

    _setupFlightModeControls() {
        // 使用 Cesium 的 ScreenSpaceEventHandler
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        
        // 左键按下
        this.handler.setInputAction((movement) => {
            this.isDragging = true;
            this.lastMousePosition = { 
                x: movement.position.x, 
                y: movement.position.y 
            };
            this.isUserControlling = true;
            this._clearResetTimer();
            this.isResetting = false;
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        
        // 鼠标移动
        this.handler.setInputAction((movement) => {
            if (!this.isDragging || !this.lastMousePosition) return;
            
            const deltaX = movement.endPosition.x - this.lastMousePosition.x;
            const deltaY = movement.endPosition.y - this.lastMousePosition.y;
            
            // 更新相机偏移（增加灵敏度）
            this.userCameraOffset.heading -= deltaX * 0.01;
            this.userCameraOffset.pitch += deltaY * 0.01;
            
            // 限制俯仰角范围
            this.userCameraOffset.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.userCameraOffset.pitch));
            
            this.lastMousePosition = { 
                x: movement.endPosition.x, 
                y: movement.endPosition.y 
            };
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        
        // 左键松开
        this.handler.setInputAction(() => {
            if (this.isDragging) {
                this.isDragging = false;
                this.lastMousePosition = null;
                this._startResetTimer();
            }
        }, Cesium.ScreenSpaceEventType.LEFT_UP);
        
        // 滚轮缩放 - 不触发回正
        this.handler.setInputAction((wheelDelta) => {
            // wheelDelta 是正数表示向上滚，负数表示向下滚
            this.userCameraOffset.distance += wheelDelta * -0.08;
            this.userCameraOffset.distance = Math.max(20, Math.min(200, this.userCameraOffset.distance));
        }, Cesium.ScreenSpaceEventType.WHEEL);
    }

    _startResetTimer() {
        this._clearResetTimer();
        this.resetTimer = setTimeout(() => {
            this._startResetAnimation();
        }, this.resetDelay);
    }

    _clearResetTimer() {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }

    _startResetAnimation() {
        this.isResetting = true;
        this.resetStartTime = Date.now();
        // 只记录 heading 和 pitch，不包括 distance
        this.resetStartOffset = { 
            heading: this.userCameraOffset.heading,
            pitch: this.userCameraOffset.pitch,
            distance: this.userCameraOffset.distance // 保持当前距离不变
        };
    }

    _updateResetAnimation() {
        if (!this.isResetting) return;
        
        const elapsed = Date.now() - this.resetStartTime;
        const progress = Math.min(1, elapsed / this.resetDuration);
        
        // 使用缓动函数（ease-out）
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // 只插值 heading 和 pitch，距离保持不变
        this.userCameraOffset.heading = Cesium.Math.lerp(
            this.resetStartOffset.heading, 
            this.defaultCameraOffset.heading, 
            eased
        );
        this.userCameraOffset.pitch = Cesium.Math.lerp(
            this.resetStartOffset.pitch, 
            this.defaultCameraOffset.pitch, 
            eased
        );
        // distance 不变，保持用户设置的值
        
        if (progress >= 1) {
            this.isResetting = false;
            this.isUserControlling = false;
        }
    }

    animateToGlobalView() {
        if (!this.aircraft) return;

        this.viewer.camera.cancelFlight();

        const currentAircraftPosition = this.aircraft.state.position;
        const directionVector = Cesium.Cartesian3.normalize(currentAircraftPosition, new Cesium.Cartesian3());
        const destinationMagnitude = Cesium.Ellipsoid.WGS84.maximumRadius * 3.0;
        const destination = Cesium.Cartesian3.multiplyByScalar(directionVector, destinationMagnitude, new Cesium.Cartesian3());

        this.viewer.camera.lookDown(Cesium.Math.toRadians(90.0));

        this.viewer.camera.flyTo({
            destination: destination,
            duration: 5.5,
            complete: () => {
                this.enterGlobalView();
            },
        });
    }

    enterGlobalView() {
        this._clearResetTimer();
        this.isResetting = false;
        this.isDragging = false;
        
        // 在全局视图模式下，禁用自定义 handler
        if (this.handler) {
            this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
            this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
            this.handler.removeInputAction(Cesium.ScreenSpaceEventType.WHEEL);
        }
        
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
        this.viewer.scene.screenSpaceCameraController.enableZoom = true;
        this.viewer.scene.screenSpaceCameraController.enableTilt = false;
        this.viewer.scene.screenSpaceCameraController.enableLook = true;
    }

    exitGlobalView() {
        this.viewer.camera.cancelFlight();
        
        // 重置用户相机偏移（但保留用户调整的距离）
        const currentDistance = this.userCameraOffset.distance;
        this.userCameraOffset = { ...this.defaultCameraOffset };
        this.userCameraOffset.distance = currentDistance; // 保留用户设置的距离
        
        this.isUserControlling = false;
        this.isResetting = false;
        this.isDragging = false;
        this._clearResetTimer();
        
        // 重新启用自定义控制
        this._setupFlightModeControls();
        
        this.viewer.scene.screenSpaceCameraController.enableRotate = false;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = false;
        this.viewer.scene.screenSpaceCameraController.enableZoom = false;
        this.viewer.scene.screenSpaceCameraController.enableTilt = false;
        this.viewer.scene.screenSpaceCameraController.enableLook = false;
    }

    update() {
        if (!this.aircraft || !this.aircraft.state) return;
        
        // 更新回正动画
        if (this.isResetting) {
            this._updateResetAnimation();
        }
        
        const { position, orientation } = this.aircraft.state;
        
        // 使用用户控制的偏移量
        const distance = this.userCameraOffset.distance;
        const height = this.defaultCameraOffset.height;
        
        const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation);
        
        // 应用用户的航向和俯仰偏移
        const headingOffset = this.userCameraOffset.heading;
        const pitchOffset = this.userCameraOffset.pitch;
        
        // 基础偏移向量（相机在飞机后方）
        let offset = new Cesium.Cartesian3(-distance, 0, height);
        
        // 应用俯仰偏移（绕Y轴旋转）
        const pitchRotation = Cesium.Matrix3.fromRotationY(pitchOffset);
        Cesium.Matrix3.multiplyByVector(pitchRotation, offset, offset);
        
        // 应用航向偏移（绕Z轴旋转）
        const headingRotation = Cesium.Matrix3.fromRotationZ(headingOffset);
        Cesium.Matrix3.multiplyByVector(headingRotation, offset, offset);
        
        // 应用飞机姿态
        const cameraOffset = Cesium.Matrix3.multiplyByVector(rotationMatrix, offset, new Cesium.Cartesian3());
        const cameraPosition = Cesium.Cartesian3.add(position, cameraOffset, new Cesium.Cartesian3());

        const cameraDirection = Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(position, cameraPosition, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
        );

        const cameraUp = Cesium.Matrix3.getColumn(rotationMatrix, 2, new Cesium.Cartesian3());

        this.viewer.camera.setView({
            destination: cameraPosition,
            orientation: {
                direction: cameraDirection,
                up: cameraUp
            }
        });
    }

    destroy() {
        this._clearResetTimer();
        
        // 清理事件处理器
        if (this.handler) {
            this.handler.destroy();
            this.handler = null;
        }
        
        this.enterGlobalView();
    }
}