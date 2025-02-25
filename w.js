onmessage=function(e){
    if(e.data=="computerPlay") this.postMessage(cpu());
}
function cpu() {
    let result = /*initSearchAlpha(board, searchDepth, playerColor)*/initSearchSort(board, searchDepth, playerColor);
    console.log(result)
    let biggestValue = Math.max(...result.map((x) => x.evaluation))
    for (let r of result) {
        if (r.evaluation == biggestValue) {
            for (let i = 0; i <= 7; i++) {
                for (let j = 0; j <= 7; j++) {
                    if (board[i][j] == 0 && r.board[i][j] != 0) {
                        /*pd(LETTERS[j] + (i + 1));
                        return;*/
                        return LETTERS[j] + (i + 1);
                    }
                }
            }
        }
    }
}