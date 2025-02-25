onmessage = function (e) {
    if (e.data == "computerPlay") this.postMessage(this.self.cpu());
}