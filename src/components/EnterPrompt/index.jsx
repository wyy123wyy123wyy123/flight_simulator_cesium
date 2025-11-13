// components/EnterPrompt/index.jsx

import { useState } from 'react';

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(6px)'
};

const containerStyle = {
    display: 'flex',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '24px',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    padding: '32px',
    borderRadius: '16px',
    border: '2px solid #00ff00',
    boxShadow: '0 0 30px rgba(0, 255, 0, 0.25)',
    width: 'fit-content',
};

const leftColStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
};

const badgeStyle = {
    alignSelf: 'flex-start',
    color: '#001800',
    backgroundColor: '#00ff00',
    borderRadius: '999px',
    padding: '4px 10px',
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 0 10px rgba(0,255,0,.3)'
};

const titleStyle = {
    color: '#00ff00',
    fontSize: '28px',
    margin: 0,
    fontFamily: 'monospace',
    textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
};

const subtitleStyle = {
    color: '#9ee89e',
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.6
};

const panelStyle = {
    border: '1px solid #00ff00',
    borderRadius: '12px',
    padding: '14px',
    background: 'rgba(0,0,0,0.35)',
    color: '#cceccc',
    fontFamily: 'monospace'
};

const panelHeaderStyle = {
    color: '#00ff00',
    fontSize: '14px',
    marginBottom: '8px',
    fontWeight: 'bold',
    borderBottom: '1px dashed #00ff00',
    paddingBottom: '6px'
};

const emphasisStyle = {
    fontFamily: 'monospace',
    display: 'inline-block',
    padding: '2px 6px',
    background: 'rgba(255,90,0,0.15)',
    border: '1px solid #ff5a00',
    borderRadius: '6px',
    color: '#ff7b1f',
    fontWeight: 'bold',
    textShadow: '0 0 6px rgba(255,120,0,0.6)',
    boxShadow: '0 0 8px rgba(255,120,0,0.4)',
};

const shortcutBoxStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    color: '#cceccc',
    fontSize: '12px'
};

const keyStyle = {
    display: 'inline-block',
    border: '1px solid #00ff00',
    borderRadius: '6px',
    padding: '2px 6px',
    color: '#00ff00',
    marginRight: '6px',
    minWidth: '28px',
    textAlign: 'center'
};

const buttonBarStyle = {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
};

const startButtonStyle = (hovered) => ({
    padding: '14px 26px',
    fontSize: '16px',
    backgroundColor: hovered ? '#00cc00' : '#00cc0039',
    color: hovered ? '#000000ff' : '#00cc00',
    border: hovered ? '2px solid #14ff3bff' : '2px solid #00cc00',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    transition: 'all 0.25s ease',
    boxShadow: hovered ? '0 0 24px rgba(0, 255, 0, 0.5)' : '0 0 16px rgba(0, 0, 0, 0)',
    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    width: '200px',
});

const EnterPrompt = ({ onUnlock }) => {
    const [hover, setHover] = useState(false);
    const [audioEnabled] = useState(true);

    const handleStart = () => {
        try {
            onUnlock?.({ audioEnabled });
        } catch {
            onUnlock?.();
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={containerStyle}>
                <div style={leftColStyle}>
                    <span style={badgeStyle}>Flight Simulator</span>
                    <h2 style={titleStyle}>欢迎进入飞行模拟</h2>
                    <p style={subtitleStyle}>
                        体验高速俯冲、精准机动与全球航点导航。启用音效以获得引擎、失速与音爆的沉浸式体验。
                    </p>

                    <div style={{ ...panelStyle, marginTop: '6px' }}>
                        <div style={panelHeaderStyle}>快捷键</div>
                        <div style={shortcutBoxStyle}>
                            <div><span style={keyStyle}>W/S</span>俯冲 / 抬升</div>
                            <div><span style={keyStyle}>A/D</span>左滚 / 右滚</div>
                            <div><span style={keyStyle}>Q/E</span>左转 / 右转</div>
                            <div><span style={keyStyle}>Shift/Ctrl</span>加速 / 减速</div>
                        </div>
                    </div>                   

                    <div style={panelStyle}>
                        <div style={panelHeaderStyle}>注意事项</div>
                        <div style={{ color: '#cceccc', fontSize: '12px', lineHeight: 1.6 }}>
                            - 建议在桌面浏览器运行以获得最佳体验。<br />
                            - 如果看不到地形或影像，请检查网络与 Cesium Ion Token。<br />
                            - 点击“开始飞行”将创建用户手势以解锁音频。
                        </div>
                    </div>

                    <span style={emphasisStyle}>由于需要实时加载并计算地形碰撞，流畅度取决于网络与设备性能。</span>

                    
                    <div style={buttonBarStyle}>
                        <button
                            style={startButtonStyle(hover)}
                            onMouseEnter={() => setHover(true)}
                            onMouseLeave={() => setHover(false)}
                            onClick={handleStart}
                        >
                            我明白，开始飞行
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnterPrompt;