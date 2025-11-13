// src/helpers/InputController.js

export class InputController {
    constructor() {
        this.controls = {
            pitch: 0, // -1 to 1 (S to W)
            roll: 0,  // -1 to 1 (A to D)
            yaw: 0,   // -1 to 1 (Q to E)
            throttle: 0 // -1 to 1 (Ctrl to Shift)
        };
        this.keys = {};
        this._addEventListeners();
    }

    _addEventListeners() {
        this._onKeyDown = (e) => this._handleKeyEvent(e, true);
        this._onKeyUp   = (e) => this._handleKeyEvent(e, false);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    _handleKeyEvent(e, isPressed) {
        this.keys[e.key.toLowerCase()] = isPressed;
        this._updateControls();
    }

    _updateControls() {
        this.controls.pitch = (this.keys['w'] ? 1 : 0) + (this.keys['s'] ? -1 : 0);
        this.controls.roll = (this.keys['a'] ? -1 : 0) + (this.keys['d'] ? 1 : 0);
        this.controls.yaw = (this.keys['q'] ? -1 : 0) + (this.keys['e'] ? 1 : 0);
        this.controls.throttle = (this.keys['shift'] ? 1 : 0) + (this.keys['control'] ? -1 : 0);
    }
    
    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}