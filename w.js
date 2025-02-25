onmessage = function (e) {
    if (e.data == "computerPlay") this.postMessage(self.cpu());
}