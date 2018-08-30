export default class CommandArg {
    /**
     *
     * @param name
     * @param parser
     * @param noise
     * @param options
     * @constructor
     */
    constructor(name, parser, noise, options) {
        this.name = name;
        this.parser = parser;
        this.noise = noise;
        this.options = [];
        for (let i = 3; i < arguments.length; ++i) this.options[this.options.length] = arguments[i];
    }

    isFile() {
        return this.options.indexOf('file') >= 0;
    }

    isContainer() {
        return this.options.indexOf('container') >= 0;
    }

    isOptional() {
        return this.options.indexOf('optional') >= 0;
    }
}
