import { Client, factory } from "@lumeweb/libkernel-universal";
import { MODULE } from "@lumeweb/kernel-swarm-client";
import defer from "p-defer";
import b4a from "b4a";
export default class Protomux {
    isProtomux = true;
    constructor(stream) {
        this._stream = stream;
        if (!stream.userData) {
            stream.userData = this;
        }
    }
    _stream;
    get stream() {
        return this._stream;
    }
    static from(stream) {
        if (stream.userData && stream.userData.isProtomux)
            return stream.userData;
        if (stream.isProtomux)
            return stream;
        return new this(stream);
    }
    async createChannel({ protocol, id = null, handshake = null, onopen = undefined, onclose = undefined, ondestroy = undefined, }) {
        return createChannel(this, protocol, id, handshake, onopen, onclose, ondestroy);
    }
}
class Channel extends Client {
    protocol;
    id;
    handshake;
    onopen;
    onclose;
    ondestroy;
    _created = defer();
    _send;
    _queue = [];
    _inited = false;
    constructor(mux, protocol, id, handshake, onopen, onclose, ondestroy) {
        super();
        this._mux = mux;
        this.protocol = protocol;
        this.id = id;
        this.handshake = handshake;
        this.onopen = onopen;
        this.onclose = onclose;
        this.ondestroy = ondestroy;
    }
    _ready = defer();
    get ready() {
        return this._ready.promise;
    }
    _mux;
    get mux() {
        return this._mux;
    }
    _channelId = -1;
    get channelId() {
        return this._channelId;
    }
    async open() {
        await this.init();
        await this._created;
        while (this._queue.length) {
            await this._queue.shift()?.init();
        }
        this._ready.resolve();
    }
    addMessage({ encoding = undefined, onmessage, }) {
        return createMessage({ channel: this, encoding, onmessage });
    }
    async queueMessage(message) {
        this._queue.push(message);
    }
    async init() {
        if (this._inited) {
            return;
        }
        this._inited = true;
        const [update, ret] = this.connectModule("createProtomuxChannel", {
            id: this._mux.stream.id,
            data: {
                protocol: this.protocol,
                id: this.id,
                handshake: this.handshake,
                onopen: !!this.onopen,
                onclose: !!this.onclose,
                ondestroy: !!this.ondestroy,
            },
        }, (data) => {
            switch (data.action) {
                case "onopen":
                    this.onopen?.(...data.args);
                    break;
                case "onclose":
                    this.onclose?.(...data.args);
                    break;
                case "ondestroy":
                    this.ondestroy?.(...data.args);
                    break;
                default:
                    this._channelId = data;
                    this._created.resolve();
            }
        });
        this._send = update;
        ret.catch((e) => this._created.reject(e));
        return this._created.promise;
    }
    destroy(error) {
        this._send?.({ action: "destroy", args: [error] });
    }
}
class Message extends Client {
    encoding;
    onmessage;
    channel;
    _send;
    constructor({ channel, encoding = undefined, onmessage = () => { }, }) {
        super();
        this.channel = channel;
        this.encoding = encoding;
        this.onmessage = onmessage;
        this.channel.queueMessage(this);
    }
    async init() {
        const created = defer();
        await this.loadLibs(MODULE);
        const [update] = this.connectModule("createProtomuxMessage", {
            id: this.channel.mux.stream.id,
            channelId: this.channel.channelId,
            data: {
                encoding: !!this.encoding,
                onmessage: !!this.onmessage,
            },
        }, async (data) => {
            if (data?.args && data?.args[0] instanceof Uint8Array) {
                data.args[0] = b4a.from(data.args[0]);
            }
            switch (data.action) {
                case "encode":
                    update({
                        action: "encode",
                        args: [await this.encoding.encode?.(...data.args), data.args[0]],
                    });
                    break;
                case "decode":
                    update({
                        action: "decode",
                        args: [await this.encoding.decode?.(...data.args), data.args[0]],
                    });
                    break;
                case "preencode":
                    update({
                        action: "preencode",
                        args: [
                            await this.encoding.preencode?.(...data.args),
                            data.args[0],
                        ],
                    });
                    break;
                case "onmessage":
                    this.onmessage?.(...data.args);
                    break;
                case "created":
                    created.resolve();
                    break;
            }
        });
        this._send = update;
        return created.promise;
    }
    send(data) {
        this._send?.({ action: "send", args: [data] });
    }
}
const createChannel = factory(Channel, MODULE);
const createMessage = factory(Message, MODULE);
