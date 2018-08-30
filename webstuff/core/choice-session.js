/* 
 * Session Manager for Choice Project.
 */
/**
 * @external JSON
 */
define(['jquery'], function($) {
    /**
     * @name jQuery#session
     * @function
     */
    /**
     * @name jQuery#control
     * @function
     */

	function SessionManager() {
	    this.sessionId = null;
	    this.serverQueue = [];
	    this.contextRoot = undefined;
	    this.sessionInfo = {};
	    this.readyWaiters = [];
	    this.ajaxPendingCount = 0;
	    this.getSessionPending = undefined;
	    this._keepAliveTimeout = undefined;
	}
	
	SessionManager.prototype.getContextRoot = function(path) {
		var result = this.contextRoot || window.location.pathname;
		if (result[result.length-1] !== '/') {
		    var i = result.lastIndexOf('/');
		    if (i >= 0) {
		        result = result.substring(0, i+1);
            }
            else {
                result += '/';
            }
        }
		if (path != null) {
			if (path.charAt(0) === '/') path = path.slice(1);
			result += path;
		}
		return result;
	};

    SessionManager.prototype.getPageRoot = function(path) {
        var pageroot = window.location.pathname,
            i = pageroot.lastIndexOf('/');
        if (i > 0) {
            pageroot = pageroot.substr(0, i + 1);
        }
        if (path != null) {
            if (path.charAt(0) === '/') path = path.slice(1);
            pageroot += path;
        }
        return pageroot;
    };

	SessionManager.prototype.getParameter = function(name) {
	    if (this.queryParams) {
	        return this.queryParams[name];
	    }
	};
	
	/**
	 * Generate a globally unique identifier (GUID). This does not use any properties
	 * of the host system.
	 * 
	 * @return {String} a GUID in standard format
	 */
	SessionManager.prototype.makeGUID = function() {
	    // beautiful code from broofa on stackoverflow
	    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	};
	
	SessionManager.prototype.getSessionId = function() { return this.sessionId; };
	
	/**
	 * Create a cookie if possible.
	 *
	 * @param {String} name the cookie name
	 * @param {String} value the cookie value
	 * @param {int} [days] number of days before cookie expires
	 */
    SessionManager.prototype.createCookie = function(name, value, days) {
        var expires;
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        else expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    };

    /**
     * Read a cookie.
     *
     * @param {String} name the cookie name
     * @returns {String} the cookie value if present, else null
     */
    SessionManager.prototype.readCookie = function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; ++i) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    SessionManager.prototype.getCookieNames = function() {
    	var ca = document.cookie.split(';');
    	var result = [];
    	for (var i = 0; i < ca.length; ++i) {
    		var c = ca[i];
    		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    		var n = c.indexOf('=');
    		if (n >= 0) c = c.substring(0, n);
    		result[result.length] = c;
    	}
    };

    /**
     * Erase a cookie. If the name is not specified, all cookies for the
     * current website are erased.
     *
     * @param {String} name the cookie name
     */
    SessionManager.prototype.eraseCookie = function(name) {
    	if (name === undefined) {
    		var all = this.getCookieNames();
    		for (var i = 0; i < all.length; ++i) {
    			this.createCookie(all[i], "", -1);
    		}
    	}
    	else {
            this.createCookie(name, "", -1);
    	}
    };

    /**
     * Test whether cookies are enabled.
     *
     * @returns {Boolean} true if cookies are enabled, else false
     */
    SessionManager.prototype.areCookiesEnabled = function() {
    	if (this._cookiesEnabled === undefined) {
	        var r = false;
	        this.createCookie("csm_testing", "Hello", 1);
	        if (this.readCookie("csm_testing") != null) {
	            r = true;
	            this.eraseCookie("csm_testing");
	        }
	        this._cookiesEnabled = r;
    	}
        return this._cookiesEnabled;
    };

    /**
     * Set a session variable using sessionStorage.
     *
     * @param {String} name the variable name
     * @param {String} value the variable value
     */
    SessionManager.prototype.setSessionVar = function(name, value) {
    	window.sessionStorage.setItem(name, value);
    };

    /**
     * Get the value of a session variable from sessionStorage.
     *
     * @param {String} name the variable name
     * @returns {String} the variable value if present, else undefined
     */
    SessionManager.prototype.getSessionVar = function(name) {
    	return window.sessionStorage.getItem(name);
    };

    /**
     * Erase a session variable from sessionStorage. If the variable name is not
     * given, sessionStorage is cleared.
     *
     * @param {String} name the variable name
     */
    SessionManager.prototype.eraseSessionVar = function(name) {
    	if (name === undefined) {
    		window.sessionStorage.clear();
    	}
    	else {
    		window.sessionStorage.removeItem(name);
    	}
    };

    /**
     * Check whether session variables (sessionStorage) are available.
     * @returns {Boolean} true if session variables can be set
     */
    SessionManager.prototype.haveSessionVars = function() {
    	if (this._sessionStorage === undefined) {
    		var r = false;
	    	try {
	    		r = 'sessionStorage' in window && window.sessionStorage !== null;
			}
	    	catch (e) {
			    r = false;
			}
	    	this._sessionStorage = r;
    	}
    	return this._sessionStorage;
    };

    /**
     * Set a local variable using localStorage.
     *
     * @param {String} name the variable name
     * @param {String} value the variable value
     */
    SessionManager.prototype.setLocalVar = function(name, value) {
    	window.localStorage.setItem(name, value);
    };

    /**
     * Get the value of a local variable from localStorage.
     *
     * @param {String} name the variable name
     * @returns {String} the variable value if present, else undefined
     */
    SessionManager.prototype.getLocalVar = function(name) {
    	return window.localStorage.getItem(name);
    };

    /**
     * Erase a local variable from localStorage. If the variable name is not
     * given, localStorage is cleared.
     *
     * @param {String} name the variable name
     */
    SessionManager.prototype.eraseLocalVar = function(name) {
    	if (name === undefined) {
    		window.localStorage.clear();
    	}
    	else {
    		window.localStorage.removeItem(name);
    	}
    };

    /**
     * Check whether session variables (sessionStorage) are available.
     * @returns {Boolean} true if session variables can be set
     */
    SessionManager.prototype.haveLocalVars = function() {
    	if (this._localStorage === undefined) {
    		var r = false;
	    	try {
	    		r = 'localStorage' in window && window['localStorage'] !== null;
			}
	    	catch (e) {
			    r = false;
			}
	    	this._localStorage = r;
    	}
    	return this._localStorage;
    };

    SessionManager.prototype.setQueryVar = function(name, value) {
    	if (this._persistQuery === undefined) {
    		this._persistQuery = {};
    	}
    	this._persistQuery['PQV' + name] = value;
    	this.queryParams[name] = value;
    };

    SessionManager.prototype.getQueryVar = function(name) {
    	var result = undefined;
    	if (this._persistQuery !== undefined) {
    		result = this._persistQuery['PQV' + name];
    	}
		if (result === undefined) {
			if (this.queryParams) {
				result = this.queryParams[name];
			}
		}
    	return result;
    };

    SessionManager.prototype.eraseQueryVar = function(name) {
    	if (name === undefined) {
    		this._persistQuery = undefined;
    	}
    	else if (this._persistQuery !== undefined) {
    		this._persistQuery[name] = undefined;
    	}
    };

    /**
     * Set a persistent variable value. This will use one of three mechanisms
     * to persist the name/value pair, depending on what the browser supports.
     * These are localStorage, cookies, and query parameters. If localStorage
     * is used, the variable will be persisted until it is removed. If cookies
     * are used, it will expire in one day. If a query parameter is used, it
     * will persist as long as the query parameters are propagated to the
     * next page.
     *
     * @param {String} name the variable name
     * @param {String} value the variable value
     */
    SessionManager.prototype.setVar = function(name, value) {
    	if (this.haveLocalVars()) {
    		this.setLocalVar(name, value);
    	}
    	else if (this.areCookiesEnabled()) {
    		this.createCookie(name, value, 1);
    	}
    	else {
    		this.setQueryVar(name, value);
    	}
    };

    /**
     * Get the value of a variable previously saved using setVar().
     *
     * @param {String} name the variable name
     * @returns {String|undefined} the variable value
     */
    SessionManager.prototype.getVar = function(name) {
    	var v = undefined;
    	if (this.haveLocalVars()) {
    		v = this.getLocalVar(name);
    	}
    	else if (this.areCookiesEnabled()) {
    		v = this.readCookie(name);
    	}
    	else {
    		v = this.getParameter(name);
    	}
    	if (v === null) v = undefined;
    	return v;
    };

    /**
     * Erase a variable. If the name of the variable is not specified, all
     * variables in the first supported persistence mechanism are cleared.
     *
     * @param {String} [name] the variable name
     */
    SessionManager.prototype.eraseVar = function(name) {
    	if (this.haveLocalVars()) {
    		this.eraseLocalVar(name);
    	}
    	else if (this.areCookiesEnabled()) {
    		this.eraseCookie(name);
    	}
    	else {
    		this.eraseQueryVar(name);
    	}
    };

	SessionManager.prototype._extractQuery = function() {
	    this.queryParams = {};
	    var search = window.location.search;
	    if (search && (search.length > 1)) {
	        search = search.slice(1);
	        var pairs = search.split('&'),
	        	qparams = {};
	        $.each(pairs, $.proxy(function(i, s) {
	            var nvpair = s.split('='),
	            	key = decodeURIComponent(nvpair[0]),
	                vs = nvpair[1],
	                v = '';
	            if (vs && (vs.length > 0)) {
	            	vs = decodeURIComponent(vs);
	                if ((vs[0] === '"') || (vs[0] === '\'')) {
	                    vs = vs.substring(1, vs.length-1);
	                }
	                if (typeof vs === "boolean") {
	                    v = vs;
	                }
	                else {
	                    var n = Number(vs);
	                    v = (isNaN(n)) ? vs : n;
	                }
	            }
	            if (key.lastIndexOf('PQV', 0) === 0) {
	            	if (this._persistQuery === undefined) {
	            		this._persistQuery = {};
	            	}
	            	this._persistQuery[key] = v;
	            	key = key.substring(3, key.length);
	            }
	            qparams[key] = v;
	        }, this));
	        this.queryParams = qparams;
	        console.log('extracted query parameters');
	    }
	};

    /**
     * Get session information from the server. A session is created if it does not
     * already exist. An optional callback function is called with the retrieved
     * information. Any onReady() waiters are called with the information after that.
     * Finally the returned Promise is resolved with the information.
     *
     * @param {function} [resultFn] optional callback function (deprecated)
     * @return {Promise} promise for the session information
     */
	SessionManager.prototype.getSession = function(resultFn) {
	    // Is a getSession operation already pending?
	    if (this.getSessionPending !== undefined) {
	        var promise = this.getSessionPending.promise();
	        if (resultFn) {
	            // Promise chaining does not work with older versions of jQuery,
                // but resultFn shouldn't be returning a Promise anyway.
	            return promise.then(resultFn);
            }
            // Return a Promise for the completion of the active operation.
            return promise;
        }
        var getSessionPending = $.Deferred();
	    this.getSessionPending = getSessionPending;
		var cs = document.cookie;
		if (cs) {
			console.log('document.cookie=' + document.cookie);
			var sid = cs.match(/JSESSIONID=(.*?)(;|$)/);
			if (sid) {
				console.log('found: ' + sid[0]);
			}
		}
		this._extractQuery();
		var url = this.getContextRoot('?api=user'),
			req = {
				op : 'getsession',
				page : window.location.href
			};
		this.postJSON(url, req, $.proxy(function(obj) {
		    var deferred = this.getSessionPending;
		    this.getSessionPending = undefined;
			this.sessionId = obj.sessionid;
			this.sessionInfo = obj;
			if (typeof obj.contextPath === 'string') {
			    this.contextRoot = obj.contextPath;
			    if (this.contextRoot[this.contextRoot.length - 1] !== '/') {
			        this.contextRoot += '/';
			    }
			}
			if (resultFn) {
			    resultFn(obj);
            }
			for (var i = 0; i < this.readyWaiters.length; ++i) {
				this.readyWaiters[i](obj);
			}
			this.readyWaiters = [];
			deferred.resolve(this.sessionInfo);
		}, this), function(obj) {
		    var deferred = this.getSessionPending;
		    this.getSessionPending = undefined;
		    // This alert should be the caller's responsibility
			alert('failed get session from server');
			deferred.reject(obj);
		});
		return getSessionPending.promise();
	};

    /**
     * Enable or disable keep-alive for the session. When keep alive is enabled,
     * a {@link getSession} operation is periodically performed. Enabling
     * keep-alive always causes an immediate getSession operation, even if
     * keep-alive was already enabled, unless a getSession operation is already
     * pending. It returns a promise for the completion
     * of this getSession. Nothing is returned when disabling keep-alive.
     *
     * @param {boolean} enable true to enable keep-alive, false to disable
     * @param {number} timeout time interval between getSession operations, in
     *                 milliseconds, defaulting to 15 minutes
     * @return {Promise|undefined} a Promise for the first getSession if enable=true
     */
	SessionManager.prototype.setKeepAlive = function(enable, timeout) {
	    function KeepAliveObject(session, timeout) {
	        this.session = session;
            this.timeout = timeout;
            this.enabled = true;
            this.timer = undefined;
        }
        KeepAliveObject.prototype.handler = function() {
	        this.timer = undefined;
	        this.promise = this.session.getSession();
	        this.promise.then(
	            $.proxy(function() {
	                if (this.enabled) {
	                    this.timer = setTimeout($.proxy(this.handler, this), this.timeout);
                    }
                }, this),
                $.proxy(function() {
                    if (this.enabled) {
                        this.timer = setTimeout($.proxy(this.handler, this), 60*1000);
                    }
                }, this)
            );
	        return this.promise;
        };
	    KeepAliveObject.prototype.disable = function() {
	        this.enabled = false;
	        if (this.timer !== undefined) {
	            clearTimeout(this.timer);
	            this.timer = undefined;
            }
        };
        // Always disable any existing KeepAliveObject first.
        if (this._keepAliveTimeout !== undefined) {
            this._keepAliveTimeout.disable();
            this._keepAliveTimeout = undefined;
        }
        if (enable) {
            this._keepAliveTimeout = new KeepAliveObject(this, timeout || (15*60*1000));
            return this._keepAliveTimeout.handler();
        }
    };

    SessionManager.prototype.getUser = function() {
        return (this.sessionInfo) ? this.sessionInfo.user : undefined;
    };

	SessionManager.prototype.setgroup = function(obj) {
		var gin = $('input[name="group"]');
		if (gin.length > 0) {
			$.extend(obj, { group: gin.val() });
		}
		else {
			gin = $('input[name="gid"]');
			if (gin.length > 0) {
				var gid = parseInt(gin.val());
				if (!isNaN(gid)) {
					$.extend(obj, { gid: gid });
				}
			}
		}
		return obj;
	};
	
	SessionManager.prototype.getCurrentGroupId = function() {
		if (this.sessionInfo && this.sessionInfo.cgid) {
			return this.sessionInfo.cgid;
		}
		return undefined;
	};

	SessionManager.prototype.getCurrentGroup = function() {
		if (this.sessionInfo && this.sessionInfo.cgid) {
			var groups = this.sessionInfo.groups;
			for (var i = 0; i < groups.length; ++i) {
				if (Number(groups[i].gid) === Number(this.sessionInfo.cgid)) return groups[i];
			}
		}
		return undefined;
	};
	    
	SessionManager.prototype.getLoginGroup = function() {
        return (this.sessionInfo) ? this.sessionInfo.logingroup : undefined;
    };

	SessionManager.prototype.getGroups = function() {
		if (this.sessionInfo)
			return this.sessionInfo.groups;
		return undefined;
	};

	SessionManager.prototype.isLoggedIn = function() {
        return (this.sessionInfo) ? (this.sessionInfo.logintype !== 'none') : undefined;
    };

	/**
	 * Check whether the current user is a member of any of the groups specified
	 * as arguments. Currently this matches only against the group name, which is
	 * the last component of a pathname for the group.
	 * 
	 * @param {String...} group one or more group names for which to check membership
	 * @returns {boolean} true if the user is a member of any of the specified groups
	 */
	SessionManager.prototype.isMember = function(group) {
	    if (this.sessionInfo) {
	        var groups = this.sessionInfo.groups,
	            args = Array.prototype.slice.call(arguments, 0);
	        for (var i = 0; i < groups.length; ++i) {
                var cgroup = groups[i];
	        	for (var j = 0; j < args.length; ++j) {
                    var test = args[j];
                    if (test.charAt(0) === '/') {
                        for (var k = 0; k < cgroup.paths.length; ++k) {
                            if (cgroup.paths[k] === test) {
                                return true;
                            }
                        }
                    }
	        		else if (cgroup.member && (cgroup.name === args[j])) {
	        			return true;
	        		}
	        	}
	        }
	        return false;
	    }
	};
	
	SessionManager.prototype.getUser = function() {
		if (this.sessionInfo)
			return this.sessionInfo.user;
		return undefined;
	};
	
	SessionManager.prototype.onReady = function(readyFn) {
		if (this.sessionId !== null) {
			readyFn(this.sessionInfo);
		}
		else {
			this.readyWaiters[this.readyWaiters.length] = readyFn;
		}
	};
	
	SessionManager.prototype.getPageName = function() {
		var path = window.location.pathname,
			istart = path.lastIndexOf('/'),
			iend = path.lastIndexOf('.');
		if (istart < 0) istart = 0;
		else ++istart;
		if (iend < 0) iend = path.length;
		return path.substring(istart, iend);
	};
	
	/**
	 * Queue a callback on the server queue, optionally returning a promise
	 * that is resolved after the queued callback has been dequeued and executed.
	 * Any .done callbacks set on the returned promise are called with the
	 * return value of the queued function as the argument.
	 * 
	 * @param {Function} fn the function to be queued
	 * @param {boolean} withDeferred true if a returned promise is desired
	 * @returns undefined or a promise
	 */
	SessionManager.prototype.queue = function(fn, withDeferred) {
		var ready = (this.serverQueue.length === 0) && (this.ajaxPendingCount === 0),
		    deferred = (withDeferred) ? $.Deferred() : undefined;
		if (ready) {
		    if (deferred) {
		        deferred.resolve(fn());
		    }
		    else fn();
		}
		else if (deferred) {
		    this.serverQueue.push(function() {
		        deferred.resolve(fn());
		    });
		}
		else this.serverQueue.push(fn);

		return (deferred) ? deferred.promise() : undefined;
	};
	
	/**
	 * Queue on the server queue a function that returns a promise when it is
	 * dequeued and called. Return a promise that is resolved/rejected when
	 * the promise returned by the function is resolved/rejected.
	 * 
	 * @param {function} fn the function to be queued, which should return a
	 *                      promise
	 * @returns a promise that tracks the queued function's promise
	 */
	SessionManager.prototype.queueDeferred = function(fn) {
	    var deferred = $.Deferred($.proxy(function(d) {
	        this.queue(function() {
    	        var dfn = fn();
    	        dfn.done($.proxy(function() {
    	            var args = Array.prototype.slice.call(arguments, 0);
    	            d.resolveWith(this, args);
    	        }, this)).fail($.proxy(function() {
                    var args = Array.prototype.slice.call(arguments, 0);
    	            d.rejectWith(this, args);
    	        }, this));
	        }, false);
	    }, this));
	    return deferred.promise();
	};
	
	/**
	 * Queue a redirect to another page to happen after other server activity finishes.
	 * Mainly this is used when there may be outstanding Ajax calls to the server.
	 * The caller can specify an optional array of modes, as defined by choice-control.js,
	 * in which to do the redirect. The default is to redirect only in 'normal' mode
	 * (and not in 'debug' mode).
	 * 
	 * @param {String} url			the URL for the redirect
	 * @param {String[]} modes	    optional modes in which to redirect
	 */
	SessionManager.prototype.queuedRedirect = function(url, modes) {
		var doit = true;
		// Since choice-control is not required by choice-session, it may not be present
		if ($.control !== undefined) {
			var curmode = $.control('getMode');
			modes = modes || ['normal'];
			doit = ($.inArray(curmode, modes) >= 0);
		}
		if (doit) {
			if (this._persistQuery !== undefined) {
				var delim = '?';
				if (url.indexOf('?') >= 0) delim = '&';
				for (var key in this._persistQuery) {
					if (this._persistQuery.hasOwnProperty(key)) {
						url += delim + key + '=' + this._persistQuery[key];
					}
				}
			}
			var qfn = $.proxy(function() {
				window.location.replace(url);
			}, this);
			this.queue(qfn, false);
		}
	};
	
	SessionManager.prototype.nextPage = function(altPage) {
        if ($.control !== undefined) {
            if ($.control('getMode') !== 'normal') {
                return;
            }
        }
        // This function does client-side scripting if server-side scripting
        // doesn't produce a next page.
        var clientNextPage = $.proxy(function() {
            var scriptPage = this.getVar('scriptPage');
            if (scriptPage !== undefined) {
                var pageIndex = Number(this.getVar('page'));
                if (isNaN(pageIndex)) {
                    pageIndex = 0;
                }
                pageIndex += 1;
                this.setVar('page', pageIndex);
                this.queuedRedirect(scriptPage);
            }
            else if (altPage) {
                if (altPage !== 'none') {
                    this.queuedRedirect(altPage);
                }
            }
            else {
                alert('next page missing');
            }
        }, this);
        // Try for the next page in a server-side script
        var promise = this.postJSON(this.getContextRoot('?api=file'), {
            op: 'lua',
            path: '/lua/getpage.lua',
            asOwner: true,
            args: ['next']
        });
        promise.done($.proxy(function(result) {
            if (result.status === 1) {
                // Got a page from a server script
                this.queuedRedirect(result.result);
            }
            else {
                // Fall back to client-side scripting
                clientNextPage();
            }
        }, this));
        promise.fail(function() { clientNextPage(); })
	};

    SessionManager.defaults = {};

    SessionManager.defaults.openLog = {
        op: 'create',
        id: 'log',
        kind: 'logger',
        mimetype: 'text/plain',
        append: true
    };

    SessionManager.prototype.openLog = function(reqobj, options) {
        return(this.doSessionOp($.extend({}, SessionManager.defaults.openLog, reqobj), options));
    };

    SessionManager.defaults.log = {
        op: 'put',
        id: 'log',
        kind: 'logger'
    };

    SessionManager.prototype.log = function(reqobj, options) {
        return(this.doSessionOp($.extend({}, SessionManager.defaults.log, reqobj), options));
    };

    SessionManager.defaults.closeLog = {
        op: 'close',
        id: 'log',
        kind: 'logger'
    };

    SessionManager.prototype.closeLog = function(reqobj, options) {
        return(this.doSessionOp($.extend({}, SessionManager.defaults.closeLog, reqobj), options));
    };

    SessionManager.prototype.doSessionOp = function(reqobj, options) {
        options = $.extend({}, {
            type : 'POST',
            dataType : 'json',
            contentType : 'application/json; charset=utf-8',
            async: true,
            global: false,
            data: JSON.stringify(reqobj)
        }, options || {});
        var jqxhr = $.session('ajax', this.getContextRoot('?api=session'), options);
        this.setFail(jqxhr, reqobj);
        return jqxhr;
    };

    SessionManager.prototype.setFail = function(jqxhr, reqobj) {
        jqxhr.fail(function() {
            console.log('Session operation ' + reqobj.op + ' failed');
        });
    };

	var ajaxdefaults = {
			type : 'POST',
			dataType : 'json',
			contentType : 'application/json; charset=utf-8',
			async: true,
			global: false
		},
		ajaxsettings = ajaxdefaults;
	
	SessionManager.prototype.ajaxSetup = function(options) {
		if (arguments.length === 0) {
			ajaxsettings = ajaxdefaults;
			return;
		}
		
		if (ajaxsettings === ajaxdefaults) {
			ajaxsettings = $.extend({}, ajaxdefaults);
		}
		$.extend(ajaxsettings, options);
		return ajaxsettings;
	};
	
	SessionManager.prototype.ajax = function(url, options) {
        if (typeof url === 'object') {
            options = url;
            url = undefined;
        }
        
        options = options || {};
        
        var deferred = $.Deferred(function(d) {
            var proxyXHR = {

                readyState: 0,

                // Caches the header
                setRequestHeader: function(name, value) {
                    if (d._jqXHR) {
                        d._jqXHR.setRequestHeader(name, value);
                    }
                    return this;
                },

                // Raw string
                getAllResponseHeaders: function() {
                    return (d._jqXHR) ? d._jqXHR.getAllResponseHeaders() : null;
                },

                // Builds headers hashtable if needed
                getResponseHeader: function(key) {
                    return (d._jqXHR) ? d._jqXHR.getResponseHeader(key) : null;
                },

                // Overrides response content-type header
                overrideMimeType: function(type) {
                    if (d._jqXHR) {
                        d._jqXHR.overrideMimeType(type);
                    }
                    return this;
                },

                // Cancel the request
                abort: function(statusText) {
                    if (d._jqXHR) {
                        d._jqXHR.abort(statusText);
                    }
                    else {
                        d._statusText = statusText || "abort";
                    }
                    return this;
                }
            };
            
            d.promise(proxyXHR);
            proxyXHR.success = proxyXHR.done;
            proxyXHR.error = proxyXHR.fail;
            
            d.proxyXHR = proxyXHR;
            d._setXHR = function(jqXHR) {
                d._jqXHR = jqXHR;
                // Check for a previous abort
                if (d._statusText) {
                    jqXHR.abort(d._statusText);
                } 
            };
        });

        /** @function bfsend */
        var bfsend = options.beforeSend || $.noop;
        options.beforeSend = function(jqXHR, settings) {
            deferred._setXHR(jqXHR);
            /** @name {Object} context */
            var context = settings.context || settings;
            bfsend.call(context, deferred.promise(), settings);
        };
        
        this.queue($.proxy(function() {
            this.ajaxPendingCount += 1;
            if (this.ajaxPendingCount > 1) {
                console.warn('how did this happen?');
            }
            var proxyXHR = deferred.proxyXHR,
                jqXHR = $.ajax(url, options);
            proxyXHR.readyState = jqXHR.readyState;
            jqXHR.always($.proxy(function() {
				this.ajaxPendingCount -= 1;
				if (this.serverQueue.length > 0) {
				    /** @function fn */
					var fn = this.serverQueue.shift();
					if (fn) fn.call(this);
				}
				/** @name {*[]} arguments */
                var args = Array.prototype.slice.call(arguments, 0),
                    context = options.context || proxyXHR;
                proxyXHR.readyState = jqXHR.readyState;
                if (jqXHR.state() === 'resolved') {
                    deferred.resolveWith(context, args);
                }
                else {
                    deferred.rejectWith(context, args);
                }
            }, this));
        }, this), false);
        
        return deferred.proxyXHR;
	};
	
	SessionManager.prototype.postJSON = function(url, json, success, failure) {
		if (!failure) {
			failure = function(jqXHR, textStatus, errorThrown) {
				alert('Server operation failed: ' + textStatus);
			};
		}
		if (typeof json !== 'string') {
			json = JSON.stringify(json);
		}
		var ajaxopts = $.extend({
			url : url,
			data : json,
			success : success,
			error : failure
		}, ajaxsettings);
	
		return this.ajax(url, ajaxopts);
	};
	
	/**
	 * Validate a user id
	 * 
	 * Checks whether a specified user id is valid, and if so, whether it is a known
	 * user.
	 * 
	 * resultFn - function to be called with result object from server userid - the
	 * user id to be checked
	 * 
	 * The result object contains an integer 'status' field. Negative values
	 * indicate an invalid user id. Zero indicates a valid user id that is not a
	 * known user. Other positive values indicate a known user id.
	 */
	SessionManager.prototype.validateUserId = function(resultFn, userid, groupid) {
		var url = this.getContextRoot('?api=user'), parms = {
			op : 'validate',
			'username' : userid
		};
		if (groupid) {
			parms['gid'] = groupid;
		}
		console.log('url is ' + url);
		this.postJSON(url, parms, resultFn);
	};
	
	SessionManager.prototype.logoutUser = function(resultFn) {
		return this.postJSON(this.getContextRoot('?api=user'), {
			op : 'logout'
		}, resultFn);
	};

	SessionManager.prototype.extend = function(methods) {
		$.extend(this, methods);
	};
	
	var choiceSession = new SessionManager();
	if ($.session !== undefined) {
		alert('jQuery conflict on "session" plugin');
		return;
	}
	$.extend({
		session: function(method) {
			if (choiceSession[method]) {
				return choiceSession[method].apply( choiceSession, Array.prototype.slice.call( arguments, 1 ));
			}
			throw new Error('No SessionManager method ' + method);
		}
	});
	
	// Page ready actions
	$(function () {
		// Get the session id, check for redirect
		$.session('getSession', function(result) {
			console.log("Session id from server: " + $.session('getSessionId'));
			var redirect = result.redirect;
			if (redirect) {
				$.session('queuedRedirect', redirect);
			}
	/*		else if ($('.choice-quiz').length != 0) {
				$.getScript('scripts/quiz.js', function() {});
			}
	*/	});
	});
});

