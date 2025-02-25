importScripts("func.js");
onmessage = function (e) {
    if (e.data == "computerPlay") postMessage(cpu());
}