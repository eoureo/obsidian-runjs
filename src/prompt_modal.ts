import { App, Modal, ButtonComponent, TextComponent } from "obsidian";

type PromptCallback = (text: string | null) => void;

export class PromptModal extends Modal {
    title: string | null;
    message: string;
    messagDefault: string;
    placeholder: string;
    callback: PromptCallback;
    textComponent: TextComponent;

    constructor(
        app: App,
        title: string | null,
        message: string,
        messagDefault: string = "",
        placeholder: string = "",
        callback: PromptCallback
    ) {
        super(app);
        this.title = title;
        this.message = message;
        this.messagDefault = messagDefault;
        this.placeholder = placeholder;
        this.callback = callback;
    }

    onOpen() {
        let { contentEl } = this;

        this.containerEl.addClass("runjs-prompt-modal");

        contentEl.empty();

        if (this.title) this.titleEl.setText(this.title);

        contentEl.createEl("p").setText(this.message);

        this.textComponent = new TextComponent(contentEl)
            .setValue(this.messagDefault)
            .setPlaceholder(this.placeholder)
            .then((cb) => {
                cb.inputEl.addClass("prompt-input");
            });

        const buttonDiv = contentEl.createDiv({
            cls: "modal-button-container",
        });

        new ButtonComponent(buttonDiv)
            .setButtonText("OK")
            .setCta()
            .onClick(() => {
                this.callback(this.textComponent.getValue());
                this.close();
            })
            .setCta();

        new ButtonComponent(buttonDiv).setButtonText("Cancel").onClick(() => {
            this.callback(null);
            this.close();
        });
    }

    onClose() {
        this.callback(null);
        let { contentEl } = this;
        contentEl.empty();
    }
}

export async function openPromptModal(
    app: App,
    title: string | null,
    message: string,
    messagDefault: string = "",
    placeholder: string = "",
    callback?: PromptCallback
) {
    let return_value;

    const promise = new Promise((resolve, reject) => {
        new PromptModal(
            app,
            title,
            message,
            messagDefault,
            placeholder,
            callback ??
                ((text: string | null) => {
                    resolve(text);
                })
        ).open();
    });

    await promise.then((value) => {
        return_value = value;
    });
    return return_value;
}
