// src/components/GlobalViewToggle/index.jsx

const containerStyle = {
    position: 'absolute',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    textAlign: 'center'
};

const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#00ff00',
    border: '2px solid #00ff00',
    borderRadius: '5px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '16px',
    outline: 'none',
    minWidth: '150px',
    transition: 'background-color 0.2s, color 0.2s',
};

const tooltipStyle = {
    color: 'white',
    fontSize: '12px',
    marginTop: '5px',
    textShadow: '1px 1px 2px black'
};

const GlobalViewToggle = ({ viewMode, onToggle }) => {
    return (
        <div style={containerStyle}>
            <button 
                onClick={onToggle} 
                style={buttonStyle}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#00ff00'; e.currentTarget.style.color = '#000'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; e.currentTarget.style.color = '#00ff00'; }}
            >
                {viewMode === 'FLIGHT' ? '🌎 全球视图' : '✈️ 返回飞行'}
            </button>
            {viewMode === 'GLOBAL' && (
                <div style={tooltipStyle}>
                    双击地球表面以移动飞机至该位置
                </div>
            )}
            {viewMode === 'FLIGHT' && (
                <div style={tooltipStyle}>
                    点击以移动到全球视角
                </div>
            )}
        </div>
    );
};

export default GlobalViewToggle;