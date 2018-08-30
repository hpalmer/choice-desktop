/**
 * Group operations are generally invoked with a request object containing
 * parameters for a particular operation. The operation is performed via a
 * jQuery Ajax operation to the server, which returns a promise object.
 * The caller can attach callback handlers to the promise, which are called
 * when the promise is resolved, i.e. when the Ajax operation completes.
 * The server's response to the operation is contained in the 'data'
 * argument that is passed to the promise done() callback.
 * 
 * Group operations can be accessed through the returned module handle, or
 * via the jQuery 'group' plugin:
 * @example
 * var jqxhr = $.group('lsusers', '/System/Users')
 * 
 * @namespace group
 */
define(['jquery', 'core/choice-session'], function() {
    
    /**
     * @constructor
     * 
     */
    function GroupOps() {
        $.session('onReady', $.proxy(function() {
            this.url = $.session('getContextRoot');
        }, this));
    }
    
    GroupOps.defaults = {};
    
    /**
     * Create a new group, given the file path of the group. An optional description
     * of the group may also be specified.
     *
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *      @property {String} [desc] group description, if specified
     *      @property {Boolean} login true if login is enabled for the group
     *      @property {Boolean} signup true if self-registration is enabled for the group
     *      @property {Boolean} captcha true if captcha should be used during user registration
     *      @property {String} name the name of the group within its container
     *      @property {String} path the full file path of the group
     *      @property {Array{String}} paths all the file paths of the group (should be just the one)
     *      @property {Number} id the unique resource id of the group
     *      @property {String} owner the name of the owner of the group (should be current user)
     *      @property {Number} ownerId the unique id of the group owner
     *      @property {Number} refcount number of references to the group (should be one)
     *      @property {Number} crtime group creation time timestamp
     *      @property {Number} mtime group modification time timestamp
     *      @property {String} mimetype MIME type of group (choice/group)
     *      @property {Number} size size of group settings file
     *
     * @param {String} group the full file path of the group to be created (all but
     *                       the last component of the path must already exist)
     * @param {String} [desc] an optional string describing the group
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.create = function(group, desc) {
        return this.post({ op: 'create', group: group, desc: desc });
    };

    /**
     * Get information on all subgroups of a group.
     *
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *      @property {Array{Object}} groups - an array of groupinfo objects for each subgroup
     *
     *      @namespace groupinfo
     *      @property {String} [desc] - group description, if specified
     *      @property {Boolean} login - true if login is enabled for the group
     *      @property {Boolean} signup - true if self-registration is enabled for the group
     *      @property {Boolean} captcha - true if captcha should be used during user registration
     *      @property {String} name - the name of the group within its container
     *      @property {String} path - the full file path of the group
     *      @property {Array{String}} paths - all the file paths of the group
     *      @property {Number} id - the unique resource id of the group
     *      @property {String} owner - the name of the owner of the group
     *      @property {Number} ownerId - the unique id of the group owner
     *      @property {Number} refcount - number of references to the group
     *      @property {Number} crtime - group creation time timestamp
     *      @property {Number} mtime - group modification time timestamp
     *      @property {String} mimetype - MIME type of group (choice/group)
     *      @property {Number} size - size of group settings file
     *
     * @param {String} group the full file path of the group to be created
     * @param {Boolean} [recursive] optional boolean indicating whether subgroup
     *                              descendants of the specified group should be included
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.lsgroups = function(group, recursive) {
        return this.post({ op: 'groups', group: group, recursive: recursive });
    };

    /**
     * Get information on all users in a specified group, and optionally all descendant
     * groups.
     * 
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *      @property {Array{Object}} users - an array of userinfo objects for each user
     *
     *      @namespace userinfo
     *      @property {Boolean} isLoginAllowed - true if this user has not been banned
     *      @property {String} regcode - user's registration code, if any
     *      @property {String} name - the username
     *      @property {String} path - the full file path of the user
     *      @property {Array{String}} paths - all the file paths of the user
     *      @property {Number} id - the unique resource id of the user
     *      @property {String} owner - the name of the owner of the user
     *      @property {Number} ownerId - the unique id of the user owner
     *      @property {Number} refcount - number of references to the user
     *      @property {Number} crtime - user creation time timestamp
     *      @property {Number} mtime - user modification time timestamp
     *      @property {String} mimetype - MIME type of user (choice/user)
     *      @property {Number} size - size of user settings file
     *      @property {String} username - the username if current user has access
     *      @property {String} email - email address, if any, and if the current user
     *                                 has access
     *
     * @param {String} group - full file path to a group
     * @param {Boolean} [recursive] - true if users in descendant groups should be included
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.lsusers = function(group, recursive) {
        return this.post({ op: 'users', group: group, recursive: recursive });
    };

    /**
     * Copy users from one group to another. The users remain in the original group,
     * and may be given new usernames in the target group. When specifying the file
     * path of a user, a new username can be specified by following the path with
     * ':newusername'. Otherwise the user will have the same username in the source
     * and target groups.
     *
     * IMPORTANT!! Usernames are always stored in lowercase. Generally mixed-case
     * usernames passed to the server will be converted to lowercase. But only
     * when the server can infer that they are expected to reference a user.
     *
     * An array of objects is returned upon completion of the Ajax operation, with one
     * object for each user in the specified users list. The object will be a
     * usererror object if there is an error on a particular user, or otherwise a
     * userinfo object:
     *
     *      @namespace usererror
     *      @property {Number} status - -1, indicating failure
     *      @property {String} msg - error message
     *      @property {String} user - username (could be source group or target group
     *                                username, depending on error
     *
     *      @namespace userinfo
     *      @property {Number} status - +1, indicating success
     *      @property {Boolean} isLoginAllowed - true if this user has not been banned
     *      @property {String} regcode - user's registration code, if any
     *      @property {String} name - the username
     *      @property {String} path - the full file path of the user
     *      @property {Array{String}} paths - all the file paths of the user
     *      @property {Number} id - the unique resource id of the user
     *      @property {String} owner - the name of the owner of the user
     *      @property {Number} ownerId - the unique id of the user owner
     *      @property {Number} refcount - number of references to the user
     *      @property {Number} crtime - user creation time timestamp
     *      @property {Number} mtime - user modification time timestamp
     *      @property {String} mimetype - MIME type of user (choice/user)
     *      @property {Number} size - size of user settings file
     *      @property {String} username - the username if current user has access
     *      @property {String} email - email address, if any, and if the current user
     *                                 has access
     *
     * @param {String} group - full file path of the target group
     * @param {Array{String}} users - array of full file paths of users to be added
     *                                to the target group
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.addUsers = function(group, users) {
        return this.post({ op: 'addusers', group: group, users: users })
    };

    /**
     * Remove users from a group. The users may continue to exist as members of other
     * groups.
     * 
     * An array of objects is returned upon completion of the Ajax operation, with one
     * object for each user in the specified users list:
     *
     *      @namespace userresult
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} user - the username
     *      @property {String} msg - error message if status == -1
     *      @property {Boolean} result - true if the user was removed, and is not a
     *                                   member of any other groups
     *
     * @param {String} group - the full file path of the group
     * @param {Array{String}} users - an array of usernames to remove from the group
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.rmusers = function(group, users) {
        return this.post({ op: 'remusers', group: group, users: users });
    };

    /**
     * Remove a user group. Optionally all user and group descendants of the group
     * can be recursively removed. If that option is not specified, the group must
     * be empty.
     *
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *
     * @param {String} group - full file path of group to be removed
     * @param {Boolean} [recursive] - true if all user and group descendants of the group
     *                                should also be removed
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.rmgroup = function(group, recursive) {
        return this.post({ op: 'remgroup', group: group, recursive: recursive });
    };

    /**
     * Copy users from one group to another. The users remain in the original group,
     * and may be given new usernames in the target group. This is like addUsers, but
     * takes somewhat different arguments.
     *
     *
     * IMPORTANT!! Usernames are always stored in lowercase. Generally mixed-case
     * usernames passed to the server will be converted to lowercase. But only
     * when the server can infer that they are expected to reference a user.
     *
     * An array of objects is returned upon completion of the Ajax operation, with one
     * object for each user in the specified users list:
     *
     *      @namespace userresult
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *      @property {String} user - username (could be source group or target group
     *                                username, depending on error
     *      @property {Object} info - target user information if status == 1
     *
     *      @namespace userinfo
     *      @property {Boolean} isLoginAllowed - true if this user has not been banned
     *      @property {String} regcode - user's registration code, if any
     *      @property {String} name - the username
     *      @property {String} path - the full file path of the user
     *      @property {Array{String}} paths - all the file paths of the user
     *      @property {Number} id - the unique resource id of the user
     *      @property {String} owner - the name of the owner of the user
     *      @property {Number} ownerId - the unique id of the user owner
     *      @property {Number} refcount - number of references to the user
     *      @property {Number} crtime - user creation time timestamp
     *      @property {Number} mtime - user modification time timestamp
     *      @property {String} mimetype - MIME type of user (choice/user)
     *      @property {Number} size - size of user settings file
     *      @property {String} username - the username if current user has access
     *      @property {String} email - email address, if any, and if the current user
     *                                 has access
     *
     * @param {String} dstgroup - full file path to the target group
     * @param {String} srcgroup - full file path to the source group
     * @param {Array{String}} users - usernames in source group to be copied to
     *                                target group
     * @param {Object} [rename] - an object containing usernames in the source
     *                            group as properties, and corresponding usernames
     *                            in the target group as their values. Source usernames
     *                            not present have the same username in the target group.
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.copyUsers = function(dstgroup, srcgroup, users, rename) {
        return this.post({ op: 'copyusers', dstgroup: dstgroup, srcgroup: srcgroup, users: users, rename: rename });
    };

    /**
     * Move a user group from one filesystem container to another. The group may be given
     * a new name in the target container. Typically the container will be another user
     * group or a folder.
     *
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *
     * @param {String} dstpath - full file path to the target group. If the last component
     *                           of the path does not exist, it is assumed to be the new name
     *                           of the moved user group. If the full dstpath exists and is a
     *                           container, the source group will have the same name in its
     *                           new location.
     * @param {String} srcgroup - the full file path to the group to be moved
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.moveGroup = function(dstpath, srcgroup) {
        return this.post({ op: 'move', dstpath: dstpath, srcgroup: srcgroup });
    };

    /**
     * Change a group setting. The available settings are:
     *
     *      @namespace groupsettings
     *      @property {Boolean} login - true if logins are enabled for the group
     *      @property {Boolean} signup - true if self-registration of users is enabled
     *      @property {Boolean} captcha - true if captcha should be used during
     *                                    self-registration
     *      @property {String} home - URL of a home page for the group, relative to
     *                                the context root
     *      @property {String} guest - URL of a guest (or login) page for the group,
     *                                 relative to the context root
     *
     * For boolean attributes, non-zero numeric values are true,
     * string values of "on" or "yes" are true, and "off" or "no" are false.
     *
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *
     * @param {String} group - full file path of the group
     * @param {String} name - the name of the setting to be changed
     * @param {Boolean|String} value - the new value for the setting
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.set = function(group, name, value) {
        var attrs = [];
        for (var i = 1; i < arguments.length; ++i) {
            var aname = arguments[i];
            var avalue;
            if ($.isArray(aname)) {
                attrs = attrs.concat(aname);
            }
            else {
                avalue = null;
                if (++i < arguments.length) {
                    avalue = arguments[i];
                }
                attrs.push({ name: aname, value: avalue });
            }
        }
        return this.post({ op: 'gattr', group: group, attrs: attrs });
    };

    /**
     * Assign the current user to a subgroup of their current group, based on a distribution
     * which assigns weights to subgroups. If a distribution is not specified, all subgroups
     * are equally weighted. Over time, the fraction of users assigned to a subgroup will be
     * equal to its weight divided by the sum of the weights for all subgroups.
     *
     * An object is returned upon completion of the Ajax operation, containing:
     *
     *      @namespace result
     *      @property {Number} status - 1 indicates success, -1 failure
     *      @property {String} msg - error message if status == -1
     *      @property {String} username - the current user username
     *      @property {String} group - the assigned subgroup name
     *      @property {Number} gid - the unique resource id of the assigned subgroup
     *
     * @param {Array{Object}} [dist] - an optional array of objects specifying a distribution.
     *                                 Each object contains:
     *                                      @namespace dist
     *                                      @property {String} name - the name of a subgroup
     *                                      @property {Int} weight - the subgroup weight
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.assignSubgroup = function(dist) {
        return this.post({ op: 'asub', dist: dist });
    };

    /**
     * Create a user in a group. This is an administrative operation which requires the
     * logged in user associated with the current session to have appropriate access
     * rights to the group in which the user is being created.
     *
     * The group can be specified by either the 'group' or the 'gid' arguments, or
     * by both if they refer to the same group. The group must be specified.
     * 
     *
     *
     * @param {String} username - the username to be created
     * @param {String} [password] - a password for the new user
     * @param {String} [email] - the new user's email address
     * @param {String} [regcode] - a registration code for the new user
     * @param {String} [group] - the full file path of the group to contain the user
     * @param {Number} [gid] - the group id of the group to contain the user
     * @returns a jqXHR-like object, including the promise() API
     */
    GroupOps.prototype.mkuser = function(username, password, email, regcode, group, gid) {
        var reqobj = {
            op: 'mkuser',
            username: username,
            password: password,
            email: email,
            regcode: regcode,
            group: group,
            gid: gid
        };
        return this.post(reqobj, undefined, 'user');
    };
    

    GroupOps.prototype.setFail = function(jqxhr, reqobj) {
        jqxhr.fail(function() {
            console.log('Group operation ' + reqobj.op + ' failed');
        });
    };

    GroupOps.prototype.post = function(reqobj, options, api) {
        api = api || 'group';
        options = $.extend({}, {
                type : 'POST',
                dataType : 'json',
                contentType : 'application/json; charset=utf-8',
                async: true,
                global: false,
                data: JSON.stringify(reqobj)
            }, options || {});
        var jqxhr = $.session('ajax', this.url + '?api=' + api, options);
        this.setFail(jqxhr, reqobj);
        return jqxhr;
    };

    var choiceGroupOps = new GroupOps();
    if ($.group !== undefined) {
        alert('jQuery conflict on "group" plugin');
        return;
    }
    $.extend({
        group: function(method) {
            if (choiceGroupOps[method]) {
                return choiceGroupOps[method].apply( choiceGroupOps, Array.prototype.slice.call( arguments, 1 ));
            }
            throw new Error('No GroupOps method ' + method);
        }
    });
    
    return choiceGroupOps;
});

