/**
 * File operations are generally invoked with a request object containing
 * parameters for a particular operation. The operation is performed via an Ajax
 * operation to the server, which returns a result object.
 * 
 * File operations are accessed through the jQuery 'file' plugin:
 * @example
 * var jqxhr = $.file('ls', reqobj, options)
 * 
 * @namespace file
 */
define(['jquery', 'core/choice-session'], function() {
    /**
     * @constructor
     * 
     */
    function FileOps() {
        $.session('onReady', $.proxy(function() {
            this.url = $.session('getContextRoot');
        }, this));
    }
    
    FileOps.defaults = {};
    
    FileOps.defaults.ls = {
        op: 'list',
        path: '/',
        folder: false
    };
    
    /**
     * Directory list.
     * 
     * The request object should contain a 'path' property, which specifies the
     * full path to the file to be listed. A 'folder' property with a boolean
     * value may also be included in the request object. If the specified file
     * is a container, and 'folder' is true, then information about the file
     * itself is returned, rather than a listing of its contents. (This is
     * similar to the function of the -d switch on the Linux ls command.)
     * 
     * @function file#ls
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.ls = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.ls, reqobj), options);
    };
    
    FileOps.defaults.lookup = {
        op: 'lookup'
    };
    
    /**
     * File lookup.
     * 
     * The request object can specify a file by either its path or its unique
     * numeric id, as 'path' and 'id', respectively. This operation returns an
     * object containing more detailed attributes than the 'ls' operation.
     * 
     * @function file#lookup
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.lookup = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.lookup, reqobj), options);
    };

    FileOps.defaults.mtlist = {
        op: 'mtlist'
    };

    /**
     * MIME type file list.
     *
     * List files of a specified MIME type. The request object fields are:
     *
     *      mimetype {String} the MIME type to list
     *      [path] {String} an optional path to limit the list to a subtree
     *
     * If the path is not specified, all files of the given MIME type to which the
     * current user has access are returned in an 'ls' style list.
     *
     * The response object contains:
     *
     *      status {Number} > 0 indicates success
     *                      < 0 indicates error
     *      [msg] {String} error message if status < 0
     *      files {Array{Object}} list of objects, one for each file
     *
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.mtlist = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mtlist, reqobj), options);
    };

    FileOps.defaults.mkdir = {
        op: 'mkdir'
    };
    
    /**
     * Make directory.
     * 
     * The request object contains a 'path' property specifying the path to a directory
     * that is to be created. It may also specify a boolean property, 'recursive', as
     * true to create all the components of a directory path, similar to the -p switch
     * on the Linux mkdir command.
     * 
     * @function file#mkdir
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.mkdir = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mkdir, reqobj), options);
    };
    
    FileOps.defaults.mkjar = {
        op: 'mkjar'
    };
    
    /**
     * Make a jar file.
     * 
     * The request object contains an 'inpath' property that specifies the path to a
     * file or folder to be added to a jar file. The 'outpath' property specifies the
     * path to the jar file to be created. An optional boolean property, 'fentry',
     * should be true if the input file is a folder and an entry for the folder
     * name should be included in the jar file.
     * 
     * @function file#mkjar
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.mkjar = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mkjar, reqobj), options);
    };
    
    FileOps.defaults.mklib = {
        op: 'mklib'
    };
    
    /**
     * Make a library.
     * 
     * A library is a special kind of folder (choice/library) that contains published
     * software components. The request object currently has a single property,
     * 'libpath', which specifies the path to the library to be created.
     * 
     * @function file#mklib
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.mklib = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mklib, reqobj), options);
    };
    
    FileOps.defaults.publish = {
        op: 'publish'
    };
    
    FileOps.prototype.publish = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.publish, reqobj), options);
    };
    
    FileOps.defaults.rm = {
        op: 'rm',
        recursive: false
    };
    
    /**
     * Remove file.
     * 
     * This removes a file specify by the 'path' property of the request object. It
     * can be used to remove normal files or directories. However, a directory will
     * not be removed unless it is empty, or 'recursive' is specified as true in the
     * request object. For normal files the setting of 'recursive' is irrelevant.
     * 
     * @function file#rm
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.rm = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.rm, reqobj), options);
    };

    FileOps.defaults.link = {
        op: 'link',
        rename: false
    };

    /**
     * Link a file to a new name, retaining the old name.
     *
     * This creates a new filename that references an existing file. The new filename
     * may be specified as a full path, in which case the target folder must already
     * exist. Or the new filename may be just a single name component, which is taken
     * to be the name to be given the file in the folder containing the source file.
     *
     * The required parameters in the request object are:
     *
     *      srcpath {String} the full path to the existing file to be linked
     *      dstpath {String} the full path for the link to be created, or a single
     *                       name component to create a link in the source file folder
     *
     * The request object may also contain:
     *
     *      rename {Boolean} true if this is a rename operation, which means the
     *                       srcpath will be unlinked if the link to dstpath is
     *                       successful
     *
     * @function file#link
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.link = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.link, reqobj), options);
    };

    /**
     * Rename a file.
     *
     * This is simply a call to link() with 'rename' set in the request object.
     */
    FileOps.prototype.mv = function(reqobj, options) {
        return this.link($.extend({}, reqobj, { rename: true }), options);
    };

    FileOps.defaults.save = {
        op: 'save',
        mimetype: "text/plain"
    };

    /**
     * Save a string in a file. The required parameters are in the request object are:
     *
     *     name {String} the name of the file to contain the string
     *     data {String} the string to be written to the file
     *
     * The request object may also contain:
     *
     *     todir {String} the file path to the folder to contain the file, otherwise
     *                    defaulting to a temporary file folder for the current user
     *     mimetype {String} the MIME type of the file to be written, otherwise
     *                       defaulting to "text/plain"
     *     replace {Boolean} true if an existing file with the same name should be replaced
     *     append {Boolean} true if the data should be appended to any existing file.
     *                      The value of append takes precedence over the value of replace.
     *
     * @function file#save
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.save = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.save, reqobj), options);
    };

    /**
     * Save data in JSON format. The required parameters are in the request object are:
     *
     *     name {String} the name of the file to contain the string
     *     data {Object} the data to be written in JSON format to the file
     *
     * The request object may also contain:
     *
     *     todir {String} the file path to the folder to contain the file, otherwise
     *                    defaulting to a temporary file folder for the current user
     *     replace {Boolean} true if an existing file with the same name should be replaced
     *     append {Boolean} true if the data should be appended to any existing file.
     *                      The value of append takes precedence over the value of replace.
     *
     * @function file#saveJson
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.saveJson = function(reqobj, options) {
        var jsonopt = { mimetype: 'application/json' };
        reqobj = $.extend({}, FileOps.defaults.save, jsonopt, reqobj);
        if ((reqobj.data != null) && (typeof reqobj.data !== 'string')) {
            reqobj.data = JSON.stringify(reqobj.data);
        }
        return this.doFileOp(reqobj, options);
    };

    FileOps.defaults.gather = {
        op: 'gather'
    };

    /**
     * Gather data from application/json files. The path to a folder is specified.
     * The operation looks for files of type application/json in that folder, and
     * returns their contents. The operation may be recursive, and may specify
     * a timestamp.
     *
     * The request object should contain:
     *
     *      path {String} the file path of a folder
     *      [recursive] {Boolean} true if the operation should proceed recursively,
     *                            otherwise only application/json files in the specified
     *                            folder are considered
     *      [since] {Number} a timestamp to filter the files considered. Only files which
     *                       have been modified since the given timestamp are considered
     *
     * @function file#gather
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.gather = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.gather, reqobj), options);
    };

    FileOps.defaults.mkcsv = {
        op: 'mkcsv',
        headers: [],
        data: [[]]
    };
    
    /**
     * Make a CSV file.
     * 
     * The request object specifies a 2D array containing rows of data to be rendered
     * in CSV form, using the 'data' property. An optional array of strings to label
     * column headers can be specified as 'headers'. The CSV filename to be created
     * can be specified by 'name', with the default being 'data.csv'.
     * 
     * The basic function is to create the CSV file and return it as an attachment
     * to the browser. However, a 'path' property also can be included in the request
     * object, specifying a file path to an existing folder in the DB filesystem. In
     * that case, the file also will be stored on the server in the designated folder,
     * with the same name as above.
     * 
     * @function file#mkcsv
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.mkcsv = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mkcsv, reqobj), options);
    };
    
    FileOps.defaults.rdcsv = {
        op: 'rdcsv'
    };
    
    /**
     * Read a CSV file and return its contents as arrays.
     * 
     * A specified CSV file on the server is read, and returned as array of arrays,
     * one for each line of the file. The top-level array is referenced by the
     * 'data' property of the result. The result also includes a 'status' property,
     * which is a negative number if an error occurs. The path to the file is
     * also returned as the 'path' property.
     * 
     * @function file#rdcsv
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.rdcsv = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.rdcsv, reqobj), options);
    };

    FileOps.defaults.get = {
        op: 'get'
    };

    /**
     * Get a file from the server. The file can be most types, including folders.
     * If a folder is requested, it is returned as a .zip file. Plain files are
     * returned as their MIME type as stored on the server, unless overridden by
     * specifying mimeType on the request.
     *
     * The required parameters in the request object are:
     *
     *      path {String} the path to the file in the server filesystem
     *
     * If a folder is requested, the request object may contain:
     *
     *      incdir {Boolean} if true the name of folder is included in the path
     *                       names in the returned .zip file
     *
     * If a plain file is requested, the request object may contain:
     *
     *      mimeType {String} the MIME type to use in returning the file
     *
     * @function file#rdcsv
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.get = function(reqobj, options) {
        options = $.extend({}, { dataType: 'text' }, options);
        return this.doFileOp($.extend({}, FileOps.defaults.get, reqobj), options);
    };

    /**
     * Get a file containing JSON-encoded data from the server, converting it
     * back to an object. The parameters are similar to get() above, except
     * that specifying mimeType is generally going to break things.
     */
    FileOps.prototype.getJson = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.get, reqobj), options);
    };

    FileOps.defaults.mkpolicy = {
        op: 'mkpolicy'
    };

    FileOps.prototype.mkpolicy = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mkpolicy, reqobj), options);
    };

    FileOps.defaults.addrole = {
        op: 'addrole'
    };

    FileOps.prototype.addrole = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.addrole, reqobj), options);
    };

    FileOps.defaults.rmrole = {
        op: 'rmrole'
    };

    FileOps.prototype.rmrole = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.rmrole, reqobj), options);
    };

    FileOps.defaults.lspolicy = {
        op: 'lspolicy'
    };

    FileOps.prototype.lspolicy = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.lspolicy, reqobj), options);
    };

    FileOps.defaults.lsrole = {
        op: 'lsrole'
    };

    FileOps.prototype.lsrole = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.lsrole, reqobj), options);
    };

    FileOps.defaults.mkrole = {
        op: 'mkrole'
    };

    FileOps.prototype.mkrole = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mkrole, reqobj), options);
    };

    FileOps.defaults.edrole = {
        op: 'edrole'
    };

    FileOps.prototype.edrole = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.edrole, reqobj), options);
    };

    FileOps.defaults.share = {
        op: 'share'
    };

    FileOps.prototype.share = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.share, reqobj), options);
    };

    FileOps.defaults.unshare = {
        op: 'unshare'
    };

    FileOps.prototype.unshare = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.unshare, reqobj), options);
    };

    FileOps.defaults.pshare = {
        op: 'pshare'
    };

    /**
     * Attach an access control policy to a file path pattern. The policy is applied
     * lazily when a file is accessed through a path that matches the pattern, provided
     * that the principal associated with the path-based policy has the right to set
     * access control on the file being accessed. Otherwise the path-based policy is
     * ignored.
     *
     * The path may be specified as either a regular expression or file glob pattern.
     * A MIME type may also be specified, to restrict the policy to files of that type.
     *
     * The required parameters in the request object are:
     *
     *      policy {String} the file path to a policy file
     *      pattern {String} a regular expression or glob pattern, as indicated by
     *                       ptype
     *      ptype {String} the type of pattern, "regex" or "globv1"
     *
     * An optional request object parameter is:
     *
     *      mimetype {String} a MIME type
     *
     * @function file#pshare
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.pshare = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.pshare, reqobj), options);
    };

    FileOps.defaults.punshare = {
        op: 'punshare'
    };

    /**
     * Remove a path-based access control policy, identified by its unique id. The id
     * of a path-based policy can be obtained from the result of the pshare operation
     * that created it, or from an lsaccess operation on a particular file affected by
     * the policy, or by a pplist operation, which lists all the path-based policies
     * that the current user could remove.
     *
     * The only request object parameter is:
     *
     *      id {Number} the id of a path-based policy
     *
     * @function file#punshare
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.punshare = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.punshare, reqobj), options);
    };

    FileOps.defaults.pplist = {
        op: 'pplist'
    };

    /**
     * List all of the path-based policies that could be removed by the current user.
     * The response is an array of entries containing information about each such
     * path-based policy assignment, including the id values needed to remove them.
     *
     * Note that this function has no request object parameter, since the request
     * object is fixed.
     *
     * @function file#punshare
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.pplist = function(options) {
        return this.doFileOp(FileOps.defaults.pplist, options);
    };

    FileOps.defaults.chown = {
        op: 'chown'
    };

    FileOps.prototype.chown = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.chown, reqobj), options);
    };

    FileOps.defaults.setmt = {
        op: 'setmt'
    };

    FileOps.prototype.setmt = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.setmt, reqobj), options);
    };

    FileOps.defaults.lsaccess = {
        op: 'lsaccess'
    };

    FileOps.prototype.lsaccess = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.lsaccess, reqobj), options);
    };

    FileOps.defaults.pcomp = {
        op: 'pcomp'
    };

    /**
     * Compile a component description into a Component.
     *
     * The component description is in a text file on the server. The compiler produces
     * a Component file if it succeeds.
     *
     * The required parameter in the request object is:
     *
     *      source {String} the full path to the component description text file
     *
     * The request object may also contain:
     *
     *      output {String} the output filename or full path. The default name is
     *                      the input filename with its extension replaced by '.cco'
     *
     * @function file#pcomp
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.pcomp = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.pcomp, reqobj), options);
    };

    FileOps.defaults.mkcomp = {
        op: 'mkcomp'
    };

    /**
     * Create a new, empty Component.
     *
     * The required parameter in the request object is:
     *
     *      path {String} the full path of the new file
     *
     * @function file#mkcomp
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.mkcomp = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.mkcomp, reqobj), options);
    };

    FileOps.defaults.rdcomp = {
        op: 'rdcomp'
    };

    /**
     * Read the contents of an existing Component.
     *
     * The required parameter in the request object is:
     *
     *      component {String} the full path to the Component file
     *
     * @function file#rdcomp
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.rdcomp = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.rdcomp, reqobj), options);
    };

    FileOps.defaults.wrcomp = {
        op: 'wrcomp'
    };

    /**
     * Write the contents of a component.
     *
     * This replaces the contents of an existing Component. The contents are specified
     * as a structured object which can be decoded into a ComponentDescriptor. See the
     * server code, Component.scala, for the organization of a ComponentDescriptor.
     *
     * The required parameters in the request object are:
     *
     *      component {String} the full path to the Component file
     *      content {Object} an object that is compatible with ComponentDescriptor
     *
     * @function file#wrcomp
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.wrcomp = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.wrcomp, reqobj), options);
    };

    FileOps.defaults.defineAttribute = {
        op: 'adefn'
    };

    /**
     * Define a file attribute.
     *
     * This defines a file metadata attribute with a name, type, and optional description.
     * An attribute definition is stored as a special type of file, and thus is referenced
     * by a file path. If a relative file path is specified as an attribute reference, it
     * is taken as relative to "/System/Attributes".
     *
     * Once an attribute has been defined, values for the attribute can be set on files.
     *
     * The type of an attribute is one of:
     *
     *      "STRING" - the attribute value is an uninterpreted string
     *      "BOOLEAN" - the attribute value is a boolean value, which is always
     *                  returned as true or false. If the value used to set a boolean
     *                  is not true or false, heuristics are used to interpret it
     *                  as boolean.
     *      "NUMBER" - the attribute value is a number, which may be integer or
     *                 double. It is returned as a JavaScript number.
     *      "JSON" - the attribute value is JSON-encoded. When setting the value,
     *               any JavaScript value passed will be JSON-encoded. When
     *               retrieving the value, the value resulting from decoding the
     *               JSON is returned.
     *      "FILE" - the attribute value is the path to a file.
     *
     * The request object contains these fields:
     *
     *      path {String} the attribute definition file path
     *      atype {String} the attribute type as described above
     *      [description] {String} an optional string describing the attribute
     *
     * The response object contains:
     *
     *      status {Number} > 0 indicates successfully defined new attribute
     *                      == 0 indicates the attribute definition file already exists
     *                         with the specified type
     *                      < 0 indicates an error
     *      [msg] {String} an error message if status < 0
     *      [type] {String} the attribute type, if status >= 0
     *      [description] {String} the attribute description, if status >= 0
     *      Other fields describing the attribute definition file, as would be returned
     *      by a file lookup() operation (if status >= 0).
     *
     * @function file#defineAttribute
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.defineAttribute = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.defineAttribute, reqobj), options);
    };

    FileOps.defaults.getAttributeValues = {
        op: 'aget'
    };

    /**
     * Get metadata attribute values associated with a specified file.
     *
     * A file can have associated values for any defined attributes. This returns all
     * such values, or a specified subset.
     *
     * The request object contains these fields:
     *
     *      path {String} file path of the file for which attribute values are desired
     *      [attributes] {Array{String}} optional list of attribute definition file paths,
     *                                   to retrieve values of specific attributes
     *
     * The response object contains:
     *
     *      status {Number} > 0 indicates success
     *                      < 0 indicates error
     *      [msg] {String} error message if status < 0
     *      [attributes] {Array{Object}} list of objects, one for each attribute. These
     *          objects contain:
     *              status {Number} == 1 if attribute value was retrieved
     *                              == -1 if error retrieving attribute
     *              name {String} the attribute name, except with certain errors
     *              [msg] {String} an error message if status == -1
     *              If status == 1:
     *              id {Number} unique id for the attribute definition
     *              atype {String} the attribute type
     *              value {Any} value of the attribute for the specified file
     *              setter {Object} object describing the principal who last set the
     *                              attribute value for this file
     *              stime {Number} timestamp for when attribute value was set
     *
     * @function file#getAttributeValues
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.getAttributeValues = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.getAttributeValues, reqobj), options);
    };

    FileOps.defaults.setAttributeValues = {
        op: 'aset'
    };

    /**
     * Set metadata attribute values on a file.
     *
     * This sets values for attributes on a particular file. The attributes are identified by
     * the paths to their attribute definitions. If an attribute definition path is not a full
     * path from the filesystem root, it is taken as relative to "/System/Attributes".
     *
     * The request object contains these fields:
     *
     *      path {String} file path of the file for which attribute values are being set
     *      attributes {Array{Object}} list of objects, each containing an attribute definition
     *                                 path and a value for that attribute. Specifically,
     *                                 each of these objects has these fields:
     *          name {String} the path to the attribute definition file
     *          value {*} the value to be set for the attribute, with a type that is compatible
     *                    with the type specified in the attribute definition
     *          [atype] {String} optionally the type of attribute, which must match the type
     *                           in the attribute definition
     *
     * The response object contains:
     *
     *      status {Number} > 0 indicates success
     *                      < 0 indicates error
     *      [msg] {String} error message if status < 0
     *      [attributes] {Array{Object}} list of objects, one for each attribute. These
     *          objects contain:
     *              status {Number} == 1 if attribute value was set
     *                              == -1 if error setting attribute
     *              name {String} the attribute name, except with certain errors
     *              [msg] {String} an error message if status == -1
     *              If status == 1:
     *              id {Number} unique id for the attribute definition
     *              atype {String} the attribute type
     *              value {Any} value of the attribute for the specified file
     *              setter {Object} object describing the principal who last set the
     *                              attribute value for this file (should be the
     *                              current user)
     *              stime {Number} timestamp for when attribute value was set (should
     *                             be milliseconds before the current time)
     *
     * @function file#setAttributeValues
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.setAttributeValues = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.setAttributeValues, reqobj), options);
    };

    FileOps.defaults.getValuesOfAttribute = {
        op: 'avoa'
    };

    /**
     * Get all of the value assignments for the attribute defined by the file at 'path'. An
     * entry is returned for each value assignment with information about the file to which
     * the value is assigned, and the value itself. However, some of these entries may
     * indicate errors, most likely due to a lack of access rights for the current user.
     *
     * The request object contains these fields:
     *
     *      path {String} file path of the attribute definition for which values are to be
     *                    retrieved
     *
     * The response object contains:
     *
     *      status {Number} > 0 indicates success
     *                      == 0 indicates the attribute has no values
     *                      < 0 indicates error
     *      [msg] {String} error message if status <= 0
     *      [path] {String} full path to the referenced attribute definition
     *      [values] {Array{Object}} list of objects, one for each value found for the
     *                               attribute. These objects contain:
     *          status {Number} == 1 if attribute value was retrieved successfully
     *                          == -1 if error getting attribute value
     *          file {Object} an object containing lookup information for the file
     *                        which has the returned attribute value. This information
     *                        may be severely limited in the event of an error, but
     *                        generally will contain at least a 'path' field with
     *                        the full file path.
     *          [msg] {String} an error message if status == -1
     *          [value] {Object} if status == 1, an object containing full information
     *                           about the attribute value as would be returned by
     *                           getAttributeValues().
     *
     * @function file#getValuesOfAttribute
     * @param {Object} reqobj the request object
     * @param {Object} [options] optional jQuery.ajax() settings
     * @returns a jqXHR-like object, including the promise() API
     */
    FileOps.prototype.getValuesOfAttribute = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.getValuesOfAttribute, reqobj), options);
    };

    FileOps.defaults.lua = {
        op: "lua"
    };

    FileOps.prototype.lua = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.lua, reqobj), options);
    };

    FileOps.defaults.jsrun = {
        op: "jsrun"
    };

    /**
     * Run a server-side JavaScript script.
     *
     *      @typedef {Object} JsRunRequest
     *      @property {string} [op] the operation code, "jsrun" by default
     *      @property {string} path the path to the JavaScript script file
     *      @property {boolean} [asOwner] true if the script should be run as the owner
     *                                    of the script file, rather than as the current
     *                                    user. Defaults to false.
     *      @property {*[]} [args] array of arguments for the script, suitable for
     *                             JSON encoding, passed to the script as its "args"
     *                             variable. Default to empty array.
     *
     *      @typedef {Object} JsRunResponse
     *      @property {number} status == 1 if script was executed without any uncaught
     *                                exceptions. Otherwise -1, and msg field is present.
     *      @property {*} result whatever the script returns
     *      @property {string} msg an error message if there is a problem executing
     *                             the script
     *
     * @param {JsRunRequest} reqobj the request object
     * @param {Object} [options] jQuery $.ajax options
     * @return {Promise} a promise for a JsRunResponse
     */
    FileOps.prototype.jsrun = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.jsrun, reqobj), options);
    };

    FileOps.defaults.validate = {
        op: 'validate'
    };

    /**
     * Validate the DbManager file cache.
     */
    FileOps.prototype.validate = function(reqobj, options) {
        return this.doFileOp($.extend({}, FileOps.defaults.validate, reqobj), options);
    };

    FileOps.prototype.setFail = function(jqxhr, reqobj) {
        jqxhr.fail(function() {
            console.log('File operation ' + reqobj.op + ' failed');
        });
    };
    
    FileOps.prototype.doFileOp = function(reqobj, options) {
        options = $.extend({}, {
                type : 'POST',
                dataType : 'json',
                contentType : 'application/json; charset=utf-8',
                async: true,
                global: false,
                data: JSON.stringify(reqobj)
            }, options || {});
        var jqxhr = $.session('ajax', this.url + '?api=file', options);
        this.setFail(jqxhr, reqobj);
        return jqxhr;
    };

    var choiceFileOps = new FileOps();
    if ($.file !== undefined) {
        alert('jQuery conflict on "file" plugin');
        return;
    }
    $.extend({
        file: function(method) {
            if (choiceFileOps[method]) {
                return choiceFileOps[method].apply( choiceFileOps, Array.prototype.slice.call( arguments, 1 ));
            }
            throw new Error('No FileOps method ' + method);
        }
    });
    
    return choiceFileOps;
});
