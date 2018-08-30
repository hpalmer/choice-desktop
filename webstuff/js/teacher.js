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
 * Teacher Account Manager
 *
 * @author Howard Palmer
 * Created by Hep on 1/30/2017.
 */

import $ from 'jquery';
import jqui from 'jquery-ui';
import ChoiceSession from 'newlogging/ChoiceSession';
import FileOps from 'newlogging/FileOps';
import GroupOps from 'newlogging/GroupOps';
import dataTable from 'datatables.net';
import FSWinlib from 'js/fswinlib';

/* global window */
/* global console */

const queue = 'TeacherAccount';
const pending_path = '/System/Pending/';

dataTable(window, $); //attaches to global jquery object

class Teacher {
    constructor() {
        this.action = undefined;
        this.currentEntry = undefined;
        this.allEntries = [];
        this.pendingEntries = [];
        this.session = ChoiceSession.instance();
        this.fileops = FileOps.instance();
        this.FSWinlib = new FSWinlib();
        $('#goPending').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.getPendingList();
            return false;
        });
        $('#goExisting').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.getExistingList();
            return false;
        });
        this.getPendingList();
    }

    getPendingList() {
        $('#pending, #action, #existing').addClass('hidden');
        $('#statusMsg').text('Loading...');
        $('#status, #statusMsg').removeClass('hidden');
        return this.fileops.gather({ path: pending_path + queue }).then((result) => this.processList(result),
            (obj) => this.showError(obj));
    }

    processList(result) {
        if (result.status === 1) {
            $('#statusMsg').text('Queue list retrieved');
            this.allEntries = result.result.map(function(e) { return JSON.parse(e.data.args); });
            $('#statusMsg').text('Number of entries: ' + this.allEntries.length);
            if (this.allEntries.length > 0) {
                // Get the entries which are still pending, and sort by ascending request time.
                this.pendingEntries = this.allEntries.filter(function(v) {
                    return !(v.researcherApproved || v.researcherDenied);
                }).sort(function(v1, v2) { return v1.requestTime - v2.requestTime; });
                // Show them in the pending table.
                if (this.pendingEntries.length > 0) {
                    const tbody = $('#pending').find('tbody').empty();
                    this.pendingEntries.forEach((info, i) => {
                        let tr = `<tr data-index="${i}">`;
                        tr += '<td class="mdl-data-table__cell--non-numeric">';
                        tr += info.teacherEmail;
                        const codes = [];
                        if (!info.emailConfirmed) {
                            codes.push('*');
                        }
                        if (info.isGoogleLogin) {
                            codes.push('G');
                        }
                        const code = codes.join(',');
                        if (code) tr += `[${code}]`;
                        tr += '</td>';
                        tr += '<td class="mdl-data-table__cell--non-numeric">';
                        tr += info.teacherFirst + ' ' + info.teacherLast;
                        tr += '</td>';
                        tr += '<td>' + info.teacherYears + '</td>';
                        tr += '<td class="mdl-data-table__cell--non-numeric">';
                        tr += info.schoolName;
                        tr += '</td>';
                        tr += '<td class="mdl-data-table__cell--non-numeric">';
                        tr += info.schoolCity;
                        tr += '</td>';
                        tr += '<td class="mdl-data-table__cell--non-numeric">';
                        tr += info.schoolState;
                        tr += '</td>';
                        tr += '<td>' + info.schoolZip + '</td>';
                        tr += '</tr>';
                        tbody.append(tr)
                    });
                    componentHandler.upgradeElement(tbody[0]);
                    // $('#table1').datagrid('loadData', this.pendingEntries);
                    $('#status, #statusMsg').addClass('hidden');
                    $('#pending').removeClass('hidden');
                    // $('#table1').datagrid('resize');
                    tbody.off()
                        .on('click', (e) => this.pendingClick(e))
                        .on('dblclick', (e) => this.pendingDoubleClick(e));
                    return;
                }
            }
            $('#status').addClass('hidden');
            $('#statusMsg').text('No pending requests for teacher accounts.').removeClass('hidden');
        }
        else {
            $('#status, #statusMsg').addClass('hidden');
            this.showError(result);
        }
    }

    pendingClick(e) {
        e.preventDefault();
        e.stopPropagation();
        let index = $(e.target).parent().attr('data-index');
        index = Number(index);
        if (!isNaN(index)) {
            const info = this.pendingEntries[index];
            this.setTeacher(info);
            const teacherPanel = $('#teacherPanel');
            teacherPanel.find('pre').text(info.teacherComment || '');
            teacherPanel.toggleClass('hidden');
        }
        return false;
    }

    pendingDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        let index = $(e.target).parent().attr('data-index');
        index = Number(index);
        if (!isNaN(index)) {
            const info = this.pendingEntries[index];
            if (!info.emailConfirmed) {
                const unconfirmedDialog = $('#unconfirmedDialog');
                unconfirmedDialog.find('.close').off().on('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    unconfirmedDialog[0].close();
                    return false;
                });
                unconfirmedDialog[0].showModal();
            }
            else {
                this.showEntry(info);
            }
        }
        return false;
    }

    showEntry(info) {
        this.currentEntry = info;
        console.log('add dialog to approve or deny ' + info.teacherEmail);
        this.setTeacher(info);
        $('#approve').off().on('click', (e) => this.approveClick(e));
        $('#deny').off().on('click', (e) => this.denyClick(e));
        $('#send').addClass('hidden').off().on('click', () => this.executeAction());
        $('#acancel').off().on('click', () => this.cancelAction());
        $('#pending').addClass('hidden');
        const action = $('#action');
        action.removeClass('hidden');
    }

    setTeacher(info) {
        $('.teacherName').text(`${info.teacherFirst} ${info.teacherLast}`);
        $('.teacherEmail').text(info.teacherEmail);
    }

    approveClick() {
        const content = $('textarea').val();
        if (content) {
            const approveDialog = $('#approveDialog');
            approveDialog.find('.leave').off().on('click', () => {
                this.setApproved();
                approveDialog[0].close();
            });
            approveDialog.find('.replace').off().on('click', () => {
                $('textarea').val('');
                this.setApproved();
                approveDialog[0].close();
            });
            approveDialog[0].showModal();
        }
        else {
            this.setApproved();
        }
    }

    denyClick(e) {
        const content = $('textarea').val();
        if (content) {
            const denyDialog = $('#denyDialog');
            denyDialog.find('.leave').off().on('click', () => {
                this.setDenied();
                denyDialog[0].close();
            });
            denyDialog.find('.replace').off().on('click', () => {
                $('textarea').val('');
                this.setDenied();
                denyDialog[0].close();
            });
            denyDialog[0].showModal();
        }
        else {
            this.setDenied();
        }
    }

    setApproved() {
        let content = $('textarea').val();
        this.action = 'approve';
        if (!content) {
            const link = this.session.getContextRoot('/teacher/activate.html') +
                '?email=' + this.currentEntry.teacherEmail + '&id=' + this.currentEntry.uniqueId;
            content = 'Hello, ' + this.currentEntry.teacherFirst + '!\n\n' +
                'Congratulations, your request for a teacher account has been approved.\n' +
                'You can activate your account here:\n\n' +
                window.location.origin + link  + '\n\n' +
                'Thank you for your interest in our research!\n\n' +
                'Stanford AAALab\n';
            $('textarea').val(content);
        }
        $('#aname').text('Approve');
        $('#send').removeClass('hidden');
    }

    setDenied() {
        let content = $('textarea').val();
        this.action = 'deny';
        if (!content) {
            content = 'Hello ' + this.currentEntry.teacherFirst + ',\n\n' +
                'We regret to inform you that your request for a teacher account has been denied.\n' +
                'Nevertheless, we appreciate your interest in our research.\n\n' +
                'Stanford AAALab\n';
            $('textarea').val(content);
        }
        $('#aname').text('Deny');
        $('#send').removeClass('hidden');
    }

    cancelAction() {
        $('#statusMsg').text('Loading...');
        this.getPendingList();
    }

    executeAction() {
        console.log('Action to be executed: ' + this.action);
        const info = this.currentEntry;
        const eventArgs = [info.uniqueId, $('textarea').val()];
        this.runQueuedScript(info.teacherEmail, this.action, eventArgs).then((obj) => this.actionResponse(obj));
        $('#action, #send').addClass('hidden');
        $('#statusMsg').text('Executing...');
        $('#status, #statusMsg').removeClass('hidden');
    }

    actionResponse(obj) {
        if (obj.status === 1) {
            $('#statusMsg').text($('#statusMsg').text() + obj.result);
            setTimeout(() => this.getPendingList(), 5000);
        }
        else {
            this.showError(obj);
        }
    }

    getExistingList() {
        $('#pending, #action, #existing').addClass('hidden');
        $('#statusMsg').text('Loading...');
        $('#status, #statusMsg').removeClass('hidden');
        GroupOps.instance().getUsers('/schools/Teachers', false).then((obj) => this.processExisting(obj));
    }

    processExisting(obj) {
        if (obj.status === 1) {
            const users = obj.users;
            this.existingUsers = users;
            console.log('There are ' + users.length + ' teachers.');
            if (users.length > 0) {
                const tbody = $('#existing').find('tbody').empty();
                users.forEach((uinfo, i) => {
                    const info = JSON.parse(uinfo.regcode);
                    let tr = `<tr data-index="${i}">`;
                    tr += '<td class="mdl-data-table__cell--non-numeric">';
                    tr += info.idstring;
                    tr += '</td>';
                    tr += '<td class="mdl-data-table__cell--non-numeric">';
                    tr += uinfo.email;
                    tr += '</td>';
                    tr += '<td class="mdl-data-table__cell--non-numeric">';
                    tr += info.teacherFirst + ' ' + info.teacherLast;
                    tr += '</td>';
                    tr += '<td>' + info.teacherYears + '</td>';
                    tr += '<td class="mdl-data-table__cell--non-numeric">';
                    tr += info.schoolName;
                    tr += '</td>';
                    tr += '<td class="mdl-data-table__cell--non-numeric">';
                    tr += info.schoolCity;
                    tr += '</td>';
                    tr += '<td class="mdl-data-table__cell--non-numeric">';
                    tr += info.schoolState;
                    tr += '</td>';
                    tr += '<td>' + info.schoolZip + '</td>';
                    tr += '</tr>';
                    tbody.append(tr)
                });
                componentHandler.upgradeElement(tbody[0]);
                tbody.on('click', (e) => this.handleExistingClick(e));
                // $('#table1').datagrid('loadData', this.pendingEntries);
                $('#status, #statusMsg').addClass('hidden');
                $('#existing').removeClass('hidden');
                return;
            }
            $('#statusMsg').text('There are no existing accounts.');
            $('#status').addClass('hidden');
        }
        else {
            $('#status, #statusMsg').addClass('hidden');
            this.showError(obj);
        }
    }

    handleExistingClick(e) {
        const index = Number($(e.target).closest('tr').attr('data-index'));
        if (!isNaN(index)) {
            this.teacher = this.existingUsers[index];
            this.teacher.info = JSON.parse(this.teacher.regcode);
            const teacherEmail = this.teacher.name;
            $('.teacherName').text(`${this.teacher.info.teacherFirst} ${this.teacher.info.teacherLast} <${teacherEmail}>`);
            console.log('click on teacher ', teacherEmail);
            // Do a gather operation on the server on the teacher's subfolder for Posterlet data.
            // This returns the filenames and data from all the application/json files in the folder.
            // Those files are created when Posterlet runs in live mode.
            this.fileops.gather({ path: '/schools/folders/' + teacherEmail + '/PosterletData' },
                { context: this }).then((obj) => this.processGather(obj));
        }
    }

    processGather(obj) {
        // Do a gather operation on the server on the teacher's subfolder for Posterlet data.
        // This returns the filenames and data from all the application/json files in the folder.
        // Those files are created when Posterlet runs in live mode.
        if (obj.status === 1) {
            // Successful operation, go process
            const items = obj.result;
            console.log(items);
            $('#main').addClass('hidden');
            $('#posterlet').removeClass('hidden');
            $('#pback').on('click', (e) => {
                $('#posterlet').addClass('hidden');
                $('#main').removeClass('hidden');
            });
            $('#pstatus').find('p').text('Processing data...');
            // Construct the column headers
            const headers = ['Username', 'Session Id', 'Last Update'];
            // Column definitions may change over time, so not all items will necessarily contain
            // the same set of keys. So go through all items collecting information about all keys.
            // Where there might be conflicting information, if a column title were changed for
            // example, the most recent information is taken.
            const columnDefs = {};
            for (const item of items) {
                for (const key of Object.keys(item.data)) {
                    const keyobj = columnDefs[key] || {};
                    const elem = item.data[key];
                    // Use the most recent information about each key
                    if ((keyobj._last_modified === undefined) || (keyobj._last_modified < elem._last_modified)) {
                        keyobj._last_modified = elem._last_modified;
                        keyobj._title = elem._title;
                        if (elem._order !== undefined) {
                            keyobj._order = elem._order;
                        }
                    }
                    columnDefs[key] = keyobj;
                }
            }
            // Look for elements with an assigned order
            const cols = [];
            for (const key of Object.keys(columnDefs)) {
                if (columnDefs[key]._order !== undefined) {
                    cols.push([key, columnDefs[key]._order])
                }
            }
            // Sort these items by ascending order value and extract those keys
            const keys = cols.sort((a, b) => a[1] - b[1]).map(pair => pair[0]);
            // And add their titles to headers
            for (const key of keys) {
                const title = columnDefs[key]._title;
                headers.push((title) ? title : '');
            }
            // Now add all the ones with no assigned order
            for (const key of Object.keys(columnDefs)) {
                const elem = columnDefs[key];
                if (elem._order === undefined) {
                    keys.push(key);
                    headers.push((elem._title) ? elem._title : '');
                }
            }
            // Extract the data in rows ordered by keys[]
            const data = [];
            for (const item of items) {
                const nameParts = item.name.split('-');
                const username = nameParts[0];
                const sessionid = Number(nameParts[1]);
                const row = [username, sessionid, -1];
                keys.forEach((key) => {
                    const elem = item.data[key];
                    if (elem === undefined) {
                        row.push('');
                    }
                    else {
                        let value = elem._value;
                        if (value === undefined) value = '';
                        // The mkcsv operation below currently doesn't handle booleans, so convert to 0|1
                        if (typeof value === 'boolean') {
                            value = Number(value);
                        }
                        row.push(value);
                        // Save the time of the most recent update
                        const timestamp = elem._last_modified;
                        if (timestamp > row[2]) {
                            row[2] = timestamp;
                        }
                    }
                });
                // Convert the last update time to a string
                row[2] = (new Date(row[2])).toLocaleString();
                // Accumulate rows
                data.push(row);
            }
            $('#pstatus').find('p').text('Uploading data...');
            // Store the collected data in data.csv in the teacher folder, replacing any
            // previous data.csv.
            this.fileops.mkcsv({
                headers: headers,
                data: data,
                name: 'data.csv',
                path: this.teacherFolder,
                replace: true
            }, { context: this }).then((obj) => {
                // this.sonic.stop();
                $('#sonicdiv').remove();
                if (obj.status === 1) {
                    // Show the download link for data.csv
                    const url = this.session.getContextRoot(`${obj.path}/${obj.name}`);
                    $('#pstatus').html(`<p>Your data is ready 
                    <a href="${url}">here</a> (${obj.length} bytes)</p>`);

                    this.makeUserTable(data, keys);
                }
                else {
                    $('#pstatus').html(`<p style="color=red;">Data upload failed: ${this.cleanmsg(obj)}</p>`);

                    this.makeUserTable(data, keys);
                }
            });
        }
        else {
            // Not so successful
            // this.sonic.stop();
            $('#sonicdiv').remove();
            $('#pstatus').html(`<p style="color=red;">Failed to retrieve the data: ${this.cleanmsg(obj)}</p>`);
        }
        componentHandler.upgradeElement($('body')[0]);
    }

    /**
     * This function makes the posterlet user table.  Each user is a student
     * in the current teachers group.  The table will be constructed in #ptable.
     *
     * @param {array[]} data: Each index of data has a user and their posterlet scores.
     * @param {[string]} keys: data item keys in the order of their corresponding columns
     */
    makeUserTable(data, keys) {

        // Add the table to the posterlet id
        $('#ptable').empty().append(`<table id="posterletTable" class="display">` +
            `<thead>` +
            `<tr>` +
            `<th> Username </th>` +
            `<th> Date / Time </th>` +
            `<th> Negative Feedback </th>` +
            `<th> Positive Feedback </th>` +
            `<th> Revised Posters </th>` +
            `</tr>` +
            `</thead>` +
            `<tbody>` +
            `</tbody>` +
            `</table>`);

        // Get indices of these columns
        const negcount = keys.indexOf('negcount') + 3;
        const poscount = keys.indexOf('poscount') + 3;
        const revcount = keys.indexOf('revcount') + 3;

        // Loop through each data index
        for(let i = 0; i < data.length; i++)
        {
            // Values to be used in table
            const username = data[i][0];
            const dateAndTime = data[i][2];
            const negFeedbackCount = data[i][negcount];
            const posFeedbackCount = data[i][poscount];
            const revisedPosterCount = data[i][revcount];


            // Append to posterlet table inside of its tbody
            $('#posterletTable').find('> tbody').append(`<tr>` +
                `<td>` + username + `</td>` +
                `<td>` + dateAndTime + `</td>` +
                `<td>` + negFeedbackCount + `</td>` +
                `<td>` + posFeedbackCount + `</td>` +
                `<td>` + revisedPosterCount + `</td>` +
                `</tr>`);
        }

        // Must call DataTable to the posterlet table
        $('#posterletTable').DataTable();
    }

    runQueuedScript(filename, event, eventargs) {
        return this.fileops.doFileOp({
            op: 'qsrun',
            queue: queue,
            filename: filename,
            event: event,
            eventArgs: eventargs }).catch((obj) => this.showError(obj));
    }

    /**
     * Produce a clean error message from the result of a server operation that failed.
     *
     * @param {Object} obj the object returned by the server, which likely has a 'msg'
     *                     field containing an error message
     * @return {string} a clean error message
     */
    cleanmsg(obj) {
        if (obj.msg) {
            // Server error messages are messy
            if (obj.msg.startsWith("Failure(")) {
                const last = obj.msg.indexOf(',Empty');
                return obj.msg.substring(8, last);
            }
            else {
                // Or maybe not
                return obj.msg;
            }
        }
        else {
            // No 'msg'
            return 'unknown error';
        }
    }

    showError(obj) {
        const errorDialog = $('#errorDialog');
        errorDialog.find('.close').off().on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            errorDialog[0].close();
            return false;
        });
        if (obj && (obj.status != null)) {
            errorDialog.find('p').text('Error: ' + this.cleanmsg(obj));
        }
        else {
            errorDialog.find('p').text('Operation failed.');
        }
        errorDialog[0].showModal();
    }
}

ChoiceSession.instance().ready(() => new Teacher());

