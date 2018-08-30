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
 * Created by Hep on 11/06/2017.
 */
import $ from 'jquery';
import ChoiceSession from 'newlogging/ChoiceSession';
import EventOps from 'newlogging/EventOps';
import FileOps from 'newlogging/FileOps';
import GroupOps from 'newlogging/GroupOps';
import dataTable from 'datatables.net';
import dataTable_resp from 'datatables.net-responsive'
import IfMessage from 'newlogging/IfMessage';
import FsWinLib from 'newlogging/FsWinLib';
/** @external getmdlSelect */

dataTable(window, $); //attaches to global jquery object

const ChoiceletsJsonPath = '/Choice/Choicelets/choicelets.json';
const PbControlSendPort = 'pbcontrol';
const PbControlRecvPort = 'playback';

class Playback {
    constructor() {
        console.log('Playback constructor');
        getmdlSelect.init('.getmdl-select');
        this.choiceletName = 'NONE';
        this.choicelet = undefined;
        this.fswinlib = new FsWinLib();
        this.eventops = EventOps.instance();
        this.fileops = FileOps.instance();
        Playback.setStatus('Loading Choicelet information...', true);
        this.fileops.getJson({ path: ChoiceletsJsonPath }).then((choicelets) => this.processChoicelets(choicelets));
    }

    processChoicelets(choicelets) {
        this.choicelets = choicelets;
        console.log(`${choicelets.length} Choicelets found.`);
        const displayList = [];
        const versionLists = {};
        for (const choicelet of this.choicelets) {
            // Only handle newlogging Choicelets currently
            if (choicelet.newlogging) {
                const display = choicelet.display || choicelet.model;
                if (!(displayList.includes(display))) {
                    displayList.push(display);
                    versionLists[display] = [];
                }
                versionLists[display].push(choicelet);
            }
        }
        displayList.sort();
        this.displayList = displayList;
        this.versionLists = versionLists;
        for (const name of displayList) {
            $('#choiceletlist').append(`<li class="mdl-menu__item" value="${name}">${name}</li>`);
        }
        $('#choiceletlist').find('.dummy-item').addClass('hidden');
        getmdlSelect.init('.getmdl-select');
        $('.mdl-textfield').css('width', '160px');
        $('#choicelet').off('.pb').on('change.pb', (e) => this.setChoicelet(e));
        Playback.setStatus();
    }

    setChoicelet(e) {
        const display = $(e.target).val();
        // $('#choiceletlist')[0].MaterialMenu.hide();
        console.log(`Choicelet is ${display}`);
        this.choiceletName = display;
        $('#sessionlist').addClass('hidden');
        $('#versionlist').find('li').each((_, elem) => {
            if ($(elem).data('val') !== 'NONE') {
                $(elem).remove();
            }
        });
        $('#version').val('Choose Version');
        if (display !== 'NONE') {
            const versionStrings = [];
            for (const choicelet of this.versionLists[display]) {
                if (!versionStrings.includes(choicelet.version)) {
                    versionStrings.push(choicelet.version);
                }
            }
            versionStrings.sort();
            for (const version of versionStrings) {
                $('#versionlist').append(`<li class="mdl-menu__item" data-val="${version}">${version}</li>`);
            }
            $('#versionlist').find('.dummy-item').addClass('hidden');
        }
        getmdlSelect.init('.getmdl-select');
        $('.mdl-textfield').css('width', '160px');
        $('#version').off('.pb').on('change.pb', (e) => this.setVersion(e));
    }

    setVersion(e) {
        const version = $(e.target).val();
        console.log(`Version is ${version}`);
        this.choicelet = this.versionLists[this.choiceletName].find((c) => c.version === version);
        $('#sessionlist').addClass('hidden');
        Playback.setStatus(`Loading sessions for ${this.choiceletName} version ${version}...`, true);
        this.eventops.findState({ name: this.choicelet.model, version: version }).then((obj) => this.processSessions(obj));
    }

    processSessions(obj) {
        const slist = $('#sessionlist');
        const table1 = $('#table1');
        if (obj.status > 0) {
            this.sessions = obj.state;
            slist.find('h5').text(`${obj.status} Sessions for ${this.choiceletName} Version ${this.choicelet.version}`);
            if ($.fn.DataTable.isDataTable('#table1')) {
                table1.DataTable().destroy();
            }
            const tbody = slist.find('tbody').empty();
            obj.state.forEach((session, i) => {
                let tr = `<tr data-index="${i}">`;
                tr += `<td>${i+1}</td>`;
                tr += `<td>${session.id}</td>`;
                tr += `<td class="mdl-data-table__cell--non-numeric">${session.groupname}</td>`;
                tr += `<td class="mdl-data-table__cell--non-numeric">${session.username} [${session.userid}]</td>`;
                tr += `<td class="mdl-data-table__cell--non-numeric">${new Date(session.start).toLocaleString()}</td>`;
                tr += `<td class="mdl-data-table__cell--non-numeric">${Playback.formatDuration(session.duration)}</td>`;
                tr += `<td class="mdl-data-table__cell--non-numeric">${session.closed}</td>`;
                tr += '</tr>';
                tbody.append(tr)
            });
            componentHandler.upgradeElement(slist[0]);
            table1.dataTable({ responsive: true });
            Playback.setStatus();
            slist.removeClass('hidden');
            slist.off('.pb').on('click.pb', (e) => {
                const row = $(e.target).closest('tr');
                if (row.length > 0) {
                    const index = Number(row.data('index'));
                    if (index >= 0) {
                        this.startPlayback(this.sessions[index]);
                    }
                }
            });
        }
        else if (obj.status === 0) {
            Playback.setStatus();
            slist.removeClass('hidden');
            slist.find('h5').text(`No Sessions for ${this.choiceletName} Version ${this.choicelet.version}`);
        }
        else {
            Playback.setStatus();
            slist.removeClass('hidden');
            slist.find('h5').text(`Error: ${obj.msg}`);
        }
    }

    startPlayback(session) {
        console.log(`Requested playback for state id ${session.id}`);
        this.session = session;
        this.fswinlib.listen(PbControlRecvPort);
        this.fswinlib.receive(PbControlRecvPort).then((msg) => this.sendControllerArguments(msg));
        this.ctlWindow = window.open(
            ChoiceSession.instance().getContextRoot(`/fsdesktop/pbcontrol.html?master=${window.name}`),
            `pcontrol-${this.session.id}`, 'width=600,height=130,modal=false');
        this.fswinlib.ifmessage.registerUnmanagedWindow(this.ctlWindow);
        // let url = ChoiceSession.instance().getContextRoot(this.choicelet.url);
        // if (this.choicelet.newlogging) {
        //     url += `?with=fschoice/PlaybackIf&state=${session.id}`;
        // }
        // else {
        //     url += '?mode=playback';
        // }
        // console.log(`${this.choiceletName} playback URL is ${url}`);
        // this.fswinlib.createWindow(url, { closed: false });
    }

    sendControllerArguments(msg) {
        if (msg.srcWinName !== this.ctlWindow.name) {
            console.log('Ignoring spurious message: ', msg);
            this.fswinlib.receive(PbControlRecvPort).then((msg) => this.sendControllerArguments(msg));
            return;
        }
        if (msg.ready) {
            this.fswinlib.send(this.ctlWindow.name, PbControlSendPort, {
                status: 1,
                state: this.session,
                choicelet: this.choicelet
            }, PbControlRecvPort);
        }
    }

    static setStatus(msg, showProgress) {
        if (arguments.length === 0) {
            $('#status, #statusMsg').addClass('hidden');
            return;
        }
        $('#statusMsg').text(msg).removeClass('hidden');
        if (!showProgress) {
            $('#status').addClass('hidden');
        }
        else {
            $('#status').removeClass('hidden');
        }
    }
    static formatDuration(duration) {
        const hours = Math.floor(duration / (1000 * 60 * 60));
        duration -= hours * (1000 * 60 * 60);
        const minutes = Math.floor(duration / (1000 * 60));
        duration -= minutes * (1000 * 60);
        const seconds = Math.round(duration / 1000);
        duration -= seconds * 1000;
        const frac = duration / 1000;
        return `${hours}:${Playback.pad(minutes, 2)}:${Playback.pad(seconds, 2)}${frac.toFixed(1).slice(-2)}`;
    }

    static pad(n, w) {
        const an = Math.abs(n);
        const digitCount = (an === 0) ? 1 : 1 + Math.floor(Math.log(an) / Math.LN10);
        if (digitCount >= w) {
            return n;
        }
        const zeroString = Math.pow(10, w - digitCount).toString().substr(1);
        return n < 0 ? '-' + zeroString + an : zeroString + an;
    }

}

let _pbinstance = new Playback();

export default Playback;
