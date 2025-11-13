// src/components/LoadingScreen/index.jsx

const MESSAGE = "正在初始化...";

const LoadingScreen = () => {
    return (
        <div style={overlayStyle}>
            <div style={containerStyle}>
                <div className="spinner" style={spinnerStyle}></div>
                <h2 style={titleStyle}>Flight Simulator</h2>
                <p style={messageStyle}>{MESSAGE}</p>
            </div>
        </div>
    );
};

// 样式定义
const overlayStyle = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(5px)',
    color: '#00ff00',
    fontFamily: 'monospace',
};

const containerStyle = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
};

const spinnerStyle = {
    width: '60px',
    height: '60px',
    border: '5px solid rgba(0, 255, 0, 0.2)',
    borderTopColor: '#00ff00',
    borderRadius: '50%',
};

const titleStyle = {
    fontSize: '28px',
    margin: 0,
    textShadow: '0 0 10px rgba(0, 255, 0, 0.7)',
    letterSpacing: '2px',
};

const messageStyle = {
    fontSize: '16px',
    color: '#9ee89e',
    margin: 0,
    minHeight: '20px', // 防止文字切换时布局跳动
    transition: 'opacity 0.5s ease-in-out',
};

export default LoadingScreen;