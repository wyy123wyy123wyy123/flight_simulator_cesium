// helpers/WaypointManager.js

import * as Cesium from 'cesium';
import { CoordinateConverter } from './CoordinateConverter';

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
    off(event, listener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }
}

export class WaypointManager extends EventEmitter {
    constructor(viewer) {
        super();
        this.viewer = viewer;
        this.terrainProvider = viewer.terrainProvider; // 存储地形提供者
        this.waypoints = [];
        this.currentWaypointIndex = 0;
        this.waypointEntities = [];
        this.pathEntity = null;
        this.completionRadius = 500;
        this.isNavigating = false;
        
        this.aircraftToFirstWaypointPathEntity = null;
        this.lastAircraftPosition = null;
    }

    async _getTerrainHeightForPosition(longitude, latitude) {
        if (!this.terrainProvider || !Cesium.defined(this.terrainProvider.availability)) {
            return 0; // 若无地形服务则返回0
        }
        const cartographicPosition = Cesium.Cartographic.fromDegrees(longitude, latitude, 0);
        try {
            const updatedPositions = await Cesium.sampleTerrainMostDetailed(this.terrainProvider, [cartographicPosition]);
            return updatedPositions[0]?.height ?? 0;
        } catch (error) {
            console.error("Error sampling waypoint terrain height:", error);
            return 0;
        }
    }

    async addWaypoint(longitude, latitude, aglAltitude, name) {
        const terrainHeight = await this._getTerrainHeightForPosition(longitude, latitude);
        const absoluteAltitude = terrainHeight + aglAltitude;

        const waypoint = {
            id: `waypoint_${Date.now()}_${Math.random()}`,
            name: name || `航点 ${this.waypoints.length + 1}`,
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude, absoluteAltitude),
            longitude,
            latitude,
            altitude: absoluteAltitude, // 存储绝对高度
            reached: false,
            reachedTime: null
        };

        this.waypoints.push(waypoint);
        this._createWaypointEntity(waypoint);
        this._updatePathLine();
        
        this.emit('waypointAdded', waypoint);
        return waypoint;
    }

    async addWaypointFromLandmark(landmark, altitude = 1000) {
        // 此处的 'altitude' 被视为对地高度 (AGL)
        return await this.addWaypoint(
            landmark.longitude,
            landmark.latitude,
            altitude,
            landmark.name
        );
    }

    _createWaypointEntity(waypoint) {
        const entity = this.viewer.entities.add({
            id: waypoint.id,
            position: waypoint.position,
            ellipsoid: {
                radii: new Cesium.Cartesian3(this.completionRadius, this.completionRadius, this.completionRadius),
                material: Cesium.Color.YELLOW.withAlpha(0.2),
                outline: true,
                outlineColor: Cesium.Color.YELLOW,
                stackPartitions: 24,
                slicePartitions: 24,
                subdivisions: 64
            },
            label: {
                text: waypoint.name,
                font: '16px monospace',
                fillColor: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -25),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            point: {
                pixelSize: 15,
                color: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
        this.waypointEntities.push(entity);
    }

    _updatePathLine() {
        if (this.pathEntity) {
            this.viewer.entities.remove(this.pathEntity);
            this.pathEntity = null;
        }

        if (this.waypoints.length < 2) return;

        const positions = this.waypoints.map(wp => wp.position);

        this.pathEntity = this.viewer.entities.add({
            show: new Cesium.CallbackProperty(() => this.isNavigating, false),
            polyline: {
                positions: positions,
                width: 5,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.CYAN,
                    dashLength: 10
                }),
                clampToGround: false
            }
        });
    }

    startNavigation() {
        if (this.waypoints.length === 0) {
            console.warn('没有设置航点');
            return false;
        }

        this.isNavigating = true;
        this.currentWaypointIndex = 0;
        
        this.waypoints.forEach(wp => {
            wp.reached = false;
            wp.reachedTime = null;
            const entity = this.viewer.entities.getById(wp.id);
            if (entity) {
                if (entity.ellipsoid) {
                    entity.ellipsoid.material = Cesium.Color.YELLOW.withAlpha(0.2);
                    entity.ellipsoid.outlineColor = Cesium.Color.YELLOW;
                }
                if (entity.label) entity.label.fillColor = Cesium.Color.YELLOW;
            }
        });

        this._createDynamicPathEntities(); 

        this.emit('navigationStarted', {
            totalWaypoints: this.waypoints.length
        });

        return true;
    }

    stopNavigation() {
        this.isNavigating = false;
        this._destroyDynamicPathEntities(); 
        this.emit('navigationStopped');
    }

    _createDynamicPathEntities() {
        this._destroyDynamicPathEntities();

        if (!this.isNavigating) return;

        this.aircraftToFirstWaypointPathEntity = this.viewer.entities.add({
            show: new Cesium.CallbackProperty(() => this.isNavigating, false),
            polyline: {
                positions: new Cesium.CallbackProperty(() => {
                    if (this.isNavigating && this.lastAircraftPosition && this.currentWaypointIndex < this.waypoints.length) {
                        return [this.lastAircraftPosition, this.waypoints[this.currentWaypointIndex].position];
                    }
                    return [];
                }, false),
                width: 5,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.CYAN,
                    dashLength: 10
                }),
                clampToGround: false
            }
        });
    }

    _destroyDynamicPathEntities() {
        if (this.aircraftToFirstWaypointPathEntity) {
            this.viewer.entities.remove(this.aircraftToFirstWaypointPathEntity);
            this.aircraftToFirstWaypointPathEntity = null;
        }
    }

    update(aircraftPosition) {
        this.lastAircraftPosition = aircraftPosition;

        if (!this.isNavigating || this.waypoints.length === 0 || this.currentWaypointIndex >= this.waypoints.length) {
            return null;
        }
        
        const currentWaypoint = this.waypoints[this.currentWaypointIndex];
        const distance = Cesium.Cartesian3.distance(aircraftPosition, currentWaypoint.position);
        
        const aircraftCarto = Cesium.Cartographic.fromCartesian(aircraftPosition);
        const bearing = CoordinateConverter.calculateBearing(
            Cesium.Math.toDegrees(aircraftCarto.longitude),
            Cesium.Math.toDegrees(aircraftCarto.latitude),
            currentWaypoint.longitude,
            currentWaypoint.latitude
        );
        
        const elevationDiff = this._calculateElevationDiff(aircraftPosition, currentWaypoint.position);

        if (distance <= this.completionRadius && !currentWaypoint.reached) {
            currentWaypoint.reached = true;
            currentWaypoint.reachedTime = Date.now();
            
            const entity = this.viewer.entities.getById(currentWaypoint.id);
            if (entity) {
                if (entity.ellipsoid) {
                    entity.ellipsoid.material = Cesium.Color.LIMEGREEN.withAlpha(0.3);
                    entity.ellipsoid.outlineColor = Cesium.Color.LIMEGREEN;
                }
                if (entity.label) entity.label.fillColor = Cesium.Color.LIMEGREEN;
            }

            this.emit('waypointReached', {
                waypoint: currentWaypoint,
                index: this.currentWaypointIndex,
                remaining: this.waypoints.length - this.currentWaypointIndex - 1
            });

            this.currentWaypointIndex++;
            
            if (this.currentWaypointIndex >= this.waypoints.length) {
                this.isNavigating = false;
                this._destroyDynamicPathEntities();
                this.emit('navigationCompleted', { totalTime: this._calculateTotalTime() });
                return null;
            }
        }

        return {
            currentWaypoint: this.waypoints[this.currentWaypointIndex],
            currentIndex: this.currentWaypointIndex,
            totalWaypoints: this.waypoints.length,
            distance,
            bearing,
            elevationDiff,
            eta: this._calculateETA(distance, 200)
        };
    }

    _calculateElevationDiff(from, to) {
        const fromCarto = Cesium.Cartographic.fromCartesian(from);
        const toCarto = Cesium.Cartographic.fromCartesian(to);
        return toCarto.height - fromCarto.height;
    }

    _calculateETA(distance, averageSpeed) {
        return distance / Math.max(averageSpeed, 1);
    }

    _calculateTotalTime() {
        if (this.waypoints.length === 0) return 0;
        const firstReachedWaypoint = this.waypoints.find(wp => wp.reachedTime !== null);
        const lastReachedWaypoint = [...this.waypoints].reverse().find(wp => wp.reachedTime !== null);
        if (!firstReachedWaypoint || !lastReachedWaypoint) return 0;
        return (lastReachedWaypoint.reachedTime - firstReachedWaypoint.reachedTime) / 1000;
    }

    clearWaypoints() {
        this.waypointEntities.forEach(entity => this.viewer.entities.remove(entity));
        if (this.pathEntity) this.viewer.entities.remove(this.pathEntity);
        this._destroyDynamicPathEntities(); 

        this.pathEntity = null;
        this.waypoints = [];
        this.waypointEntities = [];
        this.currentWaypointIndex = 0;
        this.isNavigating = false;

        this.emit('waypointsCleared');
    }

    removeWaypoint(waypointId) {
        const index = this.waypoints.findIndex(wp => wp.id === waypointId);
        if (index === -1) return;
        const waypoint = this.waypoints[index];
        const entity = this.viewer.entities.getById(waypointId);
        if (entity) this.viewer.entities.remove(entity);
        this.waypointEntities = this.waypointEntities.filter(e => e.id !== waypointId);
        this.waypoints.splice(index, 1);
        this._updatePathLine();
        this.emit('waypointRemoved', waypoint);
    }

    getWaypoints() {
        return [...this.waypoints];
    }

    async loadRoute(route) {
        this.clearWaypoints();
        if (route && route.waypoints) {
            for (const wp of route.waypoints) {
                await this.addWaypoint(wp.longitude, wp.latitude, wp.altitude, wp.name);
            }
        }
    }

    destroy() {
        this.clearWaypoints();
    }
}