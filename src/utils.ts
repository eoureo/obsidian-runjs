import { addIcon } from "obsidian";
import {
    ARROW_DOWN_A_Z_ICON,
    ARROW_DOWN_A_Z_ICON_SVG,
    ARROW_UP_Z_A_ICON,
    ARROW_UP_Z_A_ICON_SVG,
    CODE_TYPE_ALL_ICON,
    CODE_TYPE_ALL_ICON_SVG,
    JS_ICON_SVG,
    JS_ICON,
    JS_DARK_ICON_SVG,
    JS_DARK_ICON,
} from "./constants";

export function getTagInJSDocComments(sourceCode: string, tag: string): string {
    // {n: "name", t: "m"} | "name"

    // const sourceCode = `
    //   /**
    //    * @description 예시 JSDoc 주석입니다.
    //    * @tag_string string
    //    */
    //
    //   function myFunction() {
    //     // ...
    //   }

    // 주어진 소스 코드에서 JSDoc 주석을 추출하는 로직
    const regex = /\/\*\*([\s\S]*?)\*\//g;
    const matches = sourceCode.match(regex);

    // 주석을 파싱하여 객체 형태로 반환
    const match = matches
        ?.join("\n")
        .match(new RegExp("^\\s*\\*\\s*@" + tag + "\\s+(.*)$", "m"));
    return match ? match[1] : "";
}

export function addIcons() {
    addIcon(JS_ICON, JS_ICON_SVG);
    addIcon(JS_DARK_ICON, JS_DARK_ICON_SVG);

    addIcon(ARROW_DOWN_A_Z_ICON, ARROW_DOWN_A_Z_ICON_SVG);
    addIcon(ARROW_UP_Z_A_ICON, ARROW_UP_Z_A_ICON_SVG);

    addIcon(CODE_TYPE_ALL_ICON, CODE_TYPE_ALL_ICON_SVG);

    addIcon(
        "sp",
        `<g stroke="currentColor" style="stroke-width:2" transform="translate(6,6), scale(4), rotate(180)"><rect fill="white" x="0" y="0" width="100%" height="100%" /><polygon stroke="black" fill="black" points="0,0 24,0 0,24" /></g>`
    );
}

export function getDirname(filePath: string): string {
    // 마지막 경로 구분자를 찾습니다.
    var lastSeparatorIndex = filePath.lastIndexOf('/');

    // 경로 구분자 이후의 문자열을 제거하여 디렉토리 경로를 얻습니다.
    var dirname = filePath.substring(0, lastSeparatorIndex);

    return dirname;
}

export function joinPath(folder: string, filePath: string): string {
    if (filePath.startsWith("/")) folder = "/";

    // 폴더 경로와 파일 경로를 연결합니다.
    var fullPath = folder + "/" + filePath;

    // 경로 구분자를 단일 슬래시('/')로 통일합니다.
    fullPath = fullPath.replace(/\/+/g, '/');

    // 상대 경로를 해석합니다.
    var parts = fullPath.split('/');
    var resolvedParts = [];

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];

        if (i != 0 && part === '.') {
            // 현재 디렉토리를 무시합니다.
            continue;
        } else if (part === '..') {
            // 상위 디렉토리로 이동합니다.
            if (resolvedParts.length == 0 || resolvedParts[resolvedParts.length -1] === "..") resolvedParts.push(part)
            else if (resolvedParts[resolvedParts.length -1] === ".") {
                resolvedParts.pop();
                resolvedParts.push(part);
            } else resolvedParts.pop();
        } else {
            // 디렉토리 이름을 추가합니다.
            resolvedParts.push(part);
        }
    }

    // 최종 경로를 반환합니다.
    var resolvedPath = resolvedParts.join('/');

    // 상대 경로에서 앞에 붙은 "./"을 제거합니다.
    // resolvedPath = resolvedPath.replace(/^\.\//, '');

    return resolvedPath;
}
