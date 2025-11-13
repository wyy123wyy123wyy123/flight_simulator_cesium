// src/components/AircraftSelector/index.jsx

import { AIRCRAFT_LIST } from '../../config/aircraftConfig';

const selectorStyle = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 1000,
};

const buttonStyle = {
    display: 'block',
    width: '100%',
    padding: '8px',
    margin: '5px 0',
    backgroundColor: '#333',
    color: '#00ff00',
    border: '1px solid #00ff00',
    cursor: 'pointer',
};

const AircraftSelector = ({ onSelect, currentAircraftId, disabled }) => {
    return (
        <div style={selectorStyle}>
            <h4 style={{ color: 'white', margin: '0 0 10px 0' }}>选择飞机</h4>
            {AIRCRAFT_LIST.map(craft => (
                <button
                    key={craft.id}
                    onClick={() => onSelect(craft)}
                    disabled={disabled}
                    style={{
                        ...buttonStyle,
                        backgroundColor: currentAircraftId === craft.id ? '#00ff00' : '#333',
                        color: currentAircraftId === craft.id ? '#000' : '#00ff00',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                    }}
                >
                    {craft.name}
                </button>
            ))}
        </div>
    );
};

export default AircraftSelector;