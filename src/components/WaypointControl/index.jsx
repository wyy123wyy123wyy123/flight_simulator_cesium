// src/components/WaypointControl/index.jsx

import { useEffect, useState, useCallback } from 'react';
import { LANDMARKS } from '../../config/landmarksConfig';
import * as Cesium from 'cesium';

const WaypointControl = ({ waypointManager, isNavigating, onNavigationStart, onNavigationStop, viewer, isAutoFlying }) => {
    const [showPanel, setShowPanel] = useState(false);
    const [waypoints, setWaypoints] = useState([]);
    const [selectedLandmark, setSelectedLandmark] = useState('');
    const [altitude, setAltitude] = useState(1000);
    
    const [manualInput, setManualInput] = useState({
        name: '',
        latitude: '',
        longitude: '',
        altitude: 1000
    });
    const [showManualInput, setShowManualInput] = useState(false);

    const [clickAddMode, setClickAddMode] = useState(false);

    useEffect(() => {
        if (!waypointManager) return;

        const updateWaypoints = () => {
            setWaypoints(waypointManager.getWaypoints());
        };

        updateWaypoints();

        waypointManager.on('waypointAdded', updateWaypoints);
        waypointManager.on('waypointRemoved', updateWaypoints);
        waypointManager.on('waypointsCleared', updateWaypoints);

        return () => {
            waypointManager.off('waypointAdded', updateWaypoints);
            waypointManager.off('waypointRemoved', updateWaypoints);
            waypointManager.off('waypointsCleared', updateWaypoints);
        };
    }, [waypointManager]);

    const handleMapClick = useCallback(async (movement) => {
        if (!waypointManager || !viewer) return;

        const cartesian = viewer.scene.pickPosition(movement.position);
        if (Cesium.defined(cartesian)) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            const aglAltitude = 1000; // 对地高度1000米

            await waypointManager.addWaypoint(
                lon,
                lat,
                aglAltitude,
                `航点 ${waypoints.length + 1}`
            );
        }
    }, [waypointManager, viewer, waypoints.length]);

    useEffect(() => {
        if (!viewer || !clickAddMode) {
            return;
        }

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(handleMapClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        return () => {
            if (handler && !handler.isDestroyed()) {
                handler.destroy();
            }
        };
    }, [viewer, clickAddMode, handleMapClick]);

    const handleAddLandmark = async () => {
        if (!selectedLandmark || !waypointManager) return;

        const landmark = LANDMARKS.find(l => l.name === selectedLandmark);
        if (landmark) {
            await waypointManager.addWaypointFromLandmark(landmark, altitude);
            setSelectedLandmark('');
        }
    };

    const handleAddManualWaypoint = async () => {
        if (!waypointManager) return;

        const lat = parseFloat(manualInput.latitude);
        const lon = parseFloat(manualInput.longitude);
        const alt = parseFloat(manualInput.altitude);

        if (isNaN(lat) || isNaN(lon) || isNaN(alt)) {
            alert('请输入有效的坐标和高度');
            return;
        }

        if (lat < -90 || lat > 90) {
            alert('纬度必须在 -90 到 90 之间');
            return;
        }

        if (lon < -180 || lon > 180) {
            alert('经度必须在 -180 到 180 之间');
            return;
        }

        const waypointName = manualInput.name || `航点 ${waypoints.length + 1}`;
        await waypointManager.addWaypoint(lon, lat, alt, waypointName);

        setManualInput({
            name: '',
            latitude: '',
            longitude: '',
            altitude: 1000
        });
        setShowManualInput(false);
    };

    const handleRemoveWaypoint = (waypointId) => {
        if (waypointManager) {
            waypointManager.removeWaypoint(waypointId);
        }
    };

    const handleClearAll = () => {
        if (waypointManager && window.confirm('确定要清除所有航点吗？')) {
            waypointManager.clearWaypoints();
        }
    };

    const handleStartNavigation = () => {
        if (waypointManager && waypointManager.startNavigation()) {
            onNavigationStart?.();
        }
    };

    const handleStopNavigation = () => {
        if (waypointManager) {
            waypointManager.stopNavigation();
            onNavigationStop?.();
        }
    };

    return (
        <div style={containerStyle}>
            <button 
                style={toggleButtonStyle}
                onClick={() => setShowPanel(!showPanel)}
            >
                {showPanel ? '✕' : '📍'} 航点管理
            </button>

            {showPanel && (
                <div style={panelStyle}>
                    <h3 style={headerStyle}>航点管理</h3>

                    <div style={sectionStyle}>
                        <label style={labelStyle}>添加航点方式:</label>
                        <div style={addMethodButtonsStyle}>
                            <button
                                style={{
                                    ...methodButtonStyle,
                                    backgroundColor: !showManualInput && !clickAddMode ? '#003300' : 'transparent'
                                }}
                                onClick={() => {
                                    setShowManualInput(false);
                                    setClickAddMode(false);
                                }}
                            >
                                📍 地标
                            </button>
                            <button
                                style={{
                                    ...methodButtonStyle,
                                    backgroundColor: showManualInput ? '#003300' : 'transparent'
                                }}
                                onClick={() => {
                                    if (showManualInput) {
                                        setShowManualInput(false);
                                    } else {
                                        setShowManualInput(true);
                                        setClickAddMode(false);
                                    }
                                }}
                            >
                                ⌨️ 手动输入
                            </button>
                            <button
                                style={{
                                    ...methodButtonStyle,
                                    backgroundColor: clickAddMode ? '#003300' : 'transparent',
                                    border: clickAddMode ? '2px solid #ffff00' : '1px solid #00ff00'
                                }}
                                onClick={() => {
                                    if (clickAddMode) {
                                        setClickAddMode(false);
                                    } else {
                                        setShowManualInput(false);
                                        setClickAddMode(true);
                                    }
                                }}
                            >
                                🖱️ 点击地图
                            </button>
                        </div>
                        {clickAddMode && (
                            <div style={clickModeHintStyle}>
                                ✨ 地图点击模式已启用，单击地图添加航点
                            </div>
                        )}
                    </div>

                    {showManualInput && (
                        <div style={manualInputSectionStyle}>
                            <input
                                type="text"
                                placeholder="航点名称（可选）"
                                style={inputStyle}
                                value={manualInput.name}
                                onChange={(e) => setManualInput({...manualInput, name: e.target.value})}
                            />
                            <div style={coordRowStyle}>
                                <input
                                    type="number"
                                    className="no-spin"
                                    placeholder="纬度 (-90 ~ 90)"
                                    style={{...inputStyle, width: '48%'}}
                                    value={manualInput.latitude}
                                    onChange={(e) => setManualInput({...manualInput, latitude: e.target.value})}
                                    step="0.0001"
                                />
                                <input
                                    type="number"
                                    className="no-spin"
                                    placeholder="经度 (-180 ~ 180)"
                                    style={{...inputStyle, width: '48%'}}
                                    value={manualInput.longitude}
                                    onChange={(e) => setManualInput({...manualInput, longitude: e.target.value})}
                                    step="0.0001"
                                />
                            </div>
                            <input
                                type="number"
                                className="no-spin"
                                placeholder="对地高度 (米)"
                                style={inputStyle}
                                value={manualInput.altitude}
                                onChange={(e) => setManualInput({...manualInput, altitude: e.target.value})}
                                min="100"
                                max="15000"
                                step="100"
                            />
                            <button 
                                style={addButtonStyle}
                                onClick={handleAddManualWaypoint}
                            >
                                ➕ 添加航点
                            </button>
                        </div>
                    )}

                    {!showManualInput && !clickAddMode && (
                        <div style={sectionStyle}>
                            <label style={labelStyle}>选择地标:</label>
                            <select 
                                style={selectStyle}
                                value={selectedLandmark}
                                onChange={(e) => setSelectedLandmark(e.target.value)}
                            >
                                <option value="">选择地标...</option>
                                {LANDMARKS.map(landmark => (
                                    <option key={landmark.name} value={landmark.name}>
                                        {landmark.name}
                                    </option>
                                ))}
                            </select>

                            <div style={altitudeRowStyle}>
                                <label style={labelStyle}>对地高度 (米):</label>
                                <input
                                    type="number"
                                    className="no-spin"
                                    style={inputStyle}
                                    value={altitude}
                                    onChange={(e) => setAltitude(Number(e.target.value))}
                                    min="100"
                                    max="15000"
                                    step="100"
                                />
                            </div>

                            <button 
                                style={addButtonStyle}
                                onClick={handleAddLandmark}
                                disabled={!selectedLandmark}
                            >
                                ➕ 添加航点
                            </button>
                        </div>
                    )}

                    <div style={sectionStyle}>
                        <div style={listHeaderStyle}>
                            <span>航点列表 ({waypoints.length})</span>
                            {waypoints.length > 0 && (
                                <button 
                                    style={clearButtonStyle}
                                    onClick={handleClearAll}
                                >
                                    清空
                                </button>
                            )}
                        </div>

                        <div style={waypointListStyle}>
                            {waypoints.length === 0 ? (
                                <div style={emptyStyle}>暂无航点</div>
                            ) : (
                                waypoints.map((wp, index) => (
                                    <div 
                                        key={wp.id} 
                                        style={{
                                            ...waypointItemStyle,
                                            backgroundColor: wp.reached ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)'
                                        }}
                                    >
                                        <div style={waypointNumberStyle}>
                                            {index + 1}
                                        </div>
                                        <div style={waypointDetailsStyle}>
                                            <div style={waypointNameItemStyle}>
                                                {wp.name}
                                                {wp.reached && <span style={reachedBadgeStyle}>✓</span>}
                                            </div>
                                            <div style={waypointCoordsStyle}>
                                                {wp.latitude.toFixed(4)}°, {wp.longitude.toFixed(4)}° @ {Math.round(wp.altitude)}m
                                            </div>
                                        </div>
                                        {!wp.reached && (
                                            <button 
                                                style={removeButtonStyle}
                                                onClick={() => handleRemoveWaypoint(wp.id)}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        {!isNavigating ? (
                            <button 
                                style={{ ...navButtonStyle, backgroundColor: '#00aa00' }}
                                onClick={handleStartNavigation}
                                disabled={waypoints.length === 0 || isAutoFlying}
                            >
                                🚀 开始导航
                            </button>
                        ) : (
                            <button 
                                style={{
                                    ...navButtonStyle,
                                    backgroundColor: isAutoFlying ? '#555' : '#aa0000',
                                    cursor: isAutoFlying ? 'not-allowed' : 'pointer'
                                }}
                                onClick={handleStopNavigation}
                                disabled={isAutoFlying}
                            >
                                {isAutoFlying ? '✈️ 自动飞行中...' : '⏹️ 停止导航'}
                            </button>
                        )}
                    </div>

                    <div style={hintStyle}>
                        💡 提示: 高度输入现在是相对于地面的高度。
                    </div>
                </div>
            )}
        </div>
    );
};

const addMethodButtonsStyle = { display: 'flex', gap: '8px', marginBottom: '10px', };
const methodButtonStyle = { flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid #00ff00', color: '#00ff00', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', transition: 'all 0.2s', };
const manualInputSectionStyle = { backgroundColor: 'rgba(0, 50, 0, 0.2)', border: '1px solid #00ff00', borderRadius: '6px', padding: '12px', marginBottom: '15px', };
const coordRowStyle = { display: 'flex', justifyContent: 'space-between', gap: '4%', };
const clickModeHintStyle = { color: '#ffff00', fontSize: '11px', marginTop: '5px', padding: '6px', backgroundColor: 'rgba(255, 255, 0, 0.1)', borderRadius: '4px', textAlign: 'center', };
const containerStyle = { position: 'absolute', bottom: '40px', right: '20px', zIndex: 1000, };
const toggleButtonStyle = { backgroundColor: 'rgba(0, 0, 0, 0.7)', border: '2px solid #00ff00', color: '#00ff00', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', };
const panelStyle = { backgroundColor: 'rgba(0, 0, 0, 0.9)', border: '2px solid #00ff00', borderRadius: '10px', padding: '15px', marginTop: '10px', width: '350px', maxHeight: '70vh', overflowY: 'auto', fontFamily: 'monospace', };
const headerStyle = { color: '#00ff00', margin: '0 0 15px 0', fontSize: '18px', borderBottom: '2px solid #00ff00', paddingBottom: '10px', };
const sectionStyle = { marginBottom: '15px', };
const labelStyle = { display: 'block', color: '#00ff00', marginBottom: '6px', fontSize: '12px', };
const selectStyle = { width: '100%', padding: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#00ff00', border: '1px solid #00ff00', borderRadius: '4px', marginBottom: '10px', fontFamily: 'monospace', };
const inputStyle = { width: '100%', padding: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#00ff00', border: '1px solid #00ff00', borderRadius: '4px', marginBottom: '10px', fontFamily: 'monospace', display: 'flex', boxSizing: 'border-box', paddingRight: '12px', };
const altitudeRowStyle = { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', };
const addButtonStyle = { width: '100%', backgroundColor: '#003300', border: '1px solid #00ff00', color: '#00ff00', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', };
const listHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#00ff00', marginBottom: '8px', };
const clearButtonStyle = { backgroundColor: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', };
const waypointListStyle = { display: 'flex', flexDirection: 'column', gap: '8px', };
const emptyStyle = { color: '#888', textAlign: 'center', padding: '12px 0', };
const waypointItemStyle = { display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #00ff00', borderRadius: '6px', padding: '8px', };
const waypointNumberStyle = { minWidth: '28px', height: '28px', lineHeight: '28px', textAlign: 'center', borderRadius: '50%', border: '1px solid #00ff00', color: '#00ff00', fontFamily: 'monospace', };
const waypointDetailsStyle = { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', };
const waypointNameItemStyle = { color: '#00ff00', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', };
const reachedBadgeStyle = { color: '#00ff00', border: '1px solid #00ff00', borderRadius: '4px', padding: '0 4px', fontSize: '10px', };
const waypointCoordsStyle = { color: '#9ee89e', fontSize: '12px', fontFamily: 'monospace', };
const removeButtonStyle = { backgroundColor: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', };
const navButtonStyle = { width: '100%', border: '1px solid #00ff00', color: '#fff', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', };
const hintStyle = { color: '#9ee89e', fontSize: '12px', marginTop: '8px', };

export default WaypointControl;