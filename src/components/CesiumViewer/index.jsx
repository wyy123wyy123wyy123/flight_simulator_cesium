// components/CesiumViewer/index.jsx

import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useEffect, useRef, useState } from "react";
import { FlightSimulator } from "../../helpers/FlightSimulator";
import { AIRCRAFT_LIST } from "../../config/aircraftConfig";
import { WaypointManager } from "../../helpers/WaypointManager";

import {
    FlightControls,
    AircraftSelector,
    GlobalViewToggle,
    EnterPrompt,
    InstrumentPanel,
    WaypointControl,
    WaypointNavigation,
    LoadingScreen
} from '../index';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

function CesiumViewer() {
    const cesiumContainerRef = useRef(null);
    const simulatorRef = useRef(null);
    const [viewer, setViewer] = useState(null);
    const [flightData, setFlightData] = useState(null);
    const [currentAircraftId, setCurrentAircraftId] = useState(null);
    const [viewMode, setViewMode] = useState('FLIGHT');
    const [showPrompt, setShowPrompt] = useState(true);
    const [audioReady, setAudioReady] = useState(false);

    const [waypointManager, setWaypointManager] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [waypoints, setWaypoints] = useState([]);

    useEffect(() => {
        if (!cesiumContainerRef.current) return;

        let viewer;
        let simulator;
        let handler;
        let manager;
        let isMounted = true;

        const init = async () => {
            try {
                viewer = new Cesium.Viewer(cesiumContainerRef.current, {
                    terrain: Cesium.Terrain.fromWorldTerrain(),
                    infoBox: false, geocoder: false, homeButton: false,
                    sceneModePicker: false, baseLayerPicker: false,
                    navigationHelpButton: false, animation: false,
                    timeline: true, fullscreenButton: false,
                    vrButton: false, selectionIndicator: false,
                    shadows: true, shouldAnimate: true,
                    targetFrameRate: 60
                });

                if (isMounted) setViewer(viewer);
                
                viewer._cesiumWidget._creditContainer.style.display = "none";
                viewer.scene.globe.depthTestAgainstTerrain = true;
                viewer.scene.globe.enableLighting = true;

                const google_sat = await Cesium.IonImageryProvider.fromAssetId(3830182);
                google_sat.dayAlpha = 0.0;
                google_sat.nightAlpha = 1.0;
                viewer.imageryLayers.addImageryProvider(google_sat);
                const osm_building = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
                viewer.scene.primitives.add(osm_building);

                if (!isMounted) return;

                manager = new WaypointManager(viewer);
                if (isMounted) setWaypointManager(manager);

                simulator = new FlightSimulator(viewer, manager);
                simulatorRef.current = simulator;

                simulator.on('audioLoaded', () => isMounted && setAudioReady(true));
                simulator.on('audioUnlocked', () => isMounted && setShowPrompt(false));

                const onFlightDataUpdate = (data) => {
                    if (isMounted) {
                        setFlightData({ ...data });
                    }
                };
                simulator.on('flightDataUpdate', onFlightDataUpdate);

                handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
                handler.setInputAction(async (movement) => {
                    if (simulatorRef.current && simulatorRef.current.viewMode === 'GLOBAL') {
                        const cartesian = viewer.scene.pickPosition(movement.position);
                        if (Cesium.defined(cartesian)) {
                            await simulatorRef.current.relocateAircraft(cartesian);
                            setViewMode('FLIGHT');
                        }
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
                
                const defaultAircraft = AIRCRAFT_LIST[0];
                const initialLon = 121.47, initialLat = 31.23, initialAgl = 1500;
                const initialCartographic = Cesium.Cartographic.fromDegrees(initialLon, initialLat);

                const [updatedInitialCarto] = await simulator.getUpdatedCartographicsWithTerrainHeight([initialCartographic]);
                updatedInitialCarto.height += initialAgl;
                const initialPosition = Cesium.Cartographic.toCartesian(updatedInitialCarto);

                simulator.loadAircraft(defaultAircraft, initialPosition, Cesium.Math.toRadians(-90));
                setCurrentAircraftId(defaultAircraft.id);
                
            } catch (error) {
                console.error("Failed to initialise Cesium viewer:", error);
            }
        };

        init();

        return () => {
            isMounted = false;
            if (handler) handler.destroy();
            if (manager) manager.destroy();
            if (simulator) simulator.destroy();
            if (viewer) viewer.destroy();
        };
    }, []);

    useEffect(() => {
        if (!waypointManager) return;

        const updateWaypoints = () => {
            setWaypoints(waypointManager.getWaypoints());
        };

        const handleNavigationCompleted = () => {
            console.log('Navigation mission accomplished!');
            setIsNavigating(false);
        };

        updateWaypoints();

        waypointManager.on('waypointAdded', updateWaypoints);
        waypointManager.on('waypointRemoved', updateWaypoints);
        waypointManager.on('waypointsCleared', updateWaypoints);
        waypointManager.on('waypointReached', updateWaypoints);
        waypointManager.on('navigationCompleted', handleNavigationCompleted);

        return () => {
            waypointManager.off('waypointAdded', updateWaypoints);
            waypointManager.off('waypointRemoved', updateWaypoints);
            waypointManager.off('waypointsCleared', updateWaypoints);
            waypointManager.off('waypointReached', updateWaypoints);
            waypointManager.off('navigationCompleted', handleNavigationCompleted);
        };
    }, [waypointManager]);


    const handleAudioUnlock = async () => {
        if (simulatorRef.current) {
            await simulatorRef.current.unlockAudio();
            simulatorRef.current.start();
        }
    };

    const handleAircraftSelect = (aircraftConfig) => {
        if (simulatorRef.current && currentAircraftId !== aircraftConfig.id) {
            const prev = simulatorRef.current.currentAircraft.state;
            const currentPosition = Cesium.Cartesian3.clone(prev.position);
            const currentOrientation = Cesium.Quaternion.clone(prev.orientation);

            simulatorRef.current.loadAircraft(
                aircraftConfig,
                currentPosition,
                undefined,
                currentOrientation
            );
            setCurrentAircraftId(aircraftConfig.id);
        }
    };

    const handleToggleViewMode = () => {
        const newMode = viewMode === 'FLIGHT' ? 'GLOBAL' : 'FLIGHT';
        if (simulatorRef.current) {
            simulatorRef.current.setViewMode(newMode);
            setViewMode(newMode);
        }
    };

    const handleNavigationStart = () => setIsNavigating(true);
    const handleNavigationStop = () => setIsNavigating(false);

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
            {!audioReady && <LoadingScreen />}

            <div ref={cesiumContainerRef} style={{ width: '100%', height: '100%' }} />
            
            {isNavigating && flightData?.navigationData && (
                <WaypointNavigation
                    navigationData={flightData.navigationData}
                    flightData={flightData}
                />
            )}

            {showPrompt && audioReady && (
                <EnterPrompt onUnlock={handleAudioUnlock} />
            )}

            {!showPrompt && (
                <>
                    <FlightControls flightData={flightData} />
                    <AircraftSelector onSelect={handleAircraftSelect} currentAircraftId={currentAircraftId} />
                    <GlobalViewToggle viewMode={viewMode} onToggle={handleToggleViewMode} />
                    <InstrumentPanel flightData={flightData} waypoints={waypoints} />
                    {waypointManager && (
                        <WaypointControl
                            waypointManager={waypointManager}
                            isNavigating={isNavigating}
                            onNavigationStart={handleNavigationStart}
                            onNavigationStop={handleNavigationStop}
                            viewer={viewer}
                        />
                    )}
                </>    
            )}
        </div>
    );
}

export default CesiumViewer;