import { App, Modal, ButtonComponent } from "obsidian";

type ConfirmCallback = (confirmed: boolean) => void;

export class ConfirmModal extends Modal {
    title: string | null;
    message: string;
    callback: ConfirmCallback;

    constructor(app: App, title: string | null, message: string, callback: ConfirmCallback) {
        super(app);
        this.title = title;
        this.message = message;
        this.callback = callback;
    }

    onOpen() {
        this.containerEl.addClass("runjs-confirm-modal");
        
        const { contentEl } = this;

        contentEl.empty();

        if (this.title) this.titleEl.setText(this.title);

        contentEl.createEl("p").setText(this.message);
        
        const buttonDiv = contentEl.createDiv({cls: "modal-button-container"});

        new ButtonComponent(buttonDiv)
            .setButtonText("Yes")
            .setCta()
            .onClick(() => {
                this.callback(true);
                this.close();
            })
            .setCta();

        new ButtonComponent(buttonDiv).setButtonText("No").onClick(() => {
            this.callback(false);
            this.close();
        });
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export async function openConfirmModal (app: App, title: string | null, message: string, callback?: ConfirmCallback) {
    return await new Promise((resolve, reject) => {
        new ConfirmModal(
            app,
            title,
            message,
            callback ?? ((confirmed: boolean) => {
                resolve(confirmed);
            })
        ).open();
    });
}

export class ConfirmDeleteModal extends Modal {
    title: string | null;
    message: string;
    callback: ConfirmCallback;

    constructor(app: App, title: string | null, message: string, callback: ConfirmCallback) {
        super(app);
        this.title = title;
        this.message = message;
        this.callback = callback;
    }

    onOpen() {
        this.containerEl.addClass("runjs-confirm-modal");

        const { contentEl } = this;

        contentEl.empty();

        if (this.title) this.titleEl.setText(this.title);

        contentEl.createEl("p").setText(this.message);
        
        const containerEl = contentEl.parentElement;

        if (containerEl) {
            const buttonDiv = containerEl.createDiv({cls: "modal-button-container"});

            new ButtonComponent(buttonDiv)
                .setButtonText("Delete")
                .setClass("mod-warning")
                .onClick(() => {
                    this.callback(true);
                    this.close();
                })
                .setCta();

            new ButtonComponent(buttonDiv).setButtonText("Cancel").onClick(() => {
                this.callback(false);
                this.close();
            });
        }
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export function openConfirmDeleteModal (app: App, title: string, message: string, callback: ConfirmCallback) {
    new ConfirmDeleteModal(
        app,
        title,
        message,
        callback
    ).open();
}
