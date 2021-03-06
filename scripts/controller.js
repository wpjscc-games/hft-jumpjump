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

// Start the main app logic.
requirejs([
    '../dist/hft',
    '../dist/sample-ui',
    '../dist/game-utils',
    '../3rdparty/hft-utils/dist/audio',
    '../3rdparty/hft-utils/dist/imageloader',
    '../3rdparty/hft-utils/dist/imageutils',
  ], function(
    hft,
    sampleUI,
    gameUtils,
    AudioManager,
    ImageLoader,
    ImageUtils) {

  var GameClient = hft.GameClient;
  var commonUI = sampleUI.commonUI;
  var input = sampleUI.input;
  var misc = sampleUI.misc;
  var mobileHacks = sampleUI.mobileHacks;
  var touch = sampleUI.touch;

  var g_client;
  var g_audioManager;
  var g_clock;
  var g_grid;
  var g_instrument;
  var g_leftRight = 0;
  var g_oldLeftRight = 0;
  var g_jump = false;

  var globals = {
    debug: false,
    orientation: "landscape-primary",
  };
  misc.applyUrlSettings(globals);
  mobileHacks.fixHeightHack();
  mobileHacks.disableContextMenu();
  mobileHacks.adjustCSSBasedOnPhone([
    {
      test: mobileHacks.isIOS8OrNewerAndiPhone4OrIPhone5,
      styles: {
        ".button": {
          bottom: "100px",
        },
      },
    },
  ]);

  function $(id) {
    return document.getElementById(id);
  }

  var startClient = function() {

    g_client = new GameClient({
      url: 'wss://game-workerman-center.test.jc91715.top',
      gameId:globals.gameId
    });
    //
    var handleScore = function() {
    };

    var handleDeath = function() {
    };

    var handleSetColor = function(msg) {
      var canvas = $("avatar");
      var width = canvas.clientWidth;
      var height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext("2d");
      var coloredImage = ImageUtils.adjustHSV(images.idle.img, msg.h, msg.s, msg.v, msg.range)
      var frame = ImageUtils.cropImage(coloredImage, 0, 0, 16, 16);
      var frame = ImageUtils.scaleImage(frame, 128, 128);
      ctx.drawImage(frame, 0, 0, ctx.canvas.width, ctx.canvas.height);
    };

    g_client.on('score', handleScore);
    g_client.on('die', handleDeath);
    g_client.on('setColor', handleSetColor);

    var sounds = {};
    g_audioManager = new AudioManager(sounds);

    commonUI.setupStandardControllerUI(g_client, globals);
    commonUI.askForNameOnce();   // ask for the user's name if not set
    commonUI.showMenu(true);     // shows the gear menu

    var handleLeftRight = function(pressed, bit) {
      g_leftRight = (g_leftRight & ~bit) | (pressed ? bit : 0);
      if (g_leftRight != g_oldLeftRight) {
        g_oldLeftRight = g_leftRight;
        g_client.sendCmd('move', {
            dir: (g_leftRight & 1) ? -1 : ((g_leftRight & 2) ? 1 : 0),
        });
      }
    };

    var handleJump = function(pressed) {
      if (g_jump != pressed) {
        g_jump = pressed;
        g_client.sendCmd('jump', {
            jump: pressed,
        });
      }
    };

    var keys = { };
    keys[input.cursorKeys.kLeft]  = function(e) { handleLeftRight(e.pressed, 0x1); }
    keys[input.cursorKeys.kRight] = function(e) { handleLeftRight(e.pressed, 0x2); }
    keys["Z".charCodeAt(0)]       = function(e) { handleJump(e.pressed);           }
    input.setupKeys(keys);

    touch.setupButtons({
      inputElement: $("buttons"),
      buttons: [
        { element: $("left"),  callback: function(e) { handleLeftRight(e.pressed, 0x1); }, },
        { element: $("right"), callback: function(e) { handleLeftRight(e.pressed, 0x2); }, },
        { element: $("up"),    callback: function(e) { handleJump(e.pressed);           }, },
      ],
    });
  };

  var images = {
    idle:  { url: "assets/spr_idle.png", },
  };

  ImageLoader.loadImages(images, startClient);


  setInterval(()=>{
    if(g_client){
      g_client.sendCmd('P',{})
    }
  },55000)
});


