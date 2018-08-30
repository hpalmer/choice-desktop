/**
 * Copyright © 2017 The Board of Trustees of The Leland Stanford Junior University.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Choicelet Playback Tool
 *
 * @author Howard Palmer
 * Created by Hep on 11/09/2017.
 */
import ChoiceSession from 'newlogging/ChoiceSession';
import EventOps from 'newlogging/EventOps';
import FileOps from 'newlogging/FileOps';
import IfMessage from 'newlogging/IfMessage';
import FsWinLib from 'newlogging/FsWinLib';

const MasterSendPort = 'playback';
const MasterRecvPort = 'pbcontrol';
// These must match the command and response port definitions in newlogging/scripts/PlaybackIf.js
const MyCommandPort = 'pbcommand';
const MyResponsePort = 'pbresponse';

const speedSettings = [0.5, 1, 2, 4, 6, 8, 10, 12, 16, 32];

class PbControl {
    constructor() {
        this.fswinlib = new FsWinLib();
        this.eventops = EventOps.instance();
        this.fileops = FileOps.instance();
        this.rewindButton = new Button('btnRewind', () => this.buttonRewind());
        this.playButton = new Button('btnPlay', () => this.buttonPlay());
        this.pauseButton = new Button('btnPause', () => this.buttonPause());
        this.slowerButton = new Button('btnSlower', () => this.buttonSlower());
        this.fasterButton = new Button('btnFaster', () => this.buttonFaster());
        this.unmuteButton = new Button('btnUnmute', () => this.buttonUnmute());
        this.muteButton = new Button('btnMute', () => this.buttonMute());
        this.timeline = undefined;
        this.speed = 1;
        this.muted = true;
        this.playing = false;
        this.suppressTimelineClicks = false;
        this.fswinlib.listen(MasterRecvPort);
        this.fswinlib.send(this.fswinlib.getMasterName(), MasterSendPort, { ready: true }, MasterRecvPort);
        this.fswinlib.receive(MasterRecvPort).then((msg) => this.receiveArguments(msg));
    }

    receiveArguments(msg) {
        if (msg.status === 1) {
            this.choicelet = msg.choicelet;
            this.state = msg.state;
            console.log(msg);
            document.querySelector('#stateInfo').innerText =
                `Playback ${this.choicelet.display} ${this.choicelet.version} State Id ${this.state.id} User ${this.state.username}`;
            this.openChoiceletWindow();
        }
        else {
            alert(`Error receiving arguments: ${msg}`);
        }
    }

    openChoiceletWindow() {
        this.fswinlib.listen(MyResponsePort);
        if (this.choicelet.newlogging) {
            const url = ChoiceSession.instance().getContextRoot(this.choicelet.url);
            this.choicelet.windowName = `playback-${this.state.id}`;
            const left = window.screenX;
            const top = window.screenY + window.outerHeight;
            this.choicelet.window = window.open(`${url}?with=fschoice/PlaybackIf&master=${window.name}`,
                                                this.choicelet.windowName,
                                                `modal=no,top=${top},left=${left},width=1050,height=815,location=no`);
            console.log(`Choicelet window name is ${this.choicelet.window.name}`);
            IfMessage.instance().registerUnmanagedWindow(this.choicelet.window);
            this.fswinlib.receive(MyResponsePort).then((msg) => {
                if (msg.ready) {
                    this.loadChoicelet();
                }
            });
        }
    }

    loadChoicelet() {
        this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
            command: 'load',
            clientId: this.state.client,
            stateId: this.state.id
        }, MyResponsePort);
        return this.fswinlib.receive(MyResponsePort).then((msg) => {
            console.log('Response to load command: ', msg);
            if (msg.cmdStatus === 1) {
                this.pbstate = msg.state;
                this.startTime = this.pbstate.tstamp;
                this.endTime = this.pbstate.events[this.pbstate.events.length-1]._timestamp;
                this.timeline = new TimeLine('#pbprogress', this.startTime, this.endTime, this.pbstate.events);
                this.playing = false;
                this.initializeButtons();
                this.timeline.onTimeClick().then((obj) => this.handleTimeClick(obj));
                window.focus();
            }
        });
    }

    initializeButtons() {
        this.rewindButton.show().enable();
        if (this.playing) {
            Button.setPair(this.pauseButton, this.playButton, true);
        }
        else {
            Button.setPair(this.playButton, this.pauseButton, true);
        }
        this.enableSpeedButtons(true);
        if (this.muted) {
            Button.setPair(this.unmuteButton, this.muteButton, true);
        }
        else {
            Button.setPair(this.muteButton, this.unmuteButton, true);
        }
        this.suppressTimelineClicks = false;
    }

    disableButtons() {
        this.rewindButton.disable();
        this.playButton.disable();
        this.pauseButton.disable();
        this.enableSpeedButtons(false);
        this.unmuteButton.disable();
        this.muteButton.disable();
        this.suppressTimelineClicks = true;
    }

    handleTimeClick(obj) {
        console.log('Time click', obj);
        if (!this.suppressTimelineClicks) {
            this.disableButtons();
            this.stopStatusPoll();
            this.playing = false;
            if (obj.backwards) {
                this.buttonRewind().then(() => {
                    obj.backwards = false;
                    this.handleTimeClick(obj)
                });
                return;
            }
            this.fastForward(obj.newTime)
                .then((msg) => {
                    this.timeline.setTime(msg.timeOffset);
                    this.startStatusPoll();
                    this.initializeButtons();
                    return this.timeline.onTimeClick()
                })
                .then((obj) => this.handleTimeClick(obj));
        }
    }

    buttonRewind() {
        this.disableButtons();
        this.stopStatusPoll();
        this.timeline.close();
        this.timeline = undefined;
        this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
            command: 'reload'
        }, MyResponsePort);
        return this.fswinlib.receive(MyResponsePort).then((msg) => {
            if (msg.ready) {
                return this.loadChoicelet();
            }
        });
    }

    buttonPlay(e) {
        this.disableButtons();
        this.play().then(() => {
            this.initializeButtons();
        });
    }

    play(speed, timeOffset) {
        speed = speed || this.speed;
        this.stopStatusPoll();
        this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
            command: 'play',
            speed: speedSettings[speed],
            timeOffset: timeOffset
        }, MyResponsePort);
        return this.fswinlib.receive(MyResponsePort).then((msg) => {
            console.log('Response to play command: ', msg);
            this.playing = true;
            this.startStatusPoll();
            return msg.cmdStatus;
        });
    }

    buttonPause(e) {
        this.disableButtons();
        this.pause().then(() => {
            this.initializeButtons();
        });
    }

    pause() {
        this.stopStatusPoll();
        this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
            command: 'pause'
        }, MyResponsePort);
        return this.fswinlib.receive(MyResponsePort).then((msg) => {
            console.log('Response to pause command: ', msg);
            this.playing = false;
        });
    }

    fastForward(toTime) {
        const timeOffset = toTime - this.startTime;
        if (timeOffset > 0) {
            this.stopStatusPoll();
            this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
                command: 'fastForward',
                timeOffset
            });
            return this.fswinlib.receive(MyResponsePort).then((msg) => {
                console.log('Response to fastForward command: ', msg);
                return msg;
            });
        }
        else if (timeOffset === 0) {
            return Promise.resolve({ timeOffset: toTime });
        }
        else {
            return Promise.reject(`Attempt to fast forward a negative amount: ${timeOffset}`);
        }
    }

    buttonFaster(e) {
        if ((this.speed + 1) < speedSettings.length) {
            this.disableButtons();
            this.speed += 1;
            this.setSpeed().then(() => {
                this.initializeButtons();
            });
        }
    }

    buttonSlower(e) {
        if (this.speed >= 1) {
            this.disableButtons();
            this.speed -= 1;
            this.setSpeed().then(() => {
                this.initializeButtons();
            });
        }
    }

    enableSpeedButtons(enable) {
        if (enable) {
            this.slowerButton.enable();
            this.fasterButton.enable();
        }
        else {
            this.slowerButton.disable();
            this.fasterButton.disable();
        }
    }

    setSpeed() {
        const wasPlaying = this.playing;
        this.stopStatusPoll();
        const pausePromise = (wasPlaying) ? this.pause() : Promise.resolve();
        return pausePromise.then(() => {
            this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
                command: 'setspeed',
                speed: speedSettings[this.speed]
            }, MyResponsePort);
        }).then(() => this.fswinlib.receive(MyResponsePort)).then((msg) => {
            console.log('Response to setspeed command: ', msg);
            const playPromise = (wasPlaying) ? this.play() : Promise.resolve();
            return playPromise.then(() => {
                document.querySelector('#speedbox').innerText = `${speedSettings[this.speed]}`;
            });
        });
    }

    buttonUnmute(e) {
        this.muted = false;
        this.mute().then((msg) => {
            Button.setPair(this.muteButton, this.unmuteButton, true);
        });
    }

    buttonMute(e) {
        this.muted = true;
        this.mute().then((msg) => {
            Button.setPair(this.unmuteButton, this.muteButton, true);
        });
    }

    mute() {
        this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
            command: 'mute',
            muted: this.muted
        });
        return this.fswinlib.receive(MyResponsePort);
    }

    startStatusPoll() {
        this.statusPoll = setTimeout(() => {
            this.statusPoll = undefined;
            this.fswinlib.send(this.choicelet.windowName, MyCommandPort, {
                command: 'status'
            }, MyResponsePort);
            this.fswinlib.receive(MyResponsePort).then((msg) => this.statusResponse(msg));
        }, 1000);
    }

    stopStatusPoll() {
        if (this.statusPoll) {
            clearTimeout(this.statusPoll);
            this.statusPoll = undefined;
        }
    }

    statusResponse(msg) {
        // console.log('Response to status command: ', msg);
        this.timeline.setTime(msg.timeOffset);
        document.querySelector('#elapsedbox').innerText = PbControl.formatDuration(msg.timeOffset - this.startTime);
        if (msg.state === 'play') {
            this.startStatusPoll();
        }
        else {
            this.playing = false;
            const playButton = document.querySelector('#btnPlay');
            const pauseButton = document.querySelector('#btnPause');
            playButton.removeEventListener('click', this.playHandler);
            pauseButton.removeEventListener('click', this.pauseHandler);
            playButton.classList.remove('hidden');
            pauseButton.classList.add('hidden');
            componentHandler.upgradeElement(document.querySelector('main'));
        }
    }

    static formatDuration(msecs) {
        const elapsed = Math.round(msecs / 1000);
        const seconds = elapsed % 60;
        const minutes = Math.floor(elapsed / 60);
        return `${PbControl.leftPad(minutes)}:${PbControl.leftPad(seconds)}`;
    }

    static leftPad(str, length=2, pad='0') {
        str = str.toString();
        return `${pad.repeat(Math.max(length - str.length, 0))}${str}`;
    }

    static instance() {
        if (!_instance) {
            _instance = new PbControl();
        }
        return _instance;
    }
}

class TimeLine {
    constructor(selector, startTime, endTime, events) {
        this.canvas = document.querySelector(selector);
        this.startTime = startTime;
        this.endTime = endTime;
        this.currentTime = startTime;
        this.events = events;
        this.clickHandler = undefined;
        this.resizeHandler = () => {
            this.setSize();
            this.render();
        };
        window.addEventListener('resize', this.resizeHandler);
        this.setSize();
        this.assignDriverColors();
        this.render();
    }

    setSize() {
        this.width = window.innerWidth - 100;
        this.height = 24;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    assignDriverColors() {
        this.driverColors = {};
        for (const event of this.events) {
            this.driverColors[event._driver] = true
        }
        const driverNames = Object.keys(this.driverColors);
        const driverCount = driverNames.length;
        const hueRange = [60, 300];
        const hueDelta = (hueRange[1] - hueRange[0]) / driverCount;
        let hue = hueRange[0];
        for (const name of driverNames) {
            this.driverColors[name] = `hsl(${Math.round(hue)}, 100%, 30%)`;
            hue += hueDelta;
        }
    }

    drawBackground() {
        const context = this.canvas.getContext('2d');
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = 'rgb(241,241,241)';
        context.fillRect(0, 0, this.width, this.height);
    }

    drawProgress() {
        const width = Math.round(((this.currentTime - this.startTime) / (this.endTime - this.startTime)) * this.width);
        const context = this.canvas.getContext('2d');
        context.fillStyle = 'hsl(120, 100%, 85%)';    // MDL accent is'rgb(83,109,254)';
        context.fillRect(0, 0, width, this.height);
    }

    drawEventMarks() {
        const canvasWidth = this.width;
        const canvasHeight = this.height;
        const duration = this.endTime - this.startTime;
        const context = this.canvas.getContext('2d');
        context.strokeStyle = 'rgb(0,0,0)';
        let lastx = -1;
        for (const event of this.events) {
            const nextx = Math.round(((event._timestamp - this.startTime) / duration) * canvasWidth);
            if (nextx > lastx) {
                context.strokeStyle = this.driverColors[event._driver];
                context.beginPath();
                context.moveTo(nextx, 0);
                context.lineTo(nextx, canvasHeight);
                context.stroke();
            }
            lastx = nextx;
        }
    }

    render() {
        this.drawBackground();
        this.drawProgress();
        this.drawEventMarks();
    }

    onTimeClick() {
        return new Promise((resolve) => {
            if (this.clickHandler) {
                this.canvas.removeEventListener('click', this.clickHandler);
            }
            this.clickHandler = (e) => {
                this.canvas.removeEventListener('click', this.clickHandler);
                this.clickHandler = undefined;
                const newtime = Math.round(this.startTime +
                                            ((e.offsetX / this.width) * (this.endTime - this.startTime)));
                resolve({ currentTime: this.currentTime, newTime: newtime, backwards: (newtime < this.currentTime) });
            };
            this.canvas.addEventListener('click', this.clickHandler);
        });
    }

    setTime(timestamp) {
        this.currentTime = timestamp;
        this.render();
    }

    close() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.clickHandler) {
            this.canvas.removeEventListener('click', this.clickHandler);
            this.clickHandler = undefined;
        }
        this.drawBackground();
    }
}

class Button {
    constructor(id, clickHandler) {
        this.id = (id[0] === '#') ? id : `#${id}`;
        this.clickHandler = clickHandler;
        this.enabled = false;
        this.hidden = false;
    }

    enable() {
        if (!this.enabled) {
            document.querySelector(this.id).addEventListener('click', this.clickHandler);
            this.enabled = true;
            this.update();
        }
        return this;
    }

    disable() {
        document.querySelector(this.id).removeEventListener('click', this.clickHandler);
        this.enabled = false;
        this.update();
        return this;
    }

    hide() {
        document.querySelector(this.id).classList.add('hidden');
        this.hidden = true;
        this.update();
        return this;
    }

    show() {
        document.querySelector(this.id).classList.remove('hidden');
        this.hidden = false;
        this.update();
        return this;
    }

    update() {
        componentHandler.upgradeElement(document.querySelector(this.id));
    }

    static setPair(showButton, hideButton, enable=true) {
        hideButton.disable();
        hideButton.hide();
        showButton.show();
        if (enable) {
            showButton.enable();
        }
    }
}

let _instance;

export default PbControl;

ChoiceSession.instance().ready(() => PbControl.instance());
