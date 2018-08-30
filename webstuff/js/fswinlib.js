/**
 * Copyright © 2014-2016 The Board of Trustees of The Leland Stanford Junior University.
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
 * Window library for FSDesktop.
 *
 * @author Howard Palmer
 * Created by Hep on 3/24/2014.
 */
define(['jquery', 'core/ifmessage'], function(jq, IfMessage) {

    function FSWinlib() {
        this.wmgrRequestId = 1;
        this.winName = IfMessage.getWindowName();
        this.masterName = IfMessage.getMasterName();
    }

    /**
     * Get the name of the current window. The top window is "winmain".
     * Other windows are given names like "winN" when they are created.
     * The window manager notifies a child window of its name, using a
     * 'window' parameter in the child's source URL.
     *
     * @returns {String} window name
     */
    FSWinlib.prototype.getWindowName = function() {
        return this.winName;
    };

    /**
     * When a child window creates another child window, it may declare itself
     * to be the 'master' by including 'master' in the source URL for the new
     * window.
     *
     * @returns {String|undefined} the master window name, if present
     */
    FSWinlib.prototype.getMasterName = function() {
        return this.masterName;
    };

    /**
     * Get the window object for a specified window name.
     *
     * @param {String} winName the window name
     * @returns {*}
     */
    FSWinlib.prototype.getWindow = function(winName) {
        return IfMessage.getWindow(winName);
    };

    /**
     * Establish a message queue for a given port id. This is typically used when
     * messages may received on the port asynchronously, or from multiple sources.
     * The window manager uses this to ensure that it receives all requests sent
     * to it.
     *
     * If listen() is not called, there must be a receive() posted on a port
     * before a message for the port arrives. Otherwise the message is dropped.
     * With listen(), messages are queued in the order received, and can be
     * retrieved using receive() before or after a message arrives.
     *
     * @param {String|Number} portId the receiving port id
     */
    FSWinlib.prototype.listen = function(portId) {
        IfMessage.listen(portId);
    };

    /**
     * Acquire a promise for the receipt of a message on a specified port id. If
     * listen() has been called for the port id, and there are messages queued,
     * the returned promise will already be resolved. Otherwise it will be resolved
     * when a message for the port id arrives.
     *
     * If listen() is not called for the port id, receive() must be called before
     * a message arrives, or the message will be dropped. If multiple calls to
     * receive() for the same port id are made before a message arrives, all
     * return the same promise, which ultimately will be resolved with the same
     * message.
     *
     * @param {String|Number} portId the receiving port id
     * @returns {jQuery.Promise} a jQuery promise for the next received message
     */
    FSWinlib.prototype.receive = function(portId) {
        return IfMessage.receive(portId);
    };

    /**
     * Send a message to a given window and port id, with an optional response
     * port id. The dstWinName, dstPortId, srcWinName, and rspPortId (if present)
     * are added to the message before it is sent.
     *
     * @param {String} dstWinName the destination window name
     * @param {String} dstPortId the destination port id
     * @param {Object} message the message
     * @param {String|Number} [rspPortId] an optional response port id
     */
    FSWinlib.prototype.send = function(dstWinName, dstPortId, message, rspPortId) {
        IfMessage.send(dstWinName, dstPortId, message, rspPortId);
    };

    /**
     * Send a request to the window manager. A unique response port id
     * for the request is generated, and a receive is posted on it.
     * The message is sent, and a promise for the response is returned.
     *
     * @param {Object} request a window manager request
     * @returns {jQuery.Promise} a jQuery promise for the window manager response
     */
    FSWinlib.prototype.wmgrRequest = function(request) {
        var rspPortId = 'wmgr' + this.wmgrRequestId++,
            result = this.receive(rspPortId);
        this.send('winmain', 'winmgr', request, rspPortId);
        return result;
    };

    /**
     * Create a new window. By default, the window is created in the closed state,
     * but including closed: false in the options will create it in the open state.
     * The master window for the new window is set to the current window, unless it
     * is already set in the source URL.
     *
     * @param {String} srcURL the source URL for the iframe associated with the window
     * @param {Object} options window creation options (see jQuery easyui)
     * @returns {jQuery.Promise} a jQuery promise for the window manager response
     */
    FSWinlib.prototype.createWindow = function(srcURL, options) {
        if (srcURL.lastIndexOf("?") < 0) {
            srcURL += "?master=" + this.getWindowName();
        }
        else if (srcURL.lastIndexOf("master=") < 0) {
            srcURL += "&master=" + this.getWindowName();
        }
        var req = { op: 'create', srcURL: srcURL, options: options };
        return this.wmgrRequest(req);
    };

    /**
     * Open an existing window. The window is also moved to the top of the window
     * stack, even if it was already open.
     *
     * @param {String} winName the window name
     * @returns {jQuery.Promise} a jQuery promise for the window manager response
     */
    FSWinlib.prototype.openWindow = function(winName) {
        var req = { op: 'open', window: winName };
        return this.wmgrRequest(req);
    };

    /**
     * Set the title on an existing window.
     *
     * @param {String} winName the window name
     * @param {String} title the new title
     * @returns {jQuery.Promise} a jQuery promise for the window manager response
     */
    FSWinlib.prototype.setTitle = function(winName, title) {
        var req = { op: 'setTitle', window: winName, options : { title: title } };
        return this.wmgrRequest(req);
    };

    /**
     * Close an existing window. This does not destroy the window, but only removes
     * it from the display. It has no effect if the window is closed, but there is
     * still a window manager response.
     *
     * @param {String} winName the window name
     * @returns {jQuery.Promise} a jQuery promise for the window manager response
     */
    FSWinlib.prototype.closeWindow = function(winName) {
        var req = { op: 'close', window: winName };
        return this.wmgrRequest(req);
    };

    /**
     * Destroy a named window. A promise for the window manager response is
     * returned.
     *
     * @param {String} winName the window name
     * @returns {jQuery.Promise}
     */
    FSWinlib.prototype.destroyWindow = function(winName) {
        var req = { op: 'destroy', window: winName };
        return this.wmgrRequest(req);
    };

    /**
     * Return a promise that is resolved when a specified window is loaded.
     *
     * @param {String} winName the window name
     * @returns {jQuery.Promise}
     */
    FSWinlib.prototype.onLoad = function(winName) {
        winName = winName || this.winName;
        var req = { op: 'onload', window: winName };
        return this.wmgrRequest(req);
    };

    /**
     * Return a promise that is resolved when a specified window is opened.
     *
     * @param {String} winName the window name
     * @returns {jQuery.Promise}
     */
    FSWinlib.prototype.onOpen = function(winName) {
        winName = winName || this.winName;
        var req = { op: 'onopen', window: winName };
        return this.wmgrRequest(req);
    };

    /**
     * Return a promise that is resolved when a specified window is closed.
     *
     * @param {String} winName the window name
     * @returns {jQuery.Promise}
     */
    FSWinlib.prototype.onClose = function(winName) {
        winName = winName || this.winName;
        var req = { op: 'onclose', window: winName };
        return this.wmgrRequest(req);
    };

    return FSWinlib;
});
