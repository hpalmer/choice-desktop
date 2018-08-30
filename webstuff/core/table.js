/**
 * @fileOverview Implementation of a two-dimensional table object.
 * @author Howard Palmer
 * @version 1.0.0
 */
/**
 * This implements a table as a two-dimensional array. It also
 * includes an additional array to store column headers for the
 * table. The column header array and all the row arrays of the
 * table are maintained at the same length.
 * @param arg1	If an int then number of rows otherwise an array
 * containing the table data is assumed
 * @param [arg2] If arg1 is int then number of columns
 * @returns {Table}
 * @constructor
 */
function Table() {
	if (arguments) {
		if (typeof arguments[0] === "number") {
			this.$int.apply(this, arguments);
		}
		else {
			this.$array.apply(this, arguments);
		}
	}
}

/**
 * Builds table from a supplied two-dimensional array.
 * @param {Object[Object[]]} data	Two-dimensional array containing table data
 */
Table.prototype.$array = function(data) {
	this.table = data;
	if (data && (data[0] !== undefined)) {
		this.header = new Array(data[0].length);
	}
	else this.header = new Array();
};

/**
 * Builds a table given the numbers of rows and columns. All fields
 * in the table and its headers are initially undefined.
 * @param {int} rows	The number of rows
 * @param {int} columns	The number of columns
 */
Table.prototype.$int = function(rows, columns) {
	this.table = new Array(rows);
	this.header = new Array(columns);
	
	for (var i = 0; i < rows; ++i) {
		this.table[i] = new Array(columns);
	}
};

/**
 * Return the number of columns in the table.
 * @returns {int}
 */
Table.prototype.columns = function() {
	return this.header.length;
};

/**
 * Return the number of rows in the table.
 * @returns {int}
 */
Table.prototype.rows = function() {
	return this.table.length;
};

/**
 * Add a row to the table. Elements of the new row are initially
 * undefined.
 * @param {int} [index]	The index the new row will occupy, with
 * the default being to add the row to the end of the table.
 * @returns {Object[]}	The new row array
 */
Table.prototype.addRow = function(index) {
	if (index === undefined) {
		index = this.table.length;
	}
	this.table.splice(index, 0, new Array(this.header.length));
	return this.table[index];
};

/**
 * Remove a row from the table.
 * @param {int} [index]	The index of the row to remove, with the
 * last row being removed by default
 * @returns {Object[]}	The row that was removed
 */
Table.prototype.removeRow = function(index) {
	if (index === undefined) {
		index = this.table.length - 1;
	}
	var result = this.table[index];
	this.table.splice(index, 1);
	return result;
};

/**
 * Add a column to the table and its headers.
 * @param {int} [index]	The index the new column will occupy, with
 * the default being after the current last column
 * @param {Object} [value]	The value to be stored in the new column
 * of the table
 * @param {Object} [hdrval]	The value to be stored in the new header
 * column
 * @returns {int} column index
 */
Table.prototype.addColumn = function(index, value, hdrval) {
	if (index === undefined) {
		index = this.header.length;
	}
	this.header.splice(index, 0, null);
	this.header[index] = hdrval;
	for (var i = 0; i < this.table.length; ++i) {
		this.table[i].splice(index, 0, null);
		this.table[i][index] = value;
	}
	return index;
};

/**
 * Remove a column from the table.
 * @param {int} [index]	The index of column to remove, with the
 * last column being the default
 */
Table.prototype.removeColumn = function(index) {
	if (index === undefined) {
		index = this.header.length - 1;
	}
	this.header.splice(index, 1);
	for (var i = 0; i < this.table.length; ++i) {
		this.table[i].splice(index, 1);
	}
};

/**
 * Return the value of a specified column header.
 * @param {int} index	The index of the column
 * @returns {Object}
 */
Table.prototype.getHeader = function(index) {
	return this.header[index];
};

/**
 * Set the value of a specified column header. The number
 * of columns in the table is increased, if necessary, to
 * accommodate the specified index. 
 * @param {int} index	The index of the column header to set
 * @param {Object} [value]	The value to set for the column header
 * @returns {Object}	The previous value of the column header
 */
Table.prototype.setHeader = function(index, value) {
	while (index >= this.header.length) {
		this.addColumn();
	}
	var result = this.header[index];
	this.header[index] = value;
	return result;
};

/**
 * Return the column header array.
 * @returns {Array}
 */
Table.prototype.getHeaders = function() {
	return this.header;
};

/**
 * Set the column headers from a specified array. The data
 * from the array is copied to the headers.
 * @param {Array} headers	The values for the column headers
 */
Table.prototype.setHeaders = function(headers) {
	for (var i = 0; i < headers.length; ++i) {
		this.setHeader(i, headers[i]);
	}
};

/**
 * Return the array that stores a specified row of the table.
 * @param {int} index	The index of the row to return
 * @returns {Array}
 */
Table.prototype.getRow = function(index) {
	return this.table[index];
};

/**
 * Set a specified row of the table from the data in a given
 * array. The data is copied from the array to the table.
 * New rows will be added to the table to accommodate the
 * specified index, if necessary. And new columns will be
 * added if the length of the given data is more than the
 * current number of columns.
 * @param {int} index	The index of the table row to set
 * @param {Array} data	Data to store in the table row
 */
Table.prototype.setRow = function(index, data) {
	while (index >= this.table.length) {
		this.addRow();
	}
	while (data.length >= this.header.length) {
		this.addColumn();
	}
	for (var i = 0; i < data.length; ++i) {
		this.table[index][i] = data[i];
	}
};

/**
 * Return the value of the field at a given row and column of
 * the table.
 * @param {int} row		The row containing the field
 * @param {int} column	The column containing the field
 * @returns {Object}
 */
Table.prototype.getField = function(row, column) {
	return this.table[row][column];
};

/**
 * Set the value of the field at a given row and column of
 * the table.
 * @param {int} row		The row containing the field
 * @param {int} column	The column containing the field
 * @param {Object} value	The value to set in the field
 * @returns {Object}	The previous value of the field
 */
Table.prototype.setField = function(row, column, value) {
	var result = this.table[row][column];
	this.table[row][column] = value;
	return result;
};
