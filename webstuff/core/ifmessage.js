/**
 * Library for messaging between iframes based on postMessage(). The communicating
 * frames are assumed to be loaded from the same domain, so that there are no
 * cross-domain access issues.
 *
 * This is a revision of a library I developed to support a window manager for
 * a web page, where each window is represented by an iframe. But how an iframe
 * happens to be rendered is independent of the communication mechanism.
 *
 * Each iframe has a unique name, specified both as the "id" attribute of its <iframe>
 * element, and as a "window" query parameter in the "src" URL of the iframe. A "master"
 * query parameter may also be present, usually indicating the name of the iframe
 * responsible for creating this one.
 *
 * Messages sent between iframes contain the names of the source and destination
 * iframes, and also destination and response port ids, which are strings that
 * can be used to identify independent communication channels between iframes.
 *
 * Created by Hep on 7/24/2014.
 */
define(['jquery'], function($) {

    function IfMessage() {
        this.waiters = {};
        this.queues = {};
        this.winName = this.getQueryVar('window') || window.name || 'winmain';
        this.masterName = this.getQueryVar('master');
        $(window).on('message', $.proxy(this.receiveEvent, this));
    }

    IfMessage.prototype.getQueryVar = function(name) {
        if (this.queryparms === undefined) {
            var queryparms = {};
            var qs = window.location.search.substring(1),
                pairs = qs.split('&');
            $.each(pairs, function(index, pair) {
                var parts = pair.split('=');
                if (parts.length > 0) {
                    queryparms[parts[0]] = parts[1] && decodeURIComponent(parts[1].replace(/\+/g, " "));
                }
            });
            this.queryparms = queryparms;
        }
        return this.queryparms[name];
    };

    /**
     * Get the name of the current iframe. The main frame is "winmain".
     * Other iframes are given names when they are created.
     *
     * @returns {String} window (iframe) name
     */
    IfMessage.prototype.getWindowName = function() {
        return this.winName;
    };

    /**
     * When a child window creates another child window, it may declare itself
     * to be the 'master' by including 'master' in the source URL for the new
     * window.
     *
     * @returns {String|undefined} the master window name, if present
     */
    IfMessage.prototype.getMasterName = function() {
        return this.masterName;
    };

    /**
     * Get the window object for a specified iframe name. This assumes that
     * all iframes are children of the main frame.
     *
     * @param {String} winName the iframe name
     * @returns {*}
     */
    IfMessage.prototype.getWindow = function(winName) {
        if (!winName || (winName === 'winmain')) {
            return window.top;
        }
        // Look for an iframe window within the current top-level window.
        var iframeSelector = 'iframe[name="' + winName + '"]';
        var iframeWin = window.top.document.querySelector(iframeSelector);
        if (iframeWin) {
            return iframeWin.contentWindow;
        }
        // Legacy mechanism where the iframe is contained within a div which
        // has the window name as its id.
        iframeWin = window.top.document.querySelector('#' + winName + ' iframe');
        if (iframeWin) {
            return iframeWin.contentWindow;
        }
        // Follow the window.opener chain, looking for a window with the given name,
        // or an iframe window within an opener window of that name.
        for (var opener = window.opener; opener; opener = opener.opener) {
            if (opener.name === winName) {
                return opener;
            }
            var ifWin = opener.document.querySelector(iframeSelector);
            if (ifWin) {
                return ifWin.contentWindow;
            }
        }
        return undefined;
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
    IfMessage.prototype.listen = function(portId) {
        if (this.queues[portId] === undefined) {
            // Create a message queue for the port
            this.queues[portId] = [];
        }
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
    IfMessage.prototype.receive = function(portId) {
        if (this.waiters[portId] === undefined) {
            this.waiters[portId] = $.Deferred();
        }
        var result = this.waiters[portId],
            queue = this.queues[portId];
        if (queue !== undefined) {
            if (queue.length > 0) {
                // If a message is already present, dequeue it and resolve
                // the Deferred associated with the port.
                var qelem = queue.shift();
                this.waiters[portId] = undefined;
                result.resolve(qelem.data, qelem);
            }
        }
        return result.promise();
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
    IfMessage.prototype.send = function(dstWinName, dstPortId, message, rspPortId) {
        var msg = $.extend({}, message, {
                dstWinName: dstWinName,
                dstPortId: dstPortId,
                srcWinName: this.getWindowName(),
                rspPortId: rspPortId }),
            dstWindow = this.getWindow(dstWinName);
        if (dstWindow) {
            dstWindow.postMessage(msg, window.location.origin);
        }
        else console.warn(this.getWindowName() + ' could not find destination window, ' + dstWinName);
    };

    /**
     * Handler for a message event.
     *
     * @param {Object} evt a jQuery message event
     * @returns {boolean} false
     */
    IfMessage.prototype.receiveEvent = function(evt) {
        var oevent = evt.originalEvent,
            dstPortId = oevent.data.dstPortId,
            deferred = this.waiters[dstPortId];
        console.log(this.getWindowName() + ' received message from ' + oevent.data.srcWinName);
        if (deferred) {
            this.waiters[dstPortId] = undefined;
            deferred.resolve(oevent.data, oevent);
        }
        else if (this.queues[dstPortId] !== undefined) {
            this.queues[dstPortId].push(oevent);
        }
        else console.warn(this.getWindowName() + ' dropped a message for port ' + dstPortId);
        return false;
    };

    return new IfMessage();
});
