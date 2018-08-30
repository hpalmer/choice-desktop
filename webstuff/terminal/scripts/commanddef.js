export default class CommandDef {
    constructor(command, help, argdefs, func) {
        this.command = command;
        this.help = help;
        this.argdefs = argdefs;
        this.func = func;
    }
}
