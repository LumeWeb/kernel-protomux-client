import { Client } from "@lumeweb/libkernel-universal";
export default class Protomux {
    private isProtomux;
    constructor(stream: any);
    private _stream;
    get stream(): any;
    static from(stream: any): any;
    createChannel({ protocol, id, handshake, onopen, onclose, ondestroy, }: {
        protocol: string;
        id: any;
        handshake: any;
        onopen?: Function;
        onclose?: Function;
        ondestroy?: Function;
    }): Promise<Channel>;
}
declare class Channel extends Client {
    private protocol;
    private id;
    private handshake;
    private onopen?;
    private onclose?;
    private ondestroy?;
    private _created;
    private _send?;
    private _queue;
    private _inited;
    constructor(mux: Protomux, protocol: string, id: any, handshake: any, onopen?: Function, onclose?: Function, ondestroy?: Function);
    private _ready;
    get ready(): Promise<void>;
    private _mux;
    get mux(): Protomux;
    private _channelId;
    get channelId(): number;
    open(): Promise<void>;
    addMessage({ encoding, onmessage, }: {
        encoding?: any;
        onmessage: Function;
    }): Message;
    queueMessage(message: Message): Promise<void>;
    private init;
    destroy(error: Error): void;
}
declare class Message extends Client {
    private encoding;
    private onmessage;
    private channel;
    private _send?;
    constructor({ channel, encoding, onmessage, }: {
        channel: Channel;
        encoding?: any;
        onmessage: Function;
    });
    init(): Promise<void>;
    send(data: any): void;
}
export {};
