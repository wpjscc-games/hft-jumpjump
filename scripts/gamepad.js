/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

define([
    // 'happyfuntimes',
    '../dist/hft',
    '../dist/events',
  ], function(
    happyfuntimes,
    EventEmitter) {

  const LocalNetPlayer = happyfuntimes.LocalNetPlayer;

  const RIGHT = 0x1;
  const LEFT = 0x2;
  const UP = 0x4;
  const DOWN = 0x8;

  const bitsToDir = [
     0, //  0
     1, //  1                 RIGHT
    -1, //  2            LEFT
    -2, //  3            LEFT RIGHT
  ];

  const mappings = {
    standard: {
      buttons: { left: 14, right: 15, up: 12, down: 13, buttonA: 1, buttonB: 0 }, axes: { upDown: 1, leftRight: 0 },
    },
    // This was my wired xbox controller on OSX Firefox 38
    unknown: {
      buttons: { left: 14, right: 15, up: 12, down: 13, buttonA: 1, buttonB: 0 }, axes: { upDown: 1, leftRight: 0 },
//      buttons: { left: 13, right: 14, up: 11, down: 12, buttonA: 0, buttonB: 1 }, axes: { upDown: 1, leftRight: 0 },
    },
  };

  function getMapping(mapping) {
    return mappings[mapping] || mappings.unknown;
  }

  function getAxis(axes, mapping) {
    return axes[mapping] || 0;
  }

  function getButton(buttons, mapping) {
    return buttons[mapping] ? buttons[mapping].pressed : false;
  }

  class GamepadPlayer extends LocalNetPlayer {
    constructor(gamepad, mapping) {
      super();
      this._gamepad = gamepad;
      this._mapping = mapping;
      this._dir = 0;
      this._button = false;
    }
    process() {
      const gamepad = this._gamepad;
      const mapping = this._mapping;
      const buttonMapping = mapping.buttons;
      const axesMapping   = mapping.axes;
      const buttons       = gamepad.buttons;
      const axes          = gamepad.axes;
      const xAxis = getAxis(axes, axesMapping.leftRight);
      const bits =
        ((getButton(buttons, buttonMapping.left   ) || xAxis < -0.5) ? LEFT  : 0) | // left
        ((getButton(buttons, buttonMapping.right  ) || xAxis >  0.5) ? RIGHT : 0) ; // right
      const button = getButton(buttons, buttonMapping.buttonA);
      const dir = bitsToDir[bits];
      if (this._dir !== dir) {
        this._dir = dir;
        this.sendEvent('move', {dir: dir});
      }
      if (button != this._button) {
        this._button = button;
        this.sendEvent('jump', {jump: button});
      }
    }
    disconnect() {
      this.sendEvent('disconnect', this);
    }
  }

  class GamepadManager extends EventEmitter {
    constructor() {
      super();
      this._handleConnect = this._handleConnect.bind(this);
      this._handleDisconnect = this._handleDisconnect.bind(this);
      this._processController = this._processController.bind(this);

      this._controllers = {};

      window.addEventListener("gamepadconnected", this._handleConnect);
      window.addEventListener("gamepaddisconnected", this._handleDisconnect);
    }
    _addPlayerForGamepadIfNew(gamepad) {
      let player = this._controllers[gamepad.index];
      if (!player) {
        this._addGamepad(gamepad);
      }
    }
    _handleConnect(e) {
      this._addPlayerForGamepadIfNew(e.gamepad);
    }

    _handleDisconnect(e) {
      this._removeGamepad(e.gamepad);
    }

    _addGamepad(gamepad) {
      const mapping = getMapping(gamepad.mapping);
      const player = new GamepadPlayer(gamepad, mapping);
      this._controllers[gamepad.index] = player;
      this.emit('playerconnect', player, gamepad.index);
    }

    _removeGamepad(gamepad) {
      const player = this._controllers[gamepad.index];
      delete this._controllers[gamepad.index];
      player.disconnect();
    }

    _processController(index) {
      var gamepad = this._controllers[index];
      gamepad.process();
    }

    process() {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i]
        if (gamepad) {
          this._addPlayerForGamepadIfNew(gamepad);
        }
      }
      // FIX: Object.keys maks a new array.
      Object.keys(this._controllers).forEach(this._processController);
    }
  };

  return GamepadManager;
});


