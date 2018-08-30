/** @global zebkit */

export default class Dialog {

    constructor(props, panel) {
        this.props = props;
        this.root = panel;
        this.dialogWindow = undefined;
        this.build();
    }

    build() {
        zebkit.require('ui', 'layout', (ui, layout) => {
            const popupPanel = new ui.Panel(new layout.BorderLayout(6));
            const boldFont = new zebkit.Font('Arial', 'bold', 16);
            let top;
            if (typeof this.props.header === 'string') {
                top = new zebkit.ui.Label(this.props.header).setPadding(20, 10, 10, 10).setFont(boldFont)
            }
            else if (zebkit.instanceOf(this.props.header, ui.Panel.clazz)) {
                top = this.props.header;
            }
            if (top) {
                popupPanel.add('top', top);
            }
            let center;
            if (typeof this.props.body === 'string') {
                center = new ui.Panel(new layout.FlowLayout('center', 'top', 'vertical', 8));
                center.add(new ui.Label(this.props.body).setPadding(5, 20, 10, 20));
            }
            else if (zebkit.instanceOf(this.props.body, ui.Panel.clazz)) {
                center = this.props.body;
            }
            if (center) {
                popupPanel.add('center', center);
            }
            const rightButtons = new ui.Panel(new layout.FlowLayout('right', 'center', 'horizontal', 10));
            rightButtons.setRightPadding(20);
            const buttonList = this.props.buttons || [
                { content: 'Cancel', handler: () => this.cancelButton() },
                { content: 'Ok', handler: () => this.okButton() }
            ];
            for (const button of buttonList) {
                const uiButton = new ui.Button(button.content);
                uiButton.on(button.handler);
                rightButtons.add(uiButton);
            }
            popupPanel.add('bottom', rightButtons);
            const myWindow = new ui.Window(this.props.title || 'Notice', popupPanel);
            const winsize = myWindow.getPreferredSize();
            myWindow.setSize(winsize.width, winsize.height);
            ui.makeFullyVisible(this.root, myWindow);
            ui.showModalWindow(this.root, myWindow);
            this.dialogWindow = myWindow;
        });
    }

    okButton() {
        this.close();
    }

    cancelButton() {
        this.close();
    }

    close() {
        if (this.dialogWindow) {
            this.dialogWindow.close();
        }
    }
}
