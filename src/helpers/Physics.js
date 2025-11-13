// src/helpers/Physics.js


/* 
    这个飞行物理实际上并不怎么样
    只是一个非常简化的模型，用于演示目的
    后续有待优化
*/


import * as Cesium from 'cesium';

const GRAVITY = 9.8; // m/s^2
const MACH_1_SPEED = 343; // 一倍音速 m/s

// 定义一个安全高度阈值，表示飞机模型底部到中心的距离，避免机腹“触地”
const CRASH_ALTITUDE_THRESHOLD = 2.0; // 2米

export class Physics {
    
    /**
     * 更新飞行器状态
     * @param {object} aircraftState - 当前飞行器状态
     * @param {object} controls - 当前控制输入
     * @param {object} physicsParams - 飞行器的物理参数
     * @param {number} deltaTime - 时间增量 (秒)
     * @param {number} terrainHeight - 飞机正下方的地形高度
     * @returns {object} - 更新后的飞行器状态
     */
    static update(aircraftState, controls, physicsParams, deltaTime, terrainHeight) {
        // 解构当前状态
        let { position, orientation, speed, throttle, status } = aircraftState;
        const { maxSpeed, pitchRate, rollRate, yawRate, stallSpeed } = physicsParams;

        // 1. 更新油门和速度
        throttle = Math.max(0, Math.min(1, throttle + controls.throttle * deltaTime * 0.5));
        const targetSpeed = throttle * maxSpeed;
        speed += (targetSpeed - speed) * deltaTime * 0.8;

        // 角速度 -> 增量角
        const pitchAngle = Cesium.Math.toRadians(controls.pitch * pitchRate) * deltaTime;
        const rollAngle  = Cesium.Math.toRadians(controls.roll  * rollRate)  * deltaTime;
        const yawAngle   = Cesium.Math.toRadians(controls.yaw   * yawRate)   * deltaTime;

        // 按“机体坐标系”增量旋转：保持 pitch 为负号（W 抬头）
        // 去掉 roll/yaw 的负号以符合 A 左滚 / D 右滚、Q 左转 / E 右转的直觉
        const deltaPitch = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Y, pitchAngle);
        const deltaRoll  = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_X,  rollAngle);
        const deltaYaw   = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, -yawAngle);

        // 合并增量（yaw -> pitch -> roll）
        let deltaRotation = new Cesium.Quaternion();
        Cesium.Quaternion.multiply(deltaYaw, deltaPitch, deltaRotation);
        Cesium.Quaternion.multiply(deltaRotation, deltaRoll, deltaRotation);

        // 将增量应用到现有姿态（右乘 = 机体坐标系旋转）
        Cesium.Quaternion.multiply(orientation, deltaRotation, orientation);
        Cesium.Quaternion.normalize(orientation, orientation);


        // 4. 从新的姿态四元数中获取机体坐标系向量
        const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation);
        const forward = Cesium.Matrix3.getColumn(rotationMatrix, 0, new Cesium.Cartesian3());
        const right = Cesium.Matrix3.getColumn(rotationMatrix, 1, new Cesium.Cartesian3());
        const up = Cesium.Matrix3.getColumn(rotationMatrix, 2, new Cesium.Cartesian3());

        // 5. 简化的升力和重力模型
        // 世界坐标系的上方向 (用于计算重力)
        const worldUp = Cesium.Cartesian3.normalize(position, new Cesium.Cartesian3());

        const upDot = Math.max(0, Cesium.Cartesian3.dot(up, worldUp)); // 机体“上”与世界“上”的对齐程度
        const liftFactor = Math.min(1, Math.pow(speed / stallSpeed, 2)); // 升力不超过重力
        const liftMagnitude = GRAVITY * liftFactor * upDot;

        const liftForce = Cesium.Cartesian3.multiplyByScalar(up, liftMagnitude, new Cesium.Cartesian3());
        const gravityForce = Cesium.Cartesian3.multiplyByScalar(worldUp, -GRAVITY, new Cesium.Cartesian3());


        // 6. 计算最终速度向量并更新位置
        const thrustForce = Cesium.Cartesian3.multiplyByScalar(forward, speed, new Cesium.Cartesian3());
        
        // 将所有力/速度合成
        let velocity = new Cesium.Cartesian3();
        Cesium.Cartesian3.add(thrustForce, liftForce, velocity);
        Cesium.Cartesian3.add(velocity, gravityForce, velocity);
        
        const movement = Cesium.Cartesian3.multiplyByScalar(velocity, deltaTime, new Cesium.Cartesian3());
        position = Cesium.Cartesian3.add(position, movement, new Cesium.Cartesian3());
        
        // 7. 基于地形的碰撞检测
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const altitudeAboveGround = cartographic.height - terrainHeight;

        let hasCrashed = false;
        if (altitudeAboveGround < CRASH_ALTITUDE_THRESHOLD) {
            hasCrashed = true;
            // 坠毁后，将飞机位置固定在地形表面上
            cartographic.height = terrainHeight + CRASH_ALTITUDE_THRESHOLD;
            position = Cesium.Cartographic.toCartesian(cartographic);
            speed *= 0.8; // 碰撞后减速
        }
        
        // 8. 更新状态 (音障等)
        status.isCrashed = hasCrashed;
        status.isStalled = speed < stallSpeed;
        status.isSupersonic = speed > MACH_1_SPEED;

        // 9. 从最终的四元数反向计算出HPR，仅用于UI显示
        // 9. 使用当前位置的 ENU 作为参考系计算 HPR（用于 UI）
        const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
        const enuRotation = Cesium.Matrix4.getMatrix3(enuTransform, new Cesium.Matrix3());
        // 正交矩阵的逆 = 转置
        const enuRotationInv = Cesium.Matrix3.transpose(enuRotation, new Cesium.Matrix3());

        const bodyRotation = Cesium.Matrix3.fromQuaternion(orientation);
        const localRotation = Cesium.Matrix3.multiply(enuRotationInv, bodyRotation, new Cesium.Matrix3());
        const localQuat = Cesium.Quaternion.fromRotationMatrix(localRotation);

        const hpr = Cesium.HeadingPitchRoll.fromQuaternion(localQuat);

        
        // 返回包含全新姿态四元数的新状态对象
        return {
            position,
            velocity,
            orientation,
            heading: hpr.heading,
            pitch: hpr.pitch,
            roll: hpr.roll,
            speed,
            throttle,
            status,
        };
    }
}