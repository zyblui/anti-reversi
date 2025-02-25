onmessage=function(e){
    if(e.data=="computerPlay") this.postMessage(cpu());
}