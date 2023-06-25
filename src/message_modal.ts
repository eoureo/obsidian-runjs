import { App, ButtonComponent, Modal } from "obsidian";

type ConfirmCallback = (confirmed: boolean) => void;

export class MessageModal extends Modal {
    title: string | null;
    message: string;
    callback: ConfirmCallback;

    constructor(app: App, title: string | null, message: string, callback?: ConfirmCallback) {
        super(app);
        this.message = message;
        this.title = title;
        this.message = message;
        if(callback) this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;

        this.containerEl.addClass("runjs-message-modal");

        if (this.title) this.titleEl.setText(this.title);

        contentEl.setText(this.message);

        const buttonDiv = contentEl.createDiv({cls: "modal-button-container"});

        new ButtonComponent(buttonDiv).setButtonText("OK")
            .setCta()
            .onClick(() => {
                if(this.callback) this.callback(true);
                this.close();
            });
    }

    onClose() {
        if(this.callback) this.callback(true);

        this.contentEl.empty();
    }
}

export async function openMessageModal(app: App, title: string | null, message: string, callback?: ConfirmCallback) {
    let return_value;

    const promise = new Promise((resolve, reject) => {
        new MessageModal(
            app,
            title,
            message,
            callback ?? ((confirmed: boolean) => {
                resolve(confirmed);
            })
        ).open();
    });

    await promise.then(value => { return_value = value; });
    return return_value;
}
