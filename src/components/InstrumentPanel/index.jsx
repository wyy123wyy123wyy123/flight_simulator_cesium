// components/InstrumentPanel/index.jsx

import AttitudeIndicator from '../AttitudeIndicator';
import RadarMap from '../RadarMap';
import { LANDMARKS } from '../../config/landmarksConfig';

const InstrumentPanel = ({ flightData, waypoints }) => {
    if (!flightData) return null;

    const { pitch, roll, position, heading } = flightData;

    return (
        <div style={panelContainerStyle}>
            <AttitudeIndicator pitch={pitch} roll={roll} />
            <div style={{ height: '15px' }} />
            <RadarMap 
                position={position} 
                heading={heading}
                landmarks={LANDMARKS}
                waypoints={waypoints}
            />
        </div>
    );
};

const panelContainerStyle = {
    position: 'absolute',
    bottom: '40px',
    left: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
};

export default InstrumentPanel;